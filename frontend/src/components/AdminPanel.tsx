// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Shield, Loader2, CheckCircle2, X, AlertTriangle, Clock3, ExternalLink,
  Wallet, Copy, Check, RefreshCw, Filter, ShoppingBag, Users,
} from "lucide-react";
import { useWallet, shortAddress, explorerTxUrl } from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SECTIONS = [
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
  { id: "purchases",   label: "Purchases",   icon: ShoppingBag },
  { id: "wallets",     label: "Wallets",     icon: Users },
];

const fmtUSD  = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const fmtXMR  = (n) => Number(n || 0).toFixed(6);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const CHAIN_NAME = { 1: "Ethereum", 56: "BSC", 137: "Polygon" };

export function AdminPanel({ adminWallets }) {
  const wallet = useWallet();
  const [section, setSection] = useState("withdrawals");
  const isAdmin = useMemo(() => {
    if (!wallet.address) return false;
    return adminWallets.includes(wallet.address.toLowerCase());
  }, [wallet.address, adminWallets]);

  if (!wallet.isConnected) {
    return <Gate icon={<Wallet className="w-10 h-10 text-white" />} title="Admin Panel" body="Connect your admin wallet to manage operations." />;
  }
  if (!isAdmin) {
    return <Gate icon={<Shield className="w-10 h-10 text-white" />} title="Restricted" body={`Wallet ${shortAddress(wallet.address)} does not have admin access.`} />;
  }

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-950 min-h-screen" data-testid="admin-panel">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1 mb-2">
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-orange-300 uppercase tracking-wider">Admin · {shortAddress(wallet.address)}</span>
          </div>
          <h1 className="text-3xl font-bold">Operations Console</h1>
          <p className="text-slate-400 mt-1 text-sm">Withdrawals, purchase verification, and connected wallet activity.</p>
        </div>

        {/* Section tabs */}
        <div className="mb-6 flex flex-wrap gap-2" data-testid="admin-sections">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                data-testid={`admin-section-${s.id}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all flex items-center gap-2 ${
                  section === s.id
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {section === "withdrawals" && <WithdrawalsView adminAddress={wallet.address} />}
        {section === "purchases"   && <PurchasesView adminAddress={wallet.address} />}
        {section === "wallets"     && <WalletsView adminAddress={wallet.address} />}
      </div>
    </section>
  );
}

/* ---------- Withdrawals (existing) ---------- */
const WD_STATUS_TABS = ["all", "pending", "processing", "completed", "rejected"];

function WithdrawalsView({ adminAddress }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [actioning, setActioning] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? `${API}/admin/withdrawals` : `${API}/admin/withdrawals?status=${filter}`;
      const r = await fetch(url, { headers: { "X-Admin-Wallet": adminAddress } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setWithdrawals(await r.json());
    } catch (e) {
      toast.error("Failed to load withdrawals", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, processing: 0, completed: 0, rejected: 0 };
    for (const w of withdrawals) { c.all++; c[w.status] = (c[w.status] || 0) + 1; }
    return c;
  }, [withdrawals]);

  const performAction = async (id, status, extra = {}) => {
    setActioning(id);
    try {
      const r = await fetch(`${API}/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Admin-Wallet": adminAddress },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed");
      }
      toast.success(`Marked ${status}`);
      await refresh();
    } catch (e) {
      toast.error("Action failed", { description: e.message });
    } finally { setActioning(null); }
  };

  const onMarkProcessing = (w) => performAction(w.id, "processing");
  const onMarkCompleted = (w) => {
    const tx = window.prompt("Payout tx hash (Monero / blockchain explorer link):", "");
    if (tx === null) return;
    if (!tx.trim()) { toast.error("Tx hash required"); return; }
    performAction(w.id, "completed", { payout_tx_hash: tx.trim() });
  };
  const onReject = (w) => {
    const note = window.prompt("Rejection reason:", "");
    if (note === null) return;
    performAction(w.id, "rejected", { admin_note: note.trim() || "rejected by admin" });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Withdrawals</h2>
        <Button onClick={refresh} disabled={loading} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" data-testid="admin-refresh-withdrawals">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {WD_STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`admin-filter-${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === s
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            {s}{counts[s] > 0 && <span className="ml-1.5 text-[10px] opacity-80">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {withdrawals.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center text-slate-500">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No withdrawals matching this filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <WithdrawalRow
              key={w.id} w={w}
              actioning={actioning === w.id}
              onMarkProcessing={() => onMarkProcessing(w)}
              onMarkCompleted={() => onMarkCompleted(w)}
              onReject={() => onReject(w)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalRow({ w, actioning, onMarkProcessing, onMarkCompleted, onReject }) {
  const [copied, setCopied] = useState(false);
  const copy = async (val) => {
    try { await navigator.clipboard.writeText(val); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_) {}
  };
  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-orange-500/30 transition-colors" data-testid={`admin-row-${w.id}`}>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-2">
            <StatusPill status={w.status} kind="withdrawal" />
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">ID</div>
            <div className="font-mono text-xs text-slate-300 truncate">{w.id.slice(0, 12)}…</div>
            <div className="text-[10px] text-slate-500 mt-1">{fmtDate(w.created_at)}</div>
          </div>
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Wallet</span>
              <span className="font-mono text-xs text-orange-300">{shortAddress(w.wallet_address)}</span>
              <button onClick={() => copy(w.wallet_address)} className="p-1 rounded hover:bg-slate-800 text-slate-500">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {fmtUSD(w.amount_usd)}
              <span className="text-slate-500 text-xs font-normal mx-1.5">~</span>
              <span className="text-orange-300 text-base">{fmtXMR(w.amount_xmr)}</span>
              <span className="text-slate-500 text-xs font-normal ml-1">XMR</span>
            </div>
            {w.contact_email && <div className="text-xs text-slate-400 mt-1">📧 {w.contact_email}</div>}
          </div>
          <div className="lg:col-span-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Send XMR to</div>
            {w.xmr_address ? (
              <div className="flex items-start gap-2">
                <code className="flex-1 text-[10px] font-mono text-slate-300 break-all leading-relaxed">{w.xmr_address}</code>
                <button onClick={() => copy(w.xmr_address)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : <span className="text-xs text-slate-600">— not provided —</span>}
            {w.payout_tx_hash && <div className="mt-2 text-[11px]"><span className="text-slate-500">Tx: </span><span className="font-mono text-green-400 break-all">{w.payout_tx_hash}</span></div>}
            {w.admin_note && <div className="mt-2 text-[11px] text-amber-300"><span className="text-slate-500">Note: </span>{w.admin_note}</div>}
          </div>
          <div className="lg:col-span-2 flex flex-col gap-1.5">
            {w.status === "pending" && (
              <Button onClick={onMarkProcessing} disabled={actioning} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" data-testid={`mark-processing-${w.id}`}>
                {actioning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock3 className="w-3 h-3 mr-1" />}
                Mark Processing
              </Button>
            )}
            {(w.status === "pending" || w.status === "processing") && (
              <>
                <Button onClick={onMarkCompleted} disabled={actioning} size="sm" className="bg-green-500 hover:bg-green-600 text-white" data-testid={`mark-completed-${w.id}`}>
                  {actioning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Mark Paid
                </Button>
                <Button onClick={onReject} disabled={actioning} size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10" data-testid={`mark-rejected-${w.id}`}>
                  <X className="w-3 h-3 mr-1" /> Reject
                </Button>
              </>
            )}
            {(w.status === "completed" || w.status === "rejected") && (
              <span className="text-[11px] text-slate-500 text-center">Closed{w.processed_at ? ` · ${fmtDate(w.processed_at)}` : ""}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Purchases ---------- */
const PURCHASE_TABS = ["all", "pending", "confirmed", "failed"];

function PurchasesView({ adminAddress }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const refresh = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? `${API}/admin/purchases` : `${API}/admin/purchases?status=${filter}`;
      const r = await fetch(url, { headers: { "X-Admin-Wallet": adminAddress } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setItems(await r.json());
    } catch (e) {
      toast.error("Failed to load purchases", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, confirmed: 0, failed: 0 };
    for (const p of items) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [items]);

  const reverify = async (id) => {
    try {
      const r = await fetch(`${API}/purchases/${id}/verify`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success("Re-verification triggered");
      await refresh();
    } catch (e) { toast.error("Re-verify failed", { description: e.message }); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Plan Purchases</h2>
        <Button onClick={refresh} disabled={loading} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" data-testid="admin-refresh-purchases">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {PURCHASE_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`admin-purchase-filter-${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === s
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            {s}{counts[s] > 0 && <span className="ml-1.5 text-[10px] opacity-80">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center text-slate-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No purchases matching this filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Buyer</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Chain</th>
                <th className="px-3 py-3">Tx</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((p) => (
                <tr key={p.id} data-testid={`admin-purchase-${p.id}`} className="hover:bg-slate-900/40">
                  <td className="px-3 py-3"><StatusPill status={p.status} kind="purchase" /></td>
                  <td className="px-3 py-3 font-medium text-white">{p.plan_name || `Plan ${p.plan_id}`}{p.billing_mode === "annual" && <span className="ml-1 text-[10px] text-amber-300">·annual</span>}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-orange-300">{shortAddress(p.buyer_address)}</td>
                  <td className="px-3 py-3 tabular-nums">{p.amount} <span className="text-slate-500">{p.token_type}</span></td>
                  <td className="px-3 py-3 text-slate-400">{CHAIN_NAME[p.chain] || p.chain}</td>
                  <td className="px-3 py-3">
                    <a href={explorerTxUrl(p.chain, p.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200 font-mono text-[11px]">
                      {p.tx_hash.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
                    </a>
                    {p.verification_error && <div className="text-[10px] text-red-300 mt-0.5 max-w-[260px] truncate" title={p.verification_error}>⚠ {p.verification_error}</div>}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{fmtDate(p.created_at)}</td>
                  <td className="px-3 py-3">
                    {p.status === "pending" && (
                      <Button onClick={() => reverify(p.id)} size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-7" data-testid={`reverify-${p.id}`}>
                        <RefreshCw className="w-3 h-3 mr-1" />Re-verify
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Wallets ---------- */
function WalletsView({ adminAddress }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/wallets`, { headers: { "X-Admin-Wallet": adminAddress } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRows(await r.json());
    } catch (e) {
      toast.error("Failed to load wallets", { description: e.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Connected Wallets</h2>
          <p className="text-xs text-slate-500 mt-0.5">{rows.length} unique wallets</p>
        </div>
        <Button onClick={refresh} disabled={loading} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" data-testid="admin-refresh-wallets">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No wallets connected yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3">Wallet</th>
                <th className="px-3 py-3">Sessions</th>
                <th className="px-3 py-3">Purchases</th>
                <th className="px-3 py-3">Total Spent</th>
                <th className="px-3 py-3">First seen</th>
                <th className="px-3 py-3">Last seen</th>
                <th className="px-3 py-3">Sources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => (
                <tr key={r.address} data-testid={`admin-wallet-${r.address}`} className="hover:bg-slate-900/40">
                  <td className="px-3 py-3 font-mono text-[11px] text-orange-300" title={r.address}>{shortAddress(r.address)}</td>
                  <td className="px-3 py-3 tabular-nums">{r.session_count}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <span className="text-slate-200">{r.purchase_count}</span>
                    {r.purchase_count > 0 && (
                      <span className="ml-2 text-[10px] text-slate-500">
                        {r.confirmed_count > 0 && <span className="text-green-400">{r.confirmed_count}✓ </span>}
                        {r.pending_count > 0 && <span className="text-amber-400">{r.pending_count}⏳ </span>}
                        {r.failed_count > 0 && <span className="text-red-400">{r.failed_count}✗</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-green-300">{r.total_spent_usd ? fmtUSD(r.total_spent_usd) : "—"}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{fmtDate(r.first_seen)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{fmtDate(r.last_seen)}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-400">{(r.sources || []).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Shared ---------- */
function StatusPill({ status, kind }) {
  const map = kind === "purchase"
    ? {
        pending:   { label: "Verifying",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",  Icon: Loader2,         spin: true },
        confirmed: { label: "Confirmed",  cls: "bg-green-500/15 text-green-400 border-green-500/30",  Icon: CheckCircle2 },
        failed:    { label: "Failed",     cls: "bg-red-500/15 text-red-400 border-red-500/30",        Icon: AlertTriangle },
      }
    : {
        pending:    { label: "Pending",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",  Icon: Clock3 },
        processing: { label: "Processing", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",     Icon: Loader2, spin: true },
        completed:  { label: "Paid",       cls: "bg-green-500/15 text-green-400 border-green-500/30",  Icon: CheckCircle2 },
        rejected:   { label: "Rejected",   cls: "bg-red-500/15 text-red-400 border-red-500/30",        Icon: AlertTriangle },
      };
  const meta = map[status] || { label: status, cls: "bg-slate-800 text-slate-400 border-slate-700", Icon: Clock3 };
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold ${meta.cls}`}>
      <Icon className={`w-3 h-3 ${meta.spin ? "animate-spin" : ""}`} />
      {meta.label}
    </span>
  );
}

function Gate({ icon, title, body }) {
  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8" data-testid="admin-gate">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 mb-6">
          {icon}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        <p className="text-slate-400 leading-relaxed">{body}</p>
      </div>
    </section>
  );
}
