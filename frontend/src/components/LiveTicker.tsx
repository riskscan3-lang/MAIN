// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Pickaxe } from "lucide-react";

const PLAN_PAYOUTS = [
  { name: "Pool Plan",  amount: 1.39 },
  { name: "Solo Miner", amount: 14.05 },
  { name: "Dual Miner", amount: 31.86 },
  { name: "Multi Rig",  amount: 65.59 },
];

// Weight higher tiers slightly less to keep the ticker believable
const PLAN_WEIGHTS = [0.35, 0.35, 0.2, 0.1];

const HEX = "0123456789abcdef";
function randWallet() {
  const head = Array.from({ length: 2 }, () => HEX[Math.floor(Math.random() * 16)]).join("");
  const tail = Array.from({ length: 3 }, () => HEX[Math.floor(Math.random() * 16)]).join("");
  return `0x${head}…${tail}`;
}

function pickPlan() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < PLAN_PAYOUTS.length; i++) {
    acc += PLAN_WEIGHTS[i];
    if (r <= acc) return PLAN_PAYOUTS[i];
  }
  return PLAN_PAYOUTS[0];
}

function humanAgo(secondsAgo) {
  if (secondsAgo < 60) return `${Math.max(1, Math.floor(secondsAgo))}s ago`;
  const m = Math.floor(secondsAgo / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function generateItem(createdAt = Date.now()) {
  const plan = pickPlan();
  // Vary the amount a little bit so entries feel unique
  const jitter = 1 + (Math.random() * 0.1 - 0.05); // ±5%
  const earned = (plan.amount * jitter).toFixed(2);
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    user: randWallet(),
    plan: plan.name,
    earned: `$${earned} USDT`,
    createdAt,
  };
}

export function LiveTicker() {
  // Start with 10 seeded items so the marquee never looks empty
  const [items, setItems] = useState(() => {
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => generateItem(now - i * 18000));
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Every 4s insert a new payout at the head
    const addInterval = setInterval(() => {
      setItems((prev) => {
        const next = [generateItem(), ...prev];
        return next.slice(0, 12); // cap history
      });
    }, 4000);
    // Every 1s recompute relative times
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(addInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const now = Date.now();
  const displayItems = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        time: humanAgo((now - it.createdAt) / 1000),
      })),
    // re-evaluate when tick or items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, tick]
  );

  // Duplicate for seamless marquee loop
  const loop = [...displayItems, ...displayItems];

  return (
    <div
      className="relative border-y border-orange-500/15 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 overflow-hidden"
      data-testid="live-ticker"
    >
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
              <span
                key={`${it.id}-${idx}`}
                className="inline-flex items-center gap-2 mx-6 text-sm"
                data-testid="ticker-entry"
              >
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
