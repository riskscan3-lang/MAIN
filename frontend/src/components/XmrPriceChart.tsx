// @ts-nocheck
import { Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// TradingView Advanced Chart widget via official iframe embed (no cross-origin script).
// This avoids the "Script error." overlay seen with the JS-injection variant in dev.
const TV_PARAMS = new URLSearchParams({
  symbol: "CRYPTO:XMRUSD",
  interval: "60",                 // 1h
  hidesidetoolbar: "0",
  hidetoptoolbar: "0",
  hide_legend: "0",
  theme: "dark",
  style: "1",                     // Candles
  timezone: "Etc/UTC",
  withdateranges: "1",
  studies: "[]",
  locale: "en",
  utm_source: "monerorig",
  utm_medium: "widget",
  utm_campaign: "chart",
});

const TV_SRC = `https://s.tradingview.com/widgetembed/?${TV_PARAMS.toString()}`;

export function XmrPriceChart() {
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
        <iframe
          title="XMR/USD live chart"
          src={TV_SRC}
          data-testid="xmr-chart-area"
          className="w-full block"
          style={{ height: "1000px", border: 0 }}
          loading="lazy"
          allow="fullscreen"
        />
      </CardContent>
    </Card>
  );
}
