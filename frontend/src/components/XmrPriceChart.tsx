// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const RANGES = [
  { id: "1", label: "24H", days: "1" },
  { id: "7", label: "7D", days: "7" },
  { id: "30", label: "30D", days: "30" },
  { id: "90", label: "90D", days: "90" },
];

const formatTime = (ts, days) => {
  const d = new Date(ts);
  if (days === "1") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const fmtUsd = (n) => {
  if (n == null) return "—";
  if (n >= 1000) return `$${n.toFixed(0)}`;
  if (n >= 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
};

export function XmrPriceChart() {
  const [range, setRange] = useState("1");
  const [points, setPoints] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = async (days) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/xmr/chart?days=${days}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const series = (data.prices || []).map(([t, p]) => ({ t, p }));
      setPoints(series);
      setSource(data.source || "");
      setLastUpdated(new Date());
    } catch (e) {
      setError("Failed to load price data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices(range);
    // Auto-refresh every 60s for the 24H view
    if (range === "1") {
      const i = setInterval(() => fetchPrices(range), 60000);
      return () => clearInterval(i);
    }
  }, [range]);

  const stats = useMemo(() => {
    if (!points.length) return { current: null, change: 0, changePct: 0, high: null, low: null };
    const first = points[0].p;
    const current = points[points.length - 1].p;
    const change = current - first;
    const changePct = (change / first) * 100;
    const prices = points.map((p) => p.p);
    return {
      current,
      change,
      changePct,
      high: Math.max(...prices),
      low: Math.min(...prices),
    };
  }, [points]);

  const isUp = stats.change >= 0;

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden" data-testid="xmr-price-chart">
      <CardHeader className="border-b border-slate-800/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              XMR / USD
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
                  className={`inline-flex items-center gap-1 text-sm font-semibold pb-1 ${
                    isUp ? "text-green-400" : "text-red-400"
                  }`}
                  data-testid="xmr-change-pct"
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
              onClick={() => fetchPrices(range)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          {stats.high != null && (
            <span>High: <span className="text-slate-300 font-medium">{fmtUsd(stats.high)}</span></span>
          )}
          {stats.low != null && (
            <span>Low: <span className="text-slate-300 font-medium">{fmtUsd(stats.low)}</span></span>
          )}
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="h-72 w-full" data-testid="xmr-chart-area">
          {error ? (
            <div className="h-full flex items-center justify-center text-sm text-red-400">{error}</div>
          ) : loading && !points.length ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading XMR price…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="xmrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => formatTime(t, range)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#1e293b" }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(v) => [fmtUsd(v), "XMR"]}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke="#fb923c"
                  strokeWidth={2}
                  fill="url(#xmrGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
