// @ts-nocheck
import { useState, useMemo } from "react";
import { Wallet, Loader2, ExternalLink, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";
import { useWallet } from "../context/WalletContext";
import {
  SUPPORTED_CHAINS,
  RECIPIENT_ADDRESS,
  sendNative,
  sendUSDT,
  explorerTxUrl,
  shortAddress,
} from "../utils/web3";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Approximate USDT-equivalent per plan; native amounts are tiny dev-friendly defaults
const PLAN_PRICING = {
  1: { name: "Starter", usdt: 2499, native: 0.001 },
  2: { name: "Professional", usdt: 4999, native: 0.002 },
  3: { name: "Enterprise", usdt: 8499, native: 0.003 },
};

export function BuyPlanModal({ planId, onClose }) {
  const wallet = useWallet();
  const [chainId, setChainId] = useState(1);
  const [tokenType, setTokenType] = useState("USDT"); // 'USDT' | 'NATIVE'
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const plan = PLAN_PRICING[planId] || PLAN_PRICING[2];
  const selectedChain = useMemo(() => SUPPORTED_CHAINS.find((c) => c.id === chainId), [chainId]);
  const amount = tokenType === "USDT" ? plan.usdt : plan.native;
  const amountLabel = tokenType === "USDT" ? `${plan.usdt} USDT` : `${plan.native} ${selectedChain?.nativeSymbol}`;

  const handleConnect = async () => {
    setError(null);
    await wallet.connect();
  };

  const handlePay = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await wallet.ensureChain(chainId);

      let hash;
      if (tokenType === "NATIVE") {
        hash = await sendNative({ chainId, recipient: RECIPIENT_ADDRESS, amountInDecimal: plan.native });
      } else {
        hash = await sendUSDT({ chainId, recipient: RECIPIENT_ADDRESS, amountInDecimal: plan.usdt });
      }

      setTxHash(hash);

      // Record on backend
      try {
        await fetch(`${API}/purchases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: String(planId),
            plan_name: plan.name,
            buyer_address: wallet.address,
            amount: String(amount),
            chain: chainId,
            tx_hash: hash,
            token_type: tokenType,
          }),
        });
      } catch (e) {
        // non-blocking
        console.warn("Backend record failed", e);
      }
    } catch (e) {
      setError(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="buy-plan-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent">
          <button
            data-testid="modal-close-button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Activate {plan.name}</h3>
              <p className="text-xs text-slate-400">Pay with crypto · Instant activation</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Wallet */}
          {!wallet.isConnected ? (
            <div>
              <p className="text-sm text-slate-400 mb-3">Connect your wallet to continue</p>
              <Button
                data-testid="modal-connect-wallet"
                onClick={handleConnect}
                disabled={wallet.connecting}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-6 font-semibold"
              >
                {wallet.connecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
                ) : (
                  <><Wallet className="w-4 h-4 mr-2" /> Connect MetaMask</>
                )}
              </Button>
              {wallet.error && (
                <p className="text-xs text-red-400 mt-2">{wallet.error}</p>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Connected wallet</p>
                <p className="font-mono text-sm" data-testid="connected-address">{shortAddress(wallet.address)}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Live</span>
            </div>
          )}

          {/* Step 2: Chain selector */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Select network</p>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_CHAINS.map((c) => (
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
                  {chainId === c.id && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-950" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Token */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Pay with</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="token-usdt"
                onClick={() => setTokenType("USDT")}
                className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  tokenType === "USDT"
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                }`}
              >
                USDT <span className="text-[10px] text-slate-500 block">Stablecoin</span>
              </button>
              <button
                data-testid="token-native"
                onClick={() => setTokenType("NATIVE")}
                className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  tokenType === "NATIVE"
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                }`}
              >
                {selectedChain?.nativeSymbol} <span className="text-[10px] text-slate-500 block">Native</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Plan</span>
              <span className="text-white font-medium">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Network</span>
              <span className="text-white font-medium">{selectedChain?.name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Recipient</span>
              <span className="font-mono text-xs text-white">{shortAddress(RECIPIENT_ADDRESS)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
              <span className="text-slate-400">You pay</span>
              <span className="text-lg font-bold text-orange-400" data-testid="pay-amount">{amountLabel}</span>
            </div>
          </div>

          {/* CTA */}
          {txHash ? (
            <div data-testid="tx-success" className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <CheckCircle2 className="w-5 h-5" /> Transaction submitted
              </div>
              <p className="text-xs text-slate-400 mb-2 break-all font-mono">{txHash}</p>
              <a
                href={explorerTxUrl(chainId, txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm"
              >
                View on explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <Button
              data-testid="modal-pay-button"
              onClick={handlePay}
              disabled={!wallet.isConnected || submitting}
              className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 py-6 font-bold text-base shadow-lg shadow-orange-500/30 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Awaiting confirmation…</>
              ) : (
                <>Pay {amountLabel}</>
              )}
            </Button>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            Demo flow. Verify recipient address before paying. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
