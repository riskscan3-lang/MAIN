// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Wallet, Clock, TrendingUp, ShoppingBag, ExternalLink, Activity as ActivityIcon,
  LogIn, Smartphone, Monitor, RefreshCw, AlertCircle,
} from "lucide-react";
import { useWallet, shortAddress, explorerTxUrl, CHAINS } from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatRelative = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString();
};

const formatFull = (d) => (d ? new Date(d).toLocaleString() : "—");

export function MyActivity() {
  const wallet = useWallet();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivity = async () => {
    if (!wallet.address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/wallet/${wallet.address}/activity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActivity(data);
    } catch (e) {
      setError(e?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address]);

  // Not connected → prompt
  if (!wallet.isConnected) {
    return (
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8" data-testid="my-activity-locked">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-5">
                <Wallet className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect your wallet</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Your wallet address is your account. Connect once and we'll remember your plans,
                purchases and connection history — no passwords, no email.
              </p>
              <Button
                onClick={() => wallet.connect()}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-semibold px-6"
                data-testid="activity-connect"
              >
                <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const stats = activity?.stats;
  const sessions = activity?.sessions || [];
  const purchases = activity?.purchases || [];
  const chain = wallet.chainId ? CHAINS[wallet.chainId] : null;

  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8" data-testid="my-activity">
      <div className="max-w-6xl mx-auto">
        {/* Header / hero */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-orange-400 mb-2 font-semibold">My Activity</div>
            <h1 className="text-3xl sm:text-4xl font-bold">Welcome back</h1>
            <p className="text-slate-400 mt-1 font-mono text-sm">
              {shortAddress(wallet.address)}
              {chain && <span className="ml-3 text-[11px] uppercase tracking-wider text-slate-500">· {chain.name}</span>}
            </p>
          </div>
          <Button
            onClick={fetchActivity}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            data-testid="activity-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm" data-testid="activity-error">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">Sessions</span>
                <LogIn className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-bold tabular-nums" data-testid="stat-sessions">
                {stats?.session_count ?? "—"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Times you've connected</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">Purchases</span>
                <ShoppingBag className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-3xl font-bold tabular-nums" data-testid="stat-purchases">
                {stats?.purchase_count ?? "—"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Plans activated</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">Total Spent</span>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-3xl font-bold tabular-nums text-green-400" data-testid="stat-spent">
                ${stats ? stats.total_spent_usd_like.toLocaleString() : "—"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Stablecoins (USDT + USDC)</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">First Seen</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold" data-testid="stat-first-seen">
                {stats?.first_seen ? formatRelative(stats.first_seen) : "—"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats?.first_seen ? formatFull(stats.first_seen) : "No activity yet"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase history */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/60">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                Purchase History
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium ml-auto">
                  {purchases.length} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {purchases.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No purchases yet. Activate a plan to see it here.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                  {purchases.map((p) => (
                    <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3" data-testid={`purchase-row-${p.id}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.plan_name || `Plan ${p.plan_id}`}</span>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            p.status === "confirmed"
                              ? "text-green-400 bg-green-500/10 border-green-500/30"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                          }`}>{p.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span>{CHAINS[p.chain]?.name || `Chain ${p.chain}`}</span>
                          <span>·</span>
                          <span>{formatRelative(p.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums text-orange-400">
                          {p.amount} <span className="text-xs text-slate-500">{p.token_type}</span>
                        </div>
                        <a
                          href={explorerTxUrl(p.chain, p.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-slate-500 hover:text-orange-400 inline-flex items-center gap-1 mt-0.5"
                        >
                          {p.tx_hash.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session history */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800/60">
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-blue-400" />
                Session History
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium ml-auto">
                  {sessions.length} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No sessions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                  {sessions.map((s) => {
                    const isMobile = /mobi|android|iphone|ipad/i.test(s.user_agent || "");
                    return (
                      <div key={s.id} className="px-5 py-3.5 flex items-center gap-3" data-testid={`session-row-${s.id}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          s.source === "walletconnect"
                            ? "bg-[#3b99fc]/15 text-[#3b99fc]"
                            : "bg-orange-500/15 text-orange-400"
                        }`}>
                          {isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {s.source === "walletconnect" ? "WalletConnect" : s.source === "injected" ? "Browser Wallet" : s.source}
                            </span>
                            {s.chain_id && CHAINS[s.chain_id] && (
                              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                · {CHAINS[s.chain_id].short}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5" title={formatFull(s.connected_at)}>
                            {formatRelative(s.connected_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
