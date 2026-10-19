"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart, CrosshairMode, LineStyle } from "lightweight-charts";
import { hoverLabel, tickFormatter } from "./chartConfig";

const COLORS = {
  bronze: { line: "#c9a36a", top: "rgba(201, 163, 106, 0.22)", bottom: "rgba(201, 163, 106, 0)" },
  gain: { line: "#4fb59a", top: "rgba(79, 181, 154, 0.2)", bottom: "rgba(79, 181, 154, 0)" },
  loss: { line: "#e25c5c", top: "rgba(226, 92, 92, 0.2)", bottom: "rgba(226, 92, 92, 0)" },
};

// Area chart for a price or value series. `data` is [{ time (unix seconds), value }].
// `onHover` receives { time, value } while the crosshair is on the chart, and null when it leaves.
export default function PriceChart({
  data,
  intraday = true,
  color = "bronze",
  height = 320,
  reference,
  onHover,
  formatPrice,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const referenceLineRef = useRef(null);
  const hoverRef = useRef(onHover);
  const intradayRef = useRef(intraday);
  hoverRef.current = onHover;
  intradayRef.current = intraday;

  // Create the chart once
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9c9487",
        // Canvas can't resolve CSS variables, so use the page's computed font stack
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#2f2b26", style: LineStyle.Solid },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: tickFormatter,
      },
      localization: {
        timeFormatter: (time) => hoverLabel(time, intradayRef.current),
        priceFormatter: formatPrice || ((p) => p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#5a5248", width: 1, style: LineStyle.Solid, labelBackgroundColor: "#24211d" },
        horzLine: { color: "#5a5248", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#24211d" },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addAreaSeries({
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#12110f",
    });

    chart.subscribeCrosshairMove((param) => {
      if (!hoverRef.current) return;
      const point = param?.time ? param.seriesData.get(series) : null;
      hoverRef.current(point ? { time: param.time, value: point.value } : null);
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      referenceLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  useEffect(() => {
    const c = COLORS[color] || COLORS.bronze;
    seriesRef.current?.applyOptions({ lineColor: c.line, topColor: c.top, bottomColor: c.bottom });
  }, [color]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(data || []);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  // Dashed reference line, e.g. the previous close on a 1D chart
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (referenceLineRef.current) {
      series.removePriceLine(referenceLineRef.current);
      referenceLineRef.current = null;
    }
    if (Number.isFinite(reference)) {
      referenceLineRef.current = series.createPriceLine({
        price: reference,
        color: "#5a5248",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    }
  }, [reference, data]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
