// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Pickaxe } from "lucide-react";

const POOLS = ["xmrpool.eu:3333", "pool.monerorig.com:7777", "monero.herominers.com:10190", "supportxmr.com:3333"];
const DIFFS = [45821, 78123, 125600, 98412, 156800, 210450, 178222];
const WORKERS = ["worker_01", "worker_02", "worker_03", "worker_04", "worker_05"];
const JOB_IDS = () => Math.random().toString(16).slice(2, 10);
const HASH_IDS = () => Math.random().toString(16).slice(2, 18);

const now = () => {
  const d = new Date();
  const p = (n, w = 2) => n.toString().padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds() % 1000, 3)}`;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);

// Severity color classes
const SEV = {
  info:    "text-slate-400",
  ok:      "text-green-400",
  share:   "text-orange-300",
  net:     "text-cyan-400",
  warn:    "text-amber-400",
  block:   "text-fuchsia-400",
  payout:  "text-emerald-300",
  sys:     "text-blue-300",
};

const randomLog = () => {
  const r = Math.random();
  const ts = now();
  // Weighted random log types
  if (r < 0.55) {
    const diff = pick(DIFFS);
    const rig = pick(WORKERS);
    const elapsed = rand(180, 2800).toFixed(0);
    return {
      ts,
      sev: "share",
      text: `[cpu] accepted  (${Math.floor(rand(1, 40))}/${Math.floor(rand(40, 80))})  diff ${diff}  ${elapsed}ms  ${rig}`,
      tag: "SHARE ✓",
    };
  }
  if (r < 0.72) {
    return {
      ts,
      sev: "net",
      text: `[net] new job  id=${JOB_IDS()}  target=${(rand(1e10, 9e10) | 0).toString(16)}  height=${Math.floor(rand(3_150_000, 3_160_000))}`,
      tag: "JOB",
    };
  }
  if (r < 0.82) {
    const kh = rand(9.8, 32.4).toFixed(2);
    return {
      ts,
      sev: "info",
      text: `[cpu] hashrate 1m/5m/15m  ${kh}  ${(kh * 0.97).toFixed(2)}  ${(kh * 0.94).toFixed(2)} KH/s`,
      tag: "RATE",
    };
  }
  if (r < 0.9) {
    return {
      ts,
      sev: "sys",
      text: `[pool] connected to ${pick(POOLS)}  latency ${Math.floor(rand(18, 140))}ms  TLS=on`,
      tag: "POOL",
    };
  }
  if (r < 0.95) {
    const kh = rand(10, 30).toFixed(2);
    return {
      ts,
      sev: "warn",
      text: `[net] high-latency ping detected, rotating stratum endpoint  (${Math.floor(rand(220, 480))}ms)`,
      tag: "WARN",
    };
  }
  if (r < 0.985) {
    const reward = rand(0.55, 0.62).toFixed(4);
    const usd = (reward * rand(155, 170)).toFixed(2);
    return {
      ts,
      sev: "block",
      text: `★ BLOCK FOUND!  height=${Math.floor(rand(3_150_000, 3_160_000))}  reward=${reward} XMR ≈ $${usd}`,
      tag: "BLOCK",
    };
  }
  const amount = rand(0.0009, 0.0042).toFixed(6);
  return {
    ts,
    sev: "payout",
    text: `[wallet] payout sent  ${amount} XMR  → 8B…rig  tx=${HASH_IDS()}`,
    tag: "PAYOUT",
  };
};

const seed = () => {
  const out = [];
  for (let i = 0; i < 14; i++) out.push(randomLog());
  return out;
};

export function MiningLogs({ running }) {
  const [logs, setLogs] = useState(seed);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const next = [...prev, randomLog()];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative h-80 rounded-xl bg-[#05070d] border border-slate-800 overflow-hidden shadow-inner" data-testid="mining-logs">
      {/* Terminal top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          <span className="ml-3 text-[11px] font-mono text-slate-500 tracking-wider">
            root@monerorig:~# <span className="text-orange-400">xmrig --config=monerorig.json</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
          <Pickaxe className="w-3 h-3 text-orange-400" />
          <span>{running ? "RUNNING" : "PAUSED"}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
        </div>
      </div>

      {/* Log stream */}
      <div
        ref={scrollRef}
        className="h-[calc(100%-40px)] overflow-y-auto font-mono text-[11.5px] leading-5 px-4 py-2 space-y-0.5 scroll-smooth"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, monospace" }}
      >
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-slate-600 shrink-0">{l.ts}</span>
            <span className={`shrink-0 w-14 ${SEV[l.sev] || SEV.info}`}>[{l.tag}]</span>
            <span className={`${SEV[l.sev] || SEV.info} whitespace-pre-wrap break-all`}>{l.text}</span>
          </div>
        ))}
        {running && (
          <div className="flex gap-2 items-start text-slate-500">
            <span className="text-slate-600 shrink-0">{now().slice(0, 8)}</span>
            <span className="shrink-0 w-14 text-slate-600">[wait]</span>
            <span className="inline-block w-2 h-4 bg-orange-400/80 animate-pulse align-middle" />
          </div>
        )}
      </div>
    </div>
  );
}
