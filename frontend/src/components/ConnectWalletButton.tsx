// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Wallet, LogOut, ChevronDown, Loader2 } from "lucide-react";
import { useWallet, shortAddress, CHAINS } from "../context/WalletContext";

export function ConnectWalletButton({ compact = false }) {
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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

  const hasInjected = typeof window !== "undefined" && !!window.ethereum;

  return (
    <div className="relative" ref={ref}>
      <Button
        data-testid="connect-wallet-button"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={wallet.connecting}
        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25"
      >
        {wallet.connecting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
          : <><Wallet className="w-4 h-4 mr-2" /> Connect Wallet <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" /></>}
      </Button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl p-2 z-50"
          data-testid="wallet-chooser"
        >
          {hasInjected && (
            <button
              data-testid="choose-injected"
              onClick={async () => { setMenuOpen(false); await wallet.connect(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-900 text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">Browser Wallet</div>
                <div className="text-[11px] text-slate-500">MetaMask, Coinbase, Trust (extension)</div>
              </div>
            </button>
          )}
          <button
            data-testid="choose-walletconnect"
            onClick={async () => { setMenuOpen(false); await wallet.connectWalletConnect(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-900 text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-[#3b99fc]/15 border border-[#3b99fc]/40 flex items-center justify-center">
              <svg width="16" height="12" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M8.19 4.84a16.7 16.7 0 0123.62 0l.78.78a.8.8 0 010 1.13l-2.68 2.68a.4.4 0 01-.56 0l-1.07-1.07a11.7 11.7 0 00-16.56 0l-1.15 1.15a.4.4 0 01-.56 0L7.33 6.83a.8.8 0 010-1.13l.86-.86zm29.18 5.44l2.38 2.38a.8.8 0 010 1.13l-10.77 10.77a.8.8 0 01-1.13 0l-7.65-7.65a.2.2 0 00-.28 0l-7.65 7.65a.8.8 0 01-1.13 0L.37 13.79a.8.8 0 010-1.13l2.38-2.38a.8.8 0 011.13 0l7.65 7.65a.2.2 0 00.28 0l7.65-7.65a.8.8 0 011.13 0l7.65 7.65a.2.2 0 00.28 0l7.65-7.65a.8.8 0 011.13 0z" fill="#3b99fc"/>
              </svg>
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium">WalletConnect</div>
              <div className="text-[11px] text-slate-500">Scan QR · 300+ mobile wallets</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
