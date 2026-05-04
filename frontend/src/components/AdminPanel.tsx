// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Shield, Loader2, CheckCircle2, X, AlertTriangle, Clock3, ExternalLink,
  Wallet, Copy, Check, RefreshCw, Filter,
} from "lucide-react";
import { useWallet, shortAddress, explorerTxUrl } from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_TABS = ["all", "pending", "processing", "completed", "rejected"];

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const fmtXMR = (n) => Number(n || 0).toFixed(6);
const fmtDate = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function AdminPanel({ adminWallets }) {
  const wallet = useWallet();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [actioning, setActioning] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  const isAdmin = useMemo(() => {
    if (!wallet.address) return false;
    return adminWallets.includes(wallet.address.toLowerCase());
  }, [wallet.address, adminWallets]);

  const refresh = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const url = filter === "all" ? `${API}/admin/withdrawals` : `${API}/admin/withdrawals?status=${filter}`;
      const r = await fetch(url, { headers: { "X-Admin-Wallet": wallet.address } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load withdrawals", { description: e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [filter, isAdmin, wallet.address]); // eslint-disable-line react-hooks/exhaustive-deps

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
        headers: { "Content-Type": "application/json", "X-Admin-Wallet": wallet.address },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed");
      }
      toast.success(`Marked ${status}`, { description: `Request ${id.slice(0, 8)}…` });
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
    const note = window.prompt("Rejection reason (visible to admin Telegram audit):", "");
    if (note === null) return;
    performAction(w.id, "rejected", { admin_note: note.trim() || "rejected by admin" });
  };

  if (!wallet.isConnected) {
    return (
      <Gate icon={<Wallet className="w-10 h-10 text-white" />} title="Admin Panel" body="Connect your admin wallet to manage withdrawals." />
    );
  }
  if (!isAdmin) {
    return (
      <Gate icon={<Shield className="w-10 h-10 text-white" />} title="Restricted" body={`Wallet ${shortAddress(wallet.address)} does not have admin access.`} />
    );
  }

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-950 min-h-screen" data-testid="admin-panel">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1 mb-2">
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-orange-300 uppercase tracking-wider">Admin · {shortAddress(wallet.address)}</span>
            </div>
            <h1 className="text-3xl font-bold">Withdrawals Management</h1>
            <p className="text-slate-400 mt-1 text-sm">Review pending requests, mark them processing, and post payout tx hashes.</p>
          </div>
          <Button onClick={refresh} disabled={loading} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" data-testid="admin-refresh">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2" data-testid="admin-filters">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              data-testid={`admin-filter-${s}`}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                filter === s
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <Filter className="w-3.5 h-3.5 inline mr-1.5" />
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {counts[s] > 0 && <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${filter === s ? "bg-white/20" : "bg-slate-800 text-slate-300"}`}>{counts[s]}</span>}
            </button>
          ))}
        </div>

        {/* Withdrawals list */}
        {withdrawals.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-16 text-center text-slate-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No withdrawals matching this filter</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <WithdrawalRow
                key={w.id}
                w={w}
                actioning={actioning === w.id}
                onMarkProcessing={() => onMarkProcessing(w)}
                onMarkCompleted={() => onMarkCompleted(w)}
                onReject={() => onReject(w)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function WithdrawalRow({ w, actioning, onMarkProcessing, onMarkCompleted, onReject }) {
  const [copied, setCopied] = useState(false);
  const copy = async (val) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-orange-500/30 transition-colors" data-testid={`admin-row-${w.id}`}>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Status + ID */}
          <div className="lg:col-span-2">
            <StatusBadge status={w.status} />
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">Request ID</div>
            <div className="font-mono text-xs text-slate-300 truncate">{w.id.slice(0, 12)}…</div>
            <div className="text-[10px] text-slate-500 mt-1">{fmtDate(w.created_at)}</div>
          </div>

          {/* Wallet + amounts */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Wallet</span>
              <span className="font-mono text-xs text-orange-300">{shortAddress(w.wallet_address)}</span>
              <button onClick={() => copy(w.wallet_address)} className="p-1 rounded hover:bg-slate-800 text-slate-500" data-testid={`copy-wallet-${w.id}`}>
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {fmtUSD(w.amount_usd)}
              <span className="text-slate-500 text-xs font-normal mx-1.5">~</span>
              <span className="text-orange-300 text-base">{fmtXMR(w.amount_xmr)}</span>
              <span className="text-slate-500 text-xs font-normal ml-1">XMR</span>
            </div>
            {w.contact_email && (
              <div className="text-xs text-slate-400 mt-1">📧 {w.contact_email}</div>
            )}
          </div>

          {/* XMR address */}
          <div className="lg:col-span-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Send XMR to</div>
            {w.xmr_address ? (
              <div className="flex items-start gap-2">
                <code className="flex-1 text-[10px] font-mono text-slate-300 break-all leading-relaxed">{w.xmr_address}</code>
                <button onClick={() => copy(w.xmr_address)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex-shrink-0" data-testid={`copy-xmr-${w.id}`}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-600">— not provided —</span>
            )}
            {w.payout_tx_hash && (
              <div className="mt-2 text-[11px]">
                <span className="text-slate-500">Tx: </span>
                <span className="font-mono text-green-400 break-all">{w.payout_tx_hash}</span>
              </div>
            )}
            {w.admin_note && (
              <div className="mt-2 text-[11px] text-amber-300">
                <span className="text-slate-500">Note: </span>{w.admin_note}
              </div>
            )}
          </div>

          {/* Actions */}
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
                  <X className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {(w.status === "completed" || w.status === "rejected") && (
              <span className="text-[11px] text-slate-500 text-center">
                Closed {w.processed_at ? `· ${fmtDate(w.processed_at)}` : ""}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    { label: "Pending",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",  Icon: Clock3 },
    processing: { label: "Processing", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",     Icon: Loader2 },
    completed:  { label: "Paid",       cls: "bg-green-500/15 text-green-400 border-green-500/30",  Icon: CheckCircle2 },
    rejected:   { label: "Rejected",   cls: "bg-red-500/15 text-red-400 border-red-500/30",        Icon: AlertTriangle },
  }[status] || { label: status, cls: "bg-slate-800 text-slate-400 border-slate-700", Icon: Clock3 };
  const Icon = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold ${map.cls}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {map.label}
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
