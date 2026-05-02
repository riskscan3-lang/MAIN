// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Loader2, ExternalLink, CheckCircle2, AlertTriangle, X,
  Copy, Check, Twitter, Send as SendIcon, Sparkles, Info,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  useWallet,
  CHAINS,
  SUPPORTED_CHAIN_IDS,
  RECIPIENT_ADDRESS,
  shortAddress,
  explorerTxUrl,
  isValidAddress,
} from "../context/WalletContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLAN_PRICING = {
  1: { name: "Pool Plan",  usd: 250,    native: 0.0001 },
  2: { name: "Solo Miner", usd: 2500,   native: 0.001  },
  3: { name: "Dual Miner", usd: 5000,   native: 0.002  },
  4: { name: "Multi Rig",  usd: 10000,  native: 0.004  },
};
const CHAIN_ETA = { 1: 180, 137: 30, 56: 15 };
const TOKEN_OPTIONS = ["USDT", "USDC", "NATIVE"];

const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const isValidTxHash = (h) => typeof h === "string" && TX_HASH_RE.test(h.trim());

const buildReferralCode = (address) => {
  if (!address) return "XMRMINE";
  return `XMR-${address.replace("0x", "").slice(-6).toUpperCase()}`;
};
const buildShareText = (planName, refCode) =>
  `Just activated my ${planName} plan on MONERO RIG ⛏️ Earning passive Monero with zero hardware. Use my ref code ${refCode} for a 5% bonus → `;

