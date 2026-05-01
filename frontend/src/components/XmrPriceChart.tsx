// @ts-nocheck
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const RANGES = [
  { id: 1, label: "24H" },
  { id: 7, label: "7D" },
  { id: 30, label: "30D" },
  { id: 90, label: "90D" },
];

const UP = "#22c55e";
const DOWN = "#ef4444";
const GRID = "#1e293b";
const AXIS = "#64748b";

const fmtUsd = (n) => {
  if (n == null) return "—";
  if (n >= 1000) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
};

const formatTime = (ts, days) => {
  const d = new Date(ts);
  if (days === 1) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

function Candlestick({ candles, days }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 288 });
  const [hover, setHover] = useState(null); // { x, y, idx }

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: Math.max(320, cr.width), h: Math.max(220, cr.height) });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 10, right: 10, bottom: 26, left: 56 };
  const plotW = Math.max(10, size.w - padding.left - padding.right);
  const plotH = Math.max(10, size.h - padding.top - padding.bottom);

  const { minP, maxP, scaleY, scaleX, candleW } = useMemo(() => {
    if (!candles.length) {
      return { minP: 0, maxP: 1, scaleY: () => 0, scaleX: () => 0, candleW: 4 };
    }
    const hi = Math.max(...candles.map((c) => c.high));
    const lo = Math.min(...candles.map((c) => c.low));
    const pad = (hi - lo) * 0.08 || 1;
    const minP = lo - pad;
    const maxP = hi + pad;
    const scaleY = (p) => padding.top + ((maxP - p) / (maxP - minP)) * plotH;
    const slotW = plotW / candles.length;
    const candleW = Math.max(2, Math.min(14, slotW * 0.65));
    const scaleX = (i) => padding.left + slotW * i + slotW / 2;
    return { minP, maxP, scaleY, scaleX, candleW };
  }, [candles, plotW, plotH]);

  // Y gridlines: 5 evenly-spaced values
  const yTicks = useMemo(() => {
    const ticks = [];
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const v = minP + ((maxP - minP) * i) / n;
      ticks.push(v);
    }
    return ticks;
  }, [minP, maxP]);

  // X ticks: ~6 spaced out labels
  const xTickIdx = useMemo(() => {
    if (!candles.length) return [];
    const n = 6;
    const step = Math.max(1, Math.floor(candles.length / n));
    const arr = [];
    for (let i = 0; i < candles.length; i += step) arr.push(i);
    if (arr[arr.length - 1] !== candles.length - 1) arr.push(candles.length - 1);
    return arr;
  }, [candles]);

  const handleMove = (e) => {
    if (!candles.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = x - padding.left;
    if (relX < 0 || relX > plotW) {
      setHover(null);
      return;
    }
    const slotW = plotW / candles.length;
    const idx = Math.min(candles.length - 1, Math.max(0, Math.floor(relX / slotW)));
    setHover({ x, y: e.clientY - rect.top, idx });
  };

  const handleLeave = () => setHover(null);

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <svg
        width={size.w}
        height={size.h}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="block"
      >
        {/* Horizontal gridlines + Y labels */}
        {yTicks.map((v, i) => {
          const y = scaleY(v);
          return (
            <g key={i}>
              <line x1={padding.left} x2={size.w - padding.right} y1={y} y2={y} stroke={GRID} strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 3} fontSize={11} fill={AXIS} textAnchor="end">
                {`$${v.toFixed(v >= 1000 ? 0 : 2)}`}
              </text>
            </g>
          );
        })}

        {/* X tick labels */}
        {xTickIdx.map((i) => {
          const c = candles[i];
          if (!c) return null;
          return (
            <text
              key={`xt-${i}`}
              x={scaleX(i)}
              y={size.h - padding.bottom + 16}
              fontSize={11}
              fill={AXIS}
              textAnchor="middle"
            >
              {formatTime(c.t, days)}
            </text>
          );
        })}

        {/* Candles */}
        {candles.map((c, i) => {
          const color = c.close >= c.open ? UP : DOWN;
          const cx = scaleX(i);
          const yHi = scaleY(c.high);
          const yLo = scaleY(c.low);
          const yOpen = scaleY(c.open);
          const yClose = scaleY(c.close);
          const bodyY = Math.min(yOpen, yClose);
          const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
          return (
            <g key={i}>
              {/* Wick */}
              <line x1={cx} x2={cx} y1={yHi} y2={yLo} stroke={color} strokeWidth={1} />
              {/* Body */}
              <rect
                x={cx - candleW / 2}
                y={bodyY}
                width={candleW}
                height={bodyH}
                fill={color}
                rx={1}
              />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hover && candles[hover.idx] && (
          <g pointerEvents="none">
            <line
              x1={scaleX(hover.idx)}
              x2={scaleX(hover.idx)}
              y1={padding.top}
              y2={padding.top + plotH}
              stroke="#334155"
              strokeDasharray="3 3"
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hover && candles[hover.idx] && (
        <div
          className="absolute pointer-events-none bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs shadow-xl"
          style={{
            left: Math.min(size.w - 190, Math.max(8, hover.x + 12)),
            top: Math.min(size.h - 110, Math.max(8, hover.y + 12)),
            minWidth: 170,
          }}
        >
          <div className="text-slate-400 mb-1">
            {new Date(candles[hover.idx].t).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <span className="text-slate-500">Open</span>
            <span className="text-white">{fmtUsd(candles[hover.idx].open)}</span>
            <span className="text-slate-500">High</span>
            <span className="text-green-400">{fmtUsd(candles[hover.idx].high)}</span>
            <span className="text-slate-500">Low</span>
            <span className="text-red-400">{fmtUsd(candles[hover.idx].low)}</span>
            <span className="text-slate-500">Close</span>
            <span
              className={
                candles[hover.idx].close >= candles[hover.idx].open
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {fmtUsd(candles[hover.idx].close)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function XmrPriceChart() {
  const [range, setRange] = useState(1);
  const [candles, setCandles] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCandles = async (days) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/xmr/ohlc?days=${days}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mapped = (data.candles || []).map(([t, open, high, low, close]) => ({
        t, open, high, low, close,
      }));
      setCandles(mapped);
      setSource(data.source || "");
      setLastUpdated(new Date());
    } catch (e) {
      setError("Failed to load price data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles(range);
    if (range === 1) {
      const i = setInterval(() => fetchCandles(range), 60000);
      return () => clearInterval(i);
    }
  }, [range]);

  const stats = useMemo(() => {
    if (!candles.length) return { current: null, change: 0, changePct: 0, high: null, low: null };
    const first = candles[0].open;
    const current = candles[candles.length - 1].close;
    const change = current - first;
    const changePct = (change / first) * 100;
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    return { current, change, changePct, high, low };
  }, [candles]);

  const isUp = stats.change >= 0;

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden" data-testid="xmr-price-chart">
      <CardHeader className="border-b border-slate-800/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              XMR / USD · Candles
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                {source === "fallback" ? "demo · simulated" : "CoinGecko · live"}
              </span>
            </CardTitle>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-3xl font-bold tabular-nums" data-testid="xmr-current-price">
                {stats.current != null ? fmtUsd(stats.current) : "—"}
              </span>
              {stats.current != null && (
                <span
                  data-testid="xmr-change-pct"
                  className={`inline-flex items-center gap-1 text-sm font-semibold pb-1 ${isUp ? "text-green-400" : "text-red-400"}`}
                >
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isUp ? "+" : ""}{stats.changePct.toFixed(2)}%
                  <span className="text-slate-500 font-normal">({isUp ? "+" : ""}${stats.change.toFixed(2)})</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                data-testid={`xmr-range-${r.id}`}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  range === r.id
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "bg-slate-800/60 text-slate-400 hover:text-white border border-transparent"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              data-testid="xmr-refresh"
              onClick={() => fetchCandles(range)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          {stats.high != null && <span>High: <span className="text-slate-300 font-medium">{fmtUsd(stats.high)}</span></span>}
          {stats.low != null && <span>Low: <span className="text-slate-300 font-medium">{fmtUsd(stats.low)}</span></span>}
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-72 w-full" data-testid="xmr-chart-area">
          {error ? (
            <div className="h-full flex items-center justify-center text-sm text-red-400">{error}</div>
          ) : loading && !candles.length ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading XMR price…</div>
          ) : (
            <Candlestick candles={candles} days={range} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
