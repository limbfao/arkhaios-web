const alpaca = require('../external/alpaca/api');
const assetIds = {};
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');

async function fetchYahoo(id) {
    const baseURL = 'https://query1.finance.yahoo.com';
    const path = '/v8/finance/chart/' + id;
    const query = '?region=US&lang=en-US&interval=2m&range=1d';
    const response = await fetch(baseURL + path + query);

    return response;
}

module.exports = {
    route: "/api/quote",
    authenticate: true,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');
        if(!req.query?.id) {
            res.status(400).json({status: RESPONSE_TYPE.FAILED, message: 'missing id'});
            return;
        }
        const symbol = String(req.query.id).toUpperCase();

        let quote = null;
        try {
            quote = await fetchYahoo(symbol);
        } catch(e) {
            quote = null;
        }
        if(quote?.status == 200) {
            const json = await quote.json();
            const meta = json?.chart?.result?.[0]?.meta || {};
            const price = meta.regularMarketPrice;
            const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;

            res.status(200).json({
                status: RESPONSE_TYPE.SUCCESS,
                data: {
                    symbol: symbol,
                    price: price,
                    previousClose: previousClose,
                    changePercent: previousClose ? price / previousClose - 1 : null
                }
            })

            return;
        } else {
            // Alpaca fallback:
            // From /asset API documentation regarding (lastPrice) data:
            // NOTE: This field is currently in this spec however it may not be
            // present in the production environment at time of publishing.
            // It will be coming in a future update at which point this spec should be updated.
            
            if(!(symbol in assetIds)) {
                // Retrieve asset ids that are not yet stored 
                const assets = await alpaca.get_assets();
                for(let i = 0; i < assets.length; ++i) {
                    const asset = assets[i].symbol.toUpperCase();
                    assetIds[assets[i].symbol] = assets[i].id;
                    if(asset == symbol) {
                        res.status(200).json({
                            status: RESPONSE_TYPE.SUCCESS,
                            data: {
                                symbol: asset,
                                price: assets[i].lastPrice
                            }
                        })

                        return;
                    }
                }
            } else {
                const id = assetIds[symbol];
                const asset = await alpaca.get_asset(id);
                if(asset?.lastPrice) {
                    res.status(200).json({
                        status: RESPONSE_TYPE.SUCCESS,
                        data: {
                            symbol: asset.symbol,
                            price: asset.lastPrice
                        }
                    })
                    
                    return;
                }
            }

            res.status(500).json({status: RESPONSE_TYPE.ERROR, message: 'symbol not found'});
        }
    }
}