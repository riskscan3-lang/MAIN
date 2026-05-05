// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Pickaxe, Clock, Wallet, Activity, Cpu, Zap, ArrowRight, Loader2, ShoppingBag, ExternalLink, Users, Gift, Banknote, X, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { XmrPriceChart } from "./XmrPriceChart";
import { WorkerPool } from "./WorkerPool";
import { MiningLogs } from "./MiningLogs";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useWallet, explorerTxUrl, shortAddress } from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WITHDRAWAL_MIN_USD = 10;

// Plan catalogue (must mirror /components/Plans.tsx + /components/ProfitCalculator.tsx)
const PLAN_META = {
  "1": { name: "Pool Plan",  hashrateHs: 2500,   dailyUSD: 1.3863014,  annualROIPct: 102.40, contractDays: 365 },
  "2": { name: "Solo Miner", hashrateHs: 25000,  dailyUSD: 14.0547945, annualROIPct: 105.20, contractDays: 365 },
  "3": { name: "Dual Miner", hashrateHs: 60000,  dailyUSD: 31.8575343, annualROIPct: 132.56, contractDays: 365 },
  "4": { name: "Multi Rig",  hashrateHs: 150000, dailyUSD: 65.5890411, annualROIPct: 139.40, contractDays: 365 },
};

const fmtUSD = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtUSDFine = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
const fmtXMR = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface MiningDashboardProps {
  planId?: number | null;
  setActiveView?: (view: string) => void;
}

export function MiningDashboard({ planId, setActiveView }: MiningDashboardProps) {
  const wallet = useWallet();
  const [purchases, setPurchases] = useState([]);
  const [referralsData, setReferralsData] = useState(null);
  const [xmrPrice, setXmrPrice] = useState(null); // USD per 1 XMR
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0); // re-render every 1s

  // Fetch purchases + referrals + withdrawals when wallet connects / changes
  useEffect(() => {
    if (!wallet.isConnected) {
      setPurchases([]);
      setReferralsData(null);
      setWithdrawals([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pRes, rRes, wRes] = await Promise.all([
          fetch(`${API}/purchases?buyer_address=${wallet.address}`),
          fetch(`${API}/wallet/${wallet.address}/referrals`),
          fetch(`${API}/wallet/${wallet.address}/withdrawals`),
        ]);
        if (!cancelled && pRes.ok) {
          const data = await pRes.json();
          setPurchases(Array.isArray(data) ? data : []);
        }
        if (!cancelled && rRes.ok) setReferralsData(await rRes.json());
        if (!cancelled && wRes.ok) setWithdrawals(await wRes.json());
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wallet.isConnected, wallet.address]);

  // Fetch XMR price (refresh every 60s)
  useEffect(() => {
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const r = await fetch(`${API}/xmr/price`);
        if (r.ok) {
          const d = await r.json();
          if (!cancelled && d.price_usd > 0) setXmrPrice(d.price_usd);
        }
      } catch (_) {}
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const refreshWithdrawals = async () => {
    if (!wallet.address) return;
    try {
      const r = await fetch(`${API}/wallet/${wallet.address}/withdrawals`);
      if (r.ok) setWithdrawals(await r.json());
    } catch (_) {}
  };

  // Poll withdrawals every 30s; when a status flips (e.g. pending → completed)
  // surface a toast so the user knows their payout was processed.
  const seenStatusRef = useRef({}); // { [withdrawalId]: lastStatus }
  useEffect(() => {
    if (!wallet.isConnected) return;
    // Seed: don't fire toasts for the initial snapshot, only future changes.
    const initial = {};
    for (const w of withdrawals) initial[w.id] = w.status;
    seenStatusRef.current = initial;
  }, [wallet.address]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) return;
    const STATUS_COPY = {
      processing: { type: "info",    title: "Withdrawal in processing", body: "An admin is preparing your XMR payout." },
      completed:  { type: "success", title: "Withdrawal sent!",         body: "Your XMR payout has been broadcast. Check your wallet." },
      rejected:   { type: "error",   title: "Withdrawal rejected",      body: "Please contact support if this is unexpected." },
    };
    const poll = async () => {
      try {
        const r = await fetch(`${API}/wallet/${wallet.address}/withdrawals`);
        if (!r.ok) return;
        const list = await r.json();
        if (!Array.isArray(list)) return;
        const seen = seenStatusRef.current;
        for (const w of list) {
          const prev = seen[w.id];
          if (prev && prev !== w.status && STATUS_COPY[w.status]) {
            const meta = STATUS_COPY[w.status];
            const fn = meta.type === "success" ? toast.success : meta.type === "error" ? toast.error : toast.info;
            fn(meta.title, {
              description: `${meta.body} (≈ $${Number(w.amount_usd || 0).toFixed(2)} USDT)`,
              duration: 8000,
            });
          }
          seen[w.id] = w.status;
        }
        setWithdrawals(list);
      } catch (_) {}
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [wallet.isConnected, wallet.address]);

  // 1-second tick — drives every real-time stat in the UI
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Aggregate: earnings + hashrate + uptime per purchase, summed
  const stats = useMemo(() => {
    const now = Date.now();
    let totalEarned = 0;
    let totalHashrate = 0;
    let activeCount = 0;
    let oldestStart = null;
    const perPlan = [];

    for (const p of purchases) {
      const meta = PLAN_META[String(p.plan_id)];
      if (!meta) continue;
      const startedAt = p.created_at ? new Date(p.created_at).getTime() : now;
      const elapsedSec = Math.max(0, (now - startedAt) / 1000);
      const contractSec = meta.contractDays * 86400;
      const activeSec = Math.min(elapsedSec, contractSec);
      const isActive = elapsedSec < contractSec;
      // Per-second payout = daily / 86400
      const earned = (meta.dailyUSD / 86400) * activeSec;
      totalEarned += earned;
      if (isActive) {
        totalHashrate += meta.hashrateHs;
        activeCount++;
      }
      if (!oldestStart || startedAt < oldestStart) oldestStart = startedAt;
      perPlan.push({
        ...p,
        meta,
        startedAt,
        elapsedSec,
        activeSec,
        contractSec,
        isActive,
        earned,
        progressPct: Math.min(100, (activeSec / contractSec) * 100),
      });
    }
    perPlan.sort((a, b) => b.startedAt - a.startedAt);
    const sessionUptimeSec = oldestStart ? (now - oldestStart) / 1000 : 0;
    return { totalEarned, totalHashrate, activeCount, perPlan, sessionUptimeSec };
  }, [purchases, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synthetic "blocks found" — tied to total hashrate × elapsed seconds for stability
  const blocksFound = useMemo(() => {
    if (!stats.sessionUptimeSec) return 0;
    return Math.floor((stats.totalHashrate * stats.sessionUptimeSec) / 600000);
  }, [stats.totalHashrate, stats.sessionUptimeSec]);

  // Withdrawable balance = total earned − sum of pending/processing/completed withdrawals
  const withdrawn = useMemo(() => {
    return withdrawals
      .filter((w) => ["pending", "processing", "completed"].includes(w.status))
      .reduce((s, w) => s + (w.amount_usd || 0), 0);
  }, [withdrawals]);
  const withdrawable = Math.max(0, stats.totalEarned - withdrawn);
  const withdrawableXMR = xmrPrice ? withdrawable / xmrPrice : 0;
  const totalEarnedXMR = xmrPrice ? stats.totalEarned / xmrPrice : 0;
  const hasPendingWithdrawal = withdrawals.some((w) => ["pending", "processing"].includes(w.status));
  const canWithdraw = withdrawable >= WITHDRAWAL_MIN_USD && !hasPendingWithdrawal;

  if (!wallet.isConnected) {
    return (
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Your Mining Dashboard</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Connect your wallet to view your active mining plans, real-time earnings, and on-chain purchase history. Your wallet address is your identity — earnings accrue automatically based on the time elapsed since each plan was activated.
          </p>
          <div className="flex justify-center" data-testid="dashboard-connect-cta">
            <ConnectWalletButton />
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Cpu, label: "Real-time hashrate", desc: "Aggregated across all your active rigs" },
              { icon: Wallet, label: "Live earnings", desc: "$ accrues every second since plan activation" },
              { icon: Activity, label: "Plan history", desc: "Every purchase tied to your wallet address" },
            ].map((c) => (
              <div key={c.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-left">
                <c.icon className="w-5 h-5 text-orange-400 mb-2" />
                <div className="text-sm font-semibold mb-1">{c.label}</div>
                <div className="text-xs text-slate-500">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your dashboard…
        </div>
      </section>
    );
  }

  const hasPlans = stats.perPlan.length > 0;
  const earliestPlan = stats.perPlan[stats.perPlan.length - 1];

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8" data-testid="mining-dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Mining Dashboard</h1>
            <p className="text-slate-400">
              Real-time earnings for <span className="font-mono text-orange-400">{shortAddress(wallet.address)}</span>
            </p>
          </div>
          <ConnectWalletButton compact />
        </div>

        {/* Status banner */}
        <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between ${
          stats.activeCount > 0
            ? "bg-green-500/10 border-green-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stats.activeCount > 0 ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></div>
            <span className="font-medium" data-testid="dashboard-status">
              {stats.activeCount > 0 ? `Mining Active · ${stats.activeCount} plan${stats.activeCount === 1 ? "" : "s"}` : "No active plans"}
            </span>
            {hasPlans && (
              <span className="text-sm text-slate-400 hidden sm:inline">
                | Earning since {timeAgo(earliestPlan.startedAt)}
              </span>
            )}
          </div>
          {!hasPlans && (
            <Button
              onClick={() => { window.location.hash = "#plans"; }}
              data-testid="dashboard-go-plans"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> Buy a plan
            </Button>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Total Hashrate</span>
                <Cpu className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-3xl font-bold text-orange-400 tabular-nums" data-testid="kpi-hashrate">
                {stats.totalHashrate.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500">H/s · across {stats.activeCount} active rig{stats.activeCount === 1 ? "" : "s"}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Total Earned</span>
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-400 tabular-nums" data-testid="kpi-earned">
                {fmtUSDFine(stats.totalEarned)} <span className="text-slate-500 text-base font-normal">~</span>{" "}
                <span className="text-orange-300 text-base font-semibold">{xmrPrice ? fmtXMR(totalEarnedXMR) : "—"}</span>
                <span className="text-slate-500 text-xs font-normal ml-1">XMR</span>
              </div>
              <div className="text-sm text-slate-500">
                {xmrPrice ? `Live · 1 XMR = $${xmrPrice.toFixed(2)}` : "Loading XMR price…"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Mining Time</span>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-400 tabular-nums" data-testid="kpi-uptime">
                {formatDuration(stats.sessionUptimeSec)}
              </div>
              <div className="text-sm text-slate-500">Since first plan</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">Blocks Contributed</span>
                <Pickaxe className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400 tabular-nums" data-testid="kpi-blocks">
                {blocksFound.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500">Pool shares</div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawable Balance + Request Withdraw */}
        <Card className="mb-8 border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent" data-testid="withdrawable-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 text-orange-300 text-xs uppercase tracking-wider font-semibold mb-2">
                  <Banknote className="w-4 h-4" />
                  Withdrawable Balance
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums" data-testid="withdrawable-usd">
                  {fmtUSDFine(withdrawable)}
                  <span className="text-slate-500 text-base font-normal mx-2">~</span>
                  <span className="text-orange-300 text-xl font-semibold" data-testid="withdrawable-xmr">
                    {xmrPrice ? fmtXMR(withdrawableXMR) : "—"}
                  </span>
                  <span className="text-slate-500 text-sm font-normal ml-1">XMR</span>
                </div>
                <div className="text-sm text-slate-400 mt-2 flex items-center gap-2">
                  <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                  Withdrawals process within <strong className="text-amber-300">24 hours</strong> · available <strong className="text-amber-300">24/7</strong>
                </div>
                {withdrawn > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Already requested: {fmtUSD(withdrawn)} · Total earned: {fmtUSD(stats.totalEarned)}
                  </div>
                )}
                {hasPendingWithdrawal && (
                  <div className="text-xs text-amber-400 mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    A withdrawal is currently being processed
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={!canWithdraw}
                  data-testid="request-withdrawal-button"
                  className={`py-6 font-semibold text-base ${
                    canWithdraw
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Request Withdrawal
                </Button>
                {!canWithdraw && !hasPendingWithdrawal && (
                  <p className="text-[11px] text-slate-500 text-center">
                    Min. ${WITHDRAWAL_MIN_USD} USDT required (~ {xmrPrice ? fmtXMR(WITHDRAWAL_MIN_USD / xmrPrice) : "—"} XMR)
                  </p>
                )}
              </div>
            </div>

            {/* Withdrawal history */}
            {withdrawals.length > 0 && (
              <div className="mt-5 pt-5 border-t border-orange-500/20">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Recent Withdrawals</div>
                <div className="space-y-2">
                  {withdrawals.slice(0, 5).map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3 text-sm bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800" data-testid={`withdrawal-${w.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <WithdrawalStatusBadge status={w.status} />
                        <span className="text-slate-400 truncate">{new Date(w.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="text-white font-medium tabular-nums whitespace-nowrap">
                        ${w.amount_usd.toFixed(4)}
                        {w.amount_xmr ? <span className="text-slate-500 font-normal"> · {w.amount_xmr.toFixed(6)} XMR</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {hasPlans && (
          <Card className="mb-6 bg-slate-900 border-slate-800" data-testid="active-plans-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Your Active Plans · {stats.perPlan.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.perPlan.map((p) => (
                <div
                  key={p.id || p.tx_hash}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-orange-500/40 transition-colors"
                  data-testid={`active-plan-${p.id || p.tx_hash}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.meta.name}</span>
                        {p.isActive ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Started {timeAgo(p.startedAt)} · {p.meta.hashrateHs.toLocaleString()} H/s · {p.meta.annualROIPct}% annual
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400 tabular-nums" data-testid={`plan-earned-${p.plan_id}`}>
                        {fmtUSDFine(p.earned)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">earned so far</div>
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Contract progress</span>
                      <span className="text-slate-400">
                        {Math.floor(p.activeSec / 86400)}d / {p.meta.contractDays}d ({p.progressPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-500"
                        style={{ width: `${p.progressPct}%` }}
                      />
                    </div>
                  </div>
                  {/* TX hash row */}
                  {p.tx_hash && (
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">tx: {p.tx_hash.slice(0, 10)}…{p.tx_hash.slice(-8)}</span>
                      <a
                        href={explorerTxUrl(p.chain, p.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300"
                      >
                        <ExternalLink className="w-3 h-3" /> view
                      </a>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{p.amount} {p.token_type}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Referrals — your direct downline */}
        <ReferralsCard data={referralsData} onGoRewards={() => setActiveView && setActiveView("rewards")} />

        {/* Real-time XMR Price Chart */}
        <div className="mb-6">
          <XmrPriceChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-400" />
                Live Mining Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiningLogs running={stats.activeCount > 0} />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.activeCount > 0 ? (
                  <>
                    <ActivityRow color="green" label="Share Accepted" detail={`${(tick * 47) % 9000 + 1000} H validated`} />
                    <ActivityRow color="blue"  label="Hash Submitted" detail="pool.monerorig.com:5555" />
                    <ActivityRow color="amber" label="Difficulty Updated" detail="312.4K → 318.9K" />
                    <ActivityRow color="green" label="Share Accepted" detail={`${(tick * 31) % 9000 + 1000} H validated`} />
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>No active mining</p>
                    <p className="text-sm">Activate a plan to start earning</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projected earnings summary */}
        {hasPlans && (
          <Card className="mt-6 bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Projected Earnings</h3>
                  <p className="text-slate-500 text-sm">Aggregated across all your active plans</p>
                </div>
                <div className="flex items-center gap-8">
                  <ProjStat amount={stats.perPlan.filter(p => p.isActive).reduce((s, p) => s + p.meta.dailyUSD, 0)} label="Daily" color="text-orange-400" />
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                  <ProjStat amount={stats.perPlan.filter(p => p.isActive).reduce((s, p) => s + p.meta.dailyUSD, 0) * 30} label="Monthly" color="text-amber-400" />
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                  <ProjStat amount={stats.perPlan.filter(p => p.isActive).reduce((s, p) => s + p.meta.dailyUSD, 0) * 365} label="Yearly" color="text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <WorkerPool />
        </div>
      </div>

      <WithdrawModal
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        withdrawable={withdrawable}
        withdrawableXMR={withdrawableXMR}
        xmrPrice={xmrPrice}
        walletAddress={wallet.address}
        onSubmitted={refreshWithdrawals}
      />
    </section>
  );
}

function ActivityRow({ color, label, detail }) {
  const dot = {
    green: "bg-green-500",
    blue:  "bg-blue-500",
    amber: "bg-amber-500",
  }[color] || "bg-slate-500";
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg">
      <div className={`w-2 h-2 ${dot} rounded-full`} />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ProjStat({ amount, label, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{fmtUSD(amount)}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ReferralsCard({ data, onGoRewards }) {
  const goRewards = () => { if (onGoRewards) onGoRewards(); };
  const directCount = data?.direct_count ?? 0;
  const networkValue = data?.network_value_usd ?? 0;
  const directSolo = data?.direct_solo_rigs ?? 0;
  const referredUsers = data?.referred_users ?? [];

  return (
    <Card className="mb-6 bg-slate-900 border-slate-800" data-testid="dashboard-referrals-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            Your Referrals
            <span className="text-xs font-normal text-slate-500">· {directCount} direct · {fmtUSD(networkValue)} network</span>
          </CardTitle>
          <Button
            onClick={goRewards}
            data-testid="dashboard-go-rewards"
            variant="outline"
            className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 hover:border-orange-500/70"
          >
            <Gift className="w-4 h-4 mr-2" /> View Rewards
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {referredUsers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>You haven't referred anyone yet</p>
            <p className="text-sm">Share your unique referral link from the Rewards page to start earning $250 instant per Solo Rig referral.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="referrals-table">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="px-2 py-2.5 font-semibold">Wallet</th>
                  <th className="px-2 py-2.5 font-semibold">Plan</th>
                  <th className="px-2 py-2.5 font-semibold">Amount</th>
                  <th className="px-2 py-2.5 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {referredUsers.slice(0, 10).map((u) => (
                  <tr
                    key={u.address}
                    className="border-b border-slate-800/60 hover:bg-slate-950/40 transition-colors"
                    data-testid={`referral-row-${u.address}`}
                  >
                    <td className="px-2 py-3">
                      <span className="font-mono text-xs text-slate-300">
                        {u.address.slice(0, 6)}…{u.address.slice(-4)}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-orange-300 text-sm">{u.plan_name || u.plan_id}</span>
                      {u.plan_id === "2" && (
                        <span className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Solo Rig
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-green-400 font-medium">
                      {u.amount} {u.token_type}
                    </td>
                    <td className="px-2 py-3 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {referredUsers.length > 10 && (
              <p className="text-xs text-slate-500 text-center mt-3">
                Showing 10 of {referredUsers.length} · view all on the Rewards page
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-800">
              <RefStat label="Direct" value={directCount} />
              <RefStat label="Solo Rigs" value={directSolo} />
              <RefStat label="Network Value" value={fmtUSD(networkValue)} accent />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RefStat({ label, value, accent }) {
  return (
    <div className="text-center bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-green-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

function WithdrawalStatusBadge({ status }) {
  const map = {
    pending:    { label: "Pending",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",  icon: Clock3 },
    processing: { label: "Processing", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",      icon: Loader2 },
    completed:  { label: "Paid",       cls: "bg-green-500/15 text-green-400 border-green-500/30",   icon: CheckCircle2 },
    rejected:   { label: "Rejected",   cls: "bg-red-500/15 text-red-400 border-red-500/30",         icon: AlertTriangle },
  }[status] || { label: status, cls: "bg-slate-800 text-slate-400 border-slate-700", icon: Clock3 };
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${map.cls}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {map.label}
    </span>
  );
}

function WithdrawModal({ open, onClose, withdrawable, withdrawableXMR, xmrPrice, walletAddress, onSubmitted }) {
  const [amount, setAmount] = useState("");
  const [xmrAddress, setXmrAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setAmount(String(Math.floor(withdrawable * 100) / 100));
      setXmrAddress("");
      setContactEmail("");
      setError(null);
    }
  }, [open, withdrawable]);

  if (!open) return null;

  const amtNum = parseFloat(amount || "0");
  const amtXMR = xmrPrice && amtNum > 0 ? amtNum / xmrPrice : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!amtNum || amtNum < WITHDRAWAL_MIN_USD) { setError(`Minimum withdrawal is $${WITHDRAWAL_MIN_USD} USDT`); return; }
    if (amtNum > withdrawable + 0.001) { setError("Amount exceeds your withdrawable balance"); return; }
    if (!xmrAddress || xmrAddress.length < 30) { setError("Enter a valid XMR receiving address"); return; }

    setSubmitting(true);
    try {
      const r = await fetch(`${API}/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount_usd: amtNum,
          available_usd: withdrawable,
          xmr_address: xmrAddress,
          contact_email: contactEmail || undefined,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail?.[0]?.msg || body?.detail || "Withdrawal request failed");
      }
      toast.success("Withdrawal requested", {
        description: "Our team has been notified. Funds arrive within 24 hours.",
        duration: 7000,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="withdraw-modal"
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Request Withdrawal</h3>
              <p className="text-xs text-slate-400">Paid in XMR · 24-hour processing window</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white" data-testid="withdraw-modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs flex items-start gap-2">
            <Clock3 className="w-3.5 h-3.5 mt-0.5 text-amber-400 flex-shrink-0" />
            <span className="text-amber-200">
              Withdrawals are processed manually within <strong>24 hours</strong>. Our team is on call <strong>24/7</strong>.
              You'll receive your funds at the XMR address you provide below.
            </span>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-between mb-1.5">
              <span>Amount (USDT)</span>
              <span className="text-orange-300">Available: ${withdrawable.toFixed(4)}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min={WITHDRAWAL_MIN_USD}
                max={withdrawable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="withdraw-amount-input"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/60 pr-16"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(withdrawable * 10000) / 10000))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 hover:bg-orange-500/25"
              >
                MAX
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              You receive: <span className="text-orange-300 font-semibold tabular-nums">{xmrPrice ? amtXMR.toFixed(6) : "—"} XMR</span>
              {xmrPrice && <span className="text-slate-600"> @ ${xmrPrice.toFixed(2)}/XMR</span>}
            </p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">XMR receiving address</label>
            <input
              type="text"
              value={xmrAddress}
              onChange={(e) => setXmrAddress(e.target.value.trim())}
              placeholder="4..."
              data-testid="withdraw-xmr-input"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-white focus:outline-none focus:border-orange-500/60"
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-600 mt-1">Use your personal Monero wallet address (starts with 4 or 8). We never share or store this beyond payout.</p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">Contact email (optional)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value.trim())}
              placeholder="you@email.com"
              data-testid="withdraw-email-input"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/60"
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            data-testid="withdraw-submit"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-6 font-bold text-base disabled:opacity-50"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
              : <>Submit Withdrawal Request</>}
          </Button>

          <p className="text-[11px] text-slate-600 text-center">
            By submitting, you agree to wait up to 24 hours for processing. Our team will notify you upon completion.
          </p>
        </form>
      </div>
    </div>
  );
}
