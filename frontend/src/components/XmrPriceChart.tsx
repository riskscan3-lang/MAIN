// @ts-nocheck
import { useEffect, useRef } from "react";
import { Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Renders TradingView's Advanced Real-Time Chart Widget for BITFINEX:XMRUSD.
// Uses TradingView's official embed.js which mounts a fully-featured chart
// (candlesticks, indicators, drawings) into the container below.
export function XmrPriceChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean any prior embed (e.g., HMR re-mount)
    containerRef.current.innerHTML = "";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "calc(100% - 32px)";
    inner.style.width = "100%";
    containerRef.current.appendChild(inner);

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";
    copyright.innerHTML = `
      <a href="https://in.tradingview.com/chart/?symbol=CRYPTO%3AXMRUSD" rel="noopener nofollow" target="_blank">
        <span class="text-slate-500 hover:text-orange-400 text-[11px]">XMR/USD chart by TradingView</span>
      </a>`;
    containerRef.current.appendChild(copyright);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: false,
      calendar: false,
      details: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "60",
      locale: "en",
      save_image: true,
      style: "1",                // candles
      symbol: "CRYPTO:XMRUSD",
      theme: "dark",
      timezone: "Etc/UTC",
      backgroundColor: "#0f172a",
      gridColor: "rgba(30, 41, 59, 0.8)",
      watchlist: [],
      withdateranges: true,
      compareSymbols: [],
      studies: [],
      autosize: true,
      support_host: "https://www.tradingview.com",
    });
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, []);

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden" data-testid="xmr-price-chart">
      <CardHeader className="border-b border-slate-800/60 flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          XMR / USD · Live
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            TradingView · CRYPTO:XMRUSD
          </span>
        </CardTitle>
        <a
          href="https://in.tradingview.com/chart/?symbol=CRYPTO%3AXMRUSD"
          target="_blank"
          rel="noreferrer"
          data-testid="xmr-tv-link"
          className="text-xs text-slate-400 hover:text-orange-400 inline-flex items-center gap-1"
        >
          Open in TradingView <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full"
          style={{ height: "620px" }}
          data-testid="xmr-chart-area"
        />
      </CardContent>
    </Card>
  );
}
