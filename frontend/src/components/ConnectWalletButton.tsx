// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Wallet, LogOut, Loader2, X, Info } from "lucide-react";
import { useWallet, shortAddress, CHAINS } from "../context/WalletContext";

export function ConnectWalletButton({ compact = false }) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState("");
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setAddr("");
      setLocalError(null);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLocalError(null);
    try {
      await wallet.connect(addr, { source: "header" });
      setOpen(false);
    } catch (err) {
      setLocalError(err?.message || "Failed to connect");
    }
  };

  if (wallet.isConnected) {
    const chain = wallet.chainId ? CHAINS[wallet.chainId] : null;
    return (
      <div className="flex items-center gap-2">
        <button
          data-testid="connect-wallet-button"
          title="Connected wallet"
          className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-orange-500/30 hover:border-orange-500/60 transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-mono text-xs text-orange-300">{shortAddress(wallet.address)}</span>
          {chain && !compact && (
            <span className="text-[10px] uppercase tracking-wider text-slate-500 hidden xl:inline">
              {chain.short}
            </span>
          )}
        </button>
        <button
          onClick={wallet.disconnect}
          title="Disconnect"
          data-testid="disconnect-wallet"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Button
        data-testid="connect-wallet-button"
        onClick={() => setOpen(true)}
        disabled={wallet.connecting}
        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25"
      >
        {wallet.connecting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
          : <><Wallet className="w-4 h-4 mr-2" /> Connect Wallet</>}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-testid="connect-modal"
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Connect your wallet</h3>
                  <p className="text-[11px] text-slate-500">Paste your EVM address to identify yourself</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-2">
                  Wallet address
                </label>
                <input
                  ref={inputRef}
                  data-testid="header-wallet-address-input"
                  type="text"
                  placeholder="0x717e6e1c8539fc91d3a65f7b473fb8809429a5e5"
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-orange-500/60"
                  autoComplete="off"
                />
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5">
                <Info className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>
                  Your address is used as your identity to track plan purchases and activity. We never request a signature or move funds — payments are sent manually from your wallet.
                </span>
              </div>

              {(localError || wallet.error) && (
                <p className="text-xs text-red-400">{localError || wallet.error}</p>
              )}

              <Button
                data-testid="header-connect-submit"
                type="submit"
                disabled={wallet.connecting || !addr}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-5 font-semibold disabled:opacity-50"
              >
                {wallet.connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</> : "Connect"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