export function BuyPlanModal({ planId, onClose, onSuccess }) {
  const wallet = useWallet();
  const [chainId, setChainId] = useState(1);
  const [tokenType, setTokenType] = useState("USDT");
  const [step, setStep] = useState("setup"); // setup | confirm | success
  const [submitting, setSubmitting] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [confirmedTxHash, setConfirmedTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null); // 'address' | 'amount' | 'hash'
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [walletAddrInput, setWalletAddrInput] = useState("");

  const plan = PLAN_PRICING[planId] || PLAN_PRICING[3];
  const selectedChain = CHAINS[chainId];
  const amountValue = tokenType === "NATIVE"
    ? `${plan.native} ${selectedChain?.nativeSymbol}`
    : `${plan.usd} ${tokenType}`;
  const amountNumber = tokenType === "NATIVE" ? plan.native : plan.usd;
  const referralCode = useMemo(() => buildReferralCode(wallet.address), [wallet.address]);

  useEffect(() => {
    if (step !== "success") return;
    setSecondsLeft(CHAIN_ETA[chainId] || 60);
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, chainId]);

  const formatEta = (s) => {
    if (s <= 0) return "Confirming…";
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  };

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (_) {}
  };

  const handleConnect = async (e) => {
    e?.preventDefault?.();
    setError(null);
    try {
      await wallet.connect(walletAddrInput, { source: "manual", chainId });
      setWalletAddrInput("");
    } catch (err) {
      setError(err?.message || "Failed to connect");
    }
  };

  const handleSubmitTx = async (e) => {
    e?.preventDefault?.();
    setError(null);
    const hash = txHashInput.trim();
    if (!isValidTxHash(hash)) {
      setError("Invalid transaction hash. Must start with 0x and be 66 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`${API}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: String(planId),
          plan_name: plan.name,
          buyer_address: wallet.address,
          amount: tokenType === "NATIVE" ? String(plan.native) : String(plan.usd),
          chain: chainId,
          tx_hash: hash,
          token_type: tokenType,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.detail?.[0]?.msg || body?.detail || "Failed to record purchase");
      }
      setConfirmedTxHash(hash);
      setStep("success");
    } catch (e) {
      setError(e?.message || "Failed to submit transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const supportedChains = SUPPORTED_CHAIN_IDS.map((id) => CHAINS[id]);
  const explorerHostFor = (cid) => CHAINS[cid]?.explorer || "";

  return (
    <div
      data-testid="buy-plan-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10 overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent">
          <button data-testid="modal-close-button" onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {step === "success" ? `${plan.name} activated` : `Activate ${plan.name}`}
              </h3>
              <p className="text-xs text-slate-400">
                {step === "success" ? "Pending confirmation on-chain" : "Pay with crypto · Manual on-chain transfer"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {step !== "success" && (
            <>
              {/* Wallet identity */}
              {!wallet.isConnected ? (
                <form onSubmit={handleConnect} className="space-y-2">
                  <p className="text-sm text-slate-400">
                    Enter the wallet address you'll be paying from. We'll use it to track your purchase.
                  </p>
                  <input
                    data-testid="wallet-address-input"
                    type="text"
                    placeholder="0x717e6e1c8539fc91d3a65f7b473fb8809429a5e5"
                    value={walletAddrInput}
                    onChange={(e) => setWalletAddrInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-orange-500/60"
                    autoComplete="off"
                  />
                  <Button
                    data-testid="modal-connect-wallet"
                    type="submit"
                    disabled={wallet.connecting || !walletAddrInput}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-5 font-semibold disabled:opacity-50"
                  >
                    {wallet.connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</> : <><Wallet className="w-4 h-4 mr-2" /> Connect Wallet</>}
                  </Button>
                  {wallet.error && <p className="text-xs text-red-400">{wallet.error}</p>}
                </form>
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Your wallet</p>
                    <p className="font-mono text-sm" data-testid="connected-address">{shortAddress(wallet.address)}</p>
                  </div>
                  <button
                    onClick={wallet.disconnect}
                    className="text-xs px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Network */}
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Select network</p>
                <div className="grid grid-cols-3 gap-2">
                  {supportedChains.map((c) => (
                    <button
                      key={c.id}
                      data-testid={`chain-${c.id}`}
                      onClick={() => setChainId(c.id)}
                      className={`relative px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        chainId === c.id
                          ? "border-orange-500 bg-gradient-to-br from-orange-500/15 to-amber-500/10 text-white"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold">{c.name}</span>
                        <span className="text-[10px] text-slate-500">{c.nativeSymbol}</span>
                      </div>
                      {chainId === c.id && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-950" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token */}
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Pay with</p>
                <div className="grid grid-cols-3 gap-2">
                  {TOKEN_OPTIONS.map((t) => (
                    <button
                      key={t}
                      data-testid={`token-${t.toLowerCase()}`}
                      onClick={() => setTokenType(t)}
                      className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                        tokenType === t
                          ? (t === "NATIVE"
                              ? "border-orange-500 bg-orange-500/10 text-white"
                              : "border-emerald-500 bg-emerald-500/10 text-white")
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {t === "NATIVE" ? selectedChain?.nativeSymbol : t}
                      <span className="text-[10px] text-slate-500 block">
                        {t === "USDT" || t === "USDC" ? "Stablecoin" : "Native"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment instructions */}
              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-300 text-xs uppercase tracking-wider font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  Send manually from your wallet
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Recipient address</p>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                      <code className="flex-1 text-xs font-mono text-white truncate" data-testid="recipient-address">
                        {RECIPIENT_ADDRESS}
                      </code>
                      <button
                        onClick={() => copy(RECIPIENT_ADDRESS, "address")}
                        data-testid="copy-recipient"
                        className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                        title="Copy"
                      >
                        {copiedField === "address" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Amount</p>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                      <code className="flex-1 text-base font-bold text-orange-400" data-testid="pay-amount">
                        {amountValue}
                      </code>
                      <button
                        onClick={() => copy(String(amountNumber), "amount")}
                        data-testid="copy-amount"
                        className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                        title="Copy"
                      >
                        {copiedField === "amount" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500">Network</span>
                    <span className="text-white font-medium">{selectedChain?.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    Use any wallet (MetaMask, Trust Wallet, exchange withdrawal) to send the exact amount on the {selectedChain?.name} network. <strong className="text-amber-300">Do not use a different network</strong> — funds may be lost.
                  </p>
                </div>
              </div>

              {/* TX hash submission */}
              <form onSubmit={handleSubmitTx} className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  Paste transaction hash
                </label>
                <input
                  data-testid="tx-hash-input"
                  type="text"
                  placeholder="0x… (66-character transaction hash)"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-white focus:outline-none focus:border-orange-500/60"
                  autoComplete="off"
                />
                <p className="text-[11px] text-slate-600">
                  Find it in your wallet's "Activity" tab right after sending, or on{" "}
                  <a href={explorerHostFor(chainId)} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">
                    {explorerHostFor(chainId).replace("https://", "")}
                  </a>{" "}
                  by searching your address.
                </p>
                <Button
                  data-testid="modal-submit-tx"
                  type="submit"
                  disabled={!wallet.isConnected || submitting || !txHashInput}
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 py-6 font-bold text-base shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                    : <>I've sent {amountValue} — Activate plan</>}
                </Button>
              </form>
            </>
          )}

          {step === "success" && confirmedTxHash && (
            <div data-testid="activation-view" className="space-y-5 animate-fade-in-up">
              <div className="relative text-center pt-2">
                <div className="absolute inset-x-0 top-0 mx-auto w-32 h-32 bg-green-500/20 rounded-full blur-3xl" />
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40 mb-3">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold mb-1">Activation Pending</h3>
                <p className="text-sm text-slate-400">Your {plan.name} plan will be live once the transaction confirms on-chain.</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-orange-300 mb-1">Estimated confirmation</p>
                  <p className="text-2xl font-bold tabular-nums" data-testid="eta-countdown">{formatEta(secondsLeft)}</p>
                </div>
                <Sparkles className="w-8 h-8 text-amber-400 animate-float-y" />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Transaction hash</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-slate-300 truncate" data-testid="tx-hash">{confirmedTxHash}</code>
                  <button
                    data-testid="copy-tx-hash"
                    onClick={() => copy(confirmedTxHash, "hash")}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                    title="Copy"
                  >
                    {copiedField === "hash" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={explorerTxUrl(chainId, confirmedTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="tx-explorer-link"
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-orange-400"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Your referral code</p>
                    <p className="text-xl font-bold gradient-text-orange" data-testid="referral-code">{referralCode}</p>
                  </div>
                  <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">+5% bonus</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">Share to earn 10% of every friend's first deposit.</p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    data-testid="share-twitter"
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(plan.name, referralCode))}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[#0d1426] border border-slate-800 hover:border-sky-500/50 text-slate-200 text-sm font-medium transition-all"
                  >
                    <Twitter className="w-4 h-4 text-sky-400" /> Share on X
                  </a>
                  <a
                    data-testid="share-telegram"
                    href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&text=${encodeURIComponent(buildShareText(plan.name, referralCode))}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[#102132] border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-sm font-medium transition-all"
                  >
                    <SendIcon className="w-4 h-4 text-cyan-400" /> Share on Telegram
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  data-testid="modal-go-dashboard"
                  onClick={() => { if (typeof onSuccess === "function") onSuccess(); onClose(); }}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-5 font-semibold"
                >
                  Open Dashboard
                </Button>
                <Button data-testid="modal-done-button" variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 py-5 font-semibold">
                  Done
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step !== "success" && (
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              Verify recipient address before paying. Past performance does not guarantee future results.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
