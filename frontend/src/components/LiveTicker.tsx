// @ts-nocheck
import { Pickaxe } from "lucide-react";

const items = [
  { user: "0x7a…3f9", plan: "Dual Miner",  earned: "$18.16 USDT", time: "12s ago" },
  { user: "0x9e…b81", plan: "Multi Rig",   earned: "$38.19 USDT", time: "31s ago" },
  { user: "0x21…4cd", plan: "Pool Plan",   earned: "$0.70 USDT",  time: "47s ago" },
  { user: "0x8f…e02", plan: "Solo Miner",  earned: "$7.21 USDT",  time: "1m ago"  },
  { user: "0xa3…7d4", plan: "Multi Rig",   earned: "$38.19 USDT", time: "1m ago"  },
  { user: "0x1c…99a", plan: "Solo Miner",  earned: "$7.21 USDT",  time: "2m ago"  },
  { user: "0xfa…008", plan: "Dual Miner",  earned: "$18.16 USDT", time: "2m ago"  },
  { user: "0x5d…111", plan: "Multi Rig",   earned: "$38.19 USDT", time: "3m ago"  },
  { user: "0xb2…7a3", plan: "Pool Plan",   earned: "$0.70 USDT",  time: "4m ago"  },
  { user: "0x3c…c41", plan: "Dual Miner",  earned: "$18.16 USDT", time: "5m ago"  },
];

export function LiveTicker() {
  const loop = [...items, ...items];
  return (
    <div className="relative border-y border-orange-500/15 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 overflow-hidden" data-testid="live-ticker">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10" />
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold tracking-wider uppercase shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          Live Payouts
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker whitespace-nowrap" style={{ width: "200%" }}>
            {loop.map((it, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 mx-6 text-sm">
                <Pickaxe className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-slate-500">{it.user}</span>
                <span className="text-slate-400">just earned</span>
                <span className="font-semibold text-green-400">{it.earned}</span>
                <span className="text-slate-500">on</span>
                <span className="text-orange-300">{it.plan}</span>
                <span className="text-slate-600 text-xs">· {it.time}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
