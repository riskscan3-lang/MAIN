// @ts-nocheck
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Cpu, Zap, Users, Activity } from "lucide-react";

const SEED_WORKERS = [
  { addr: "0x7a92f4eD3b81C5C7d4eA9e0F7c22A8d2B3F5C9a1", baseRate: 18500, region: "US-East",  rig: "Worker_01" },
  { addr: "0x9eD8c0e21b7F4A6d8F11d3E2F7A6e4B5C8d9e0F2", baseRate: 22300, region: "EU-West",  rig: "Worker_02" },
  { addr: "0x21cE4b8aF3D6E5c9B8A7D4e2F1c0B9a8E7d6C5b4", baseRate: 31000, region: "Asia",     rig: "Worker_03" },
  { addr: "0x8f02D7B5cE6A3F4B9c8d7E6F5A4b3C2d1E0f9A8b", baseRate: 27600, region: "EU-North", rig: "Worker_04" },
  { addr: "0xa37D4c1B9eF8A6D5C4e3B2A1f0E9D8c7B6a5F4e3", baseRate: 19800, region: "US-West",  rig: "Worker_05" },
  { addr: "0x1c99aE7B6F5D4c3B2A1f0E9d8C7b6A5e4D3c2B1a", baseRate: 14200, region: "LATAM",    rig: "Worker_06" },
  { addr: "0xfa008B7c6D5E4f3A2b1C0D9e8F7a6B5c4D3e2F1a", baseRate: 24400, region: "Asia",     rig: "Worker_07" },
];

const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WorkerPool() {
  const [tick, setTick] = useState(0);
  const [workers, setWorkers] = useState(() =>
    SEED_WORKERS.map((w) => ({
      ...w,
      hashrate: w.baseRate,
      shares: 1200 + Math.floor(Math.random() * 800),
      uptime: 98 + Math.random() * 1.99,
      online: Math.random() > 0.08, // 92% chance online initially
      lastShare: Math.floor(Math.random() * 12) + 1,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkers((prev) =>
        prev.map((w) => {
          // 1.5% chance to flip online state
          const flip = Math.random() < 0.015;
          const online = flip ? !w.online : w.online;
          // Hashrate jitters around base when online, drops to 0 when offline
          const variance = (Math.random() - 0.5) * w.baseRate * 0.06;
          const hashrate = online ? Math.max(0, Math.round(w.baseRate + variance)) : 0;
          // Online workers occasionally accept new shares
          const shareDelta = online && Math.random() < 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
          // Last share seconds-ago: reset on new share, else increment
          const lastShare = shareDelta > 0 ? 0 : Math.min(w.lastShare + 1, 600);
          // Uptime drifts very slightly
          const uptime = Math.min(99.99, Math.max(95, w.uptime + (online ? 0.001 : -0.02)));
          return {
            ...w,
            hashrate,
            shares: w.shares + shareDelta,
            online,
            lastShare,
            uptime,
          };
        })
      );
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totals = useMemo(() => {
    const totalHash = workers.reduce((acc, w) => acc + w.hashrate, 0);
    const totalShares = workers.reduce((acc, w) => acc + w.shares, 0);
    const onlineCount = workers.filter((w) => w.online).length;
    return { totalHash, totalShares, onlineCount };
  }, [workers]);

  const formatLastShare = (s) => {
    if (s <= 1) return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden" data-testid="worker-pool">
      <CardHeader className="border-b border-slate-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            Pool Workers
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              live · monerorig.pool
            </span>
          </CardTitle>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-slate-400">
                <span className="text-white font-semibold" data-testid="online-workers">{totals.onlineCount}</span>/{workers.length} online
              </span>
            </div>
            <div className="text-slate-400">
              Total: <span className="text-orange-400 font-semibold tabular-nums" data-testid="total-hashrate">
                {totals.totalHash.toLocaleString()} H/s
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Worker</th>
                <th className="text-left px-3 py-3 font-medium">Address</th>
                <th className="text-left px-3 py-3 font-medium">Region</th>
                <th className="text-right px-3 py-3 font-medium">Hashrate</th>
                <th className="text-right px-3 py-3 font-medium">Pool Share</th>
                <th className="text-right px-3 py-3 font-medium">Shares</th>
                <th className="text-right px-3 py-3 font-medium">Uptime</th>
                <th className="text-right px-5 py-3 font-medium">Last Share</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const sharePct = totals.totalHash > 0 ? (w.hashrate / totals.totalHash) * 100 : 0;
                return (
                  <tr
                    key={w.addr}
                    data-testid={`worker-row-${w.rig}`}
                    className="border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${w.online ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
                        <span className="font-medium text-white">{w.rig}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">{shortAddr(w.addr)}</td>
                    <td className="px-3 py-3 text-slate-400">{w.region}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={w.online ? "text-orange-400 font-semibold" : "text-slate-600"}>
                        {w.hashrate.toLocaleString()}
                      </span>
                      <span className="text-slate-600 text-xs ml-1">H/s</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                            style={{ width: `${Math.min(100, sharePct).toFixed(1)}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-xs tabular-nums w-10 text-right">{sharePct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300 tabular-nums">{w.shares.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-blue-400 tabular-nums">{w.uptime.toFixed(2)}%</td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">
                      {w.online ? formatLastShare(w.lastShare) : <span className="text-amber-500/80">offline</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-800/60">
          {workers.map((w) => {
            const sharePct = totals.totalHash > 0 ? (w.hashrate / totals.totalHash) * 100 : 0;
            return (
              <div key={w.addr} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${w.online ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
                    <span className="font-medium">{w.rig}</span>
                    <span className="text-xs text-slate-500">· {w.region}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${w.online ? "text-orange-400" : "text-slate-600"}`}>
                    {w.hashrate.toLocaleString()} H/s
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500">{shortAddr(w.addr)}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                      style={{ width: `${Math.min(100, sharePct).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{sharePct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Shares: <span className="text-slate-300">{w.shares.toLocaleString()}</span></span>
                  <span>Uptime: <span className="text-blue-400">{w.uptime.toFixed(2)}%</span></span>
                  <span>{w.online ? formatLastShare(w.lastShare) : <span className="text-amber-500/80">offline</span>}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
