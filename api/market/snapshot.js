const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');

// Price, daily change and an intraday sparkline for a list of symbols, so list
// views (markets overview, watchlist, peers) need one request instead of one per row.

const DEFAULT_SYMBOLS = [
    "SPY", "QQQ", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "NFLX", "AMD",
    "JPM", "V", "COST", "WMT", "KO", "DIS", "BA", "INTC", "NKE", "PEP",
    "BTC-USD", "ETH-USD", "SOL-USD",
];
const MAX_SYMBOLS = 30;
const CACHE_MS = 30 * 1000;
const cache = new Map(); // yahoo symbol -> { at, value }

// "btc-usd", "BTCUSD", "BTC/USD" -> "BTC-USD"; "BRK.B" -> "BRK-B"
function toYahooSymbol(symbol) {
    const s = String(symbol || "").trim().toUpperCase().replace("/", "-").replace(/\./g, "-");
    if (/^[A-Z]{2,6}USD$/.test(s) && !s.includes("-")) return s.replace(/USD$/, "-USD");
    return s;
}

function downsample(values, points = 40) {
    if (values.length <= points) return values;
    const step = (values.length - 1) / (points - 1);
    return Array.from({ length: points }, (_, i) => values[Math.round(i * step)]);
}

async function fetchSnapshot(symbol) {
    const hit = cache.get(symbol);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) +
        '?region=US&lang=en-US&interval=5m&range=1d&includePrePost=false');
    if (response.status != 200) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((v) => Number.isFinite(v));
    const price = result?.meta?.regularMarketPrice ?? closes[closes.length - 1];
    if (!Number.isFinite(price)) return null;

    const previousClose = result?.meta?.chartPreviousClose ?? result?.meta?.previousClose ?? closes[0];
    const value = {
        symbol,
        price,
        previousClose: Number.isFinite(previousClose) ? previousClose : null,
        change: Number.isFinite(previousClose) ? price - previousClose : null,
        changePercent: Number.isFinite(previousClose) && previousClose ? price / previousClose - 1 : null,
        sparkline: downsample(closes),
    };
    cache.set(symbol, { at: Date.now(), value });
    return value;
}

module.exports = {
    route: "/api/market/snapshot",
    authenticate: true,
    unverified: true,
    toYahooSymbol,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');

        const requested = req.query?.symbols
            ? String(req.query.symbols).split(",").map(toYahooSymbol).filter(Boolean)
            : DEFAULT_SYMBOLS;
        const symbols = [...new Set(requested)].slice(0, MAX_SYMBOLS);

        try {
            // Asset names and exchanges from the Assets collection ("BTC/USD" style for crypto)
            const names = {};
            try {
                await db.connect(async (db) => {
                    const assets = await db.collection('Assets').find({
                        symbol: { $in: symbols.flatMap((s) => [s, s.replace("-USD", "/USD"), s.replace("-", ".")]) },
                    }).toArray();
                    for (const asset of assets) {
                        names[toYahooSymbol(asset.symbol)] = { name: asset.name, exchange: asset.exchange };
                    }
                });
            } catch (e) {
                logger.log({ level: 'error', message: e });
            }

            const results = await Promise.all(symbols.map(async (symbol) => {
                try {
                    const snapshot = await fetchSnapshot(symbol);
                    if (!snapshot) return null;
                    const isCrypto = symbol.endsWith("-USD");
                    return {
                        ...snapshot,
                        name: names[symbol]?.name || symbol,
                        exchange: names[symbol]?.exchange || (isCrypto ? "CRYPTO" : ""),
                        assetClass: isCrypto ? "crypto" : "us_equity",
                    };
                } catch (e) {
                    logger.log({ level: 'error', message: e });
                    return null;
                }
            }));

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: results.filter(Boolean) });
        } catch (e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
