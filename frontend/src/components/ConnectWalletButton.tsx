// @ts-nocheck
import { useWallet } from "../context/WalletContext";
import { Button } from "./ui/button";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { shortAddress, CHAINS_BY_ID } from "../utils/web3";

export function ConnectWalletButton({ compact = false }) {
  const wallet = useWallet();

  if (wallet.isConnected) {
    const chain = wallet.chainId ? CHAINS_BY_ID[wallet.chainId] : null;
    return (
      <button
        data-testid="connect-wallet-button"
        onClick={wallet.disconnect}
        title="Click to disconnect"
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
        <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400" />
      </button>
    );
  }

  return (
    <Button
      data-testid="connect-wallet-button"
      onClick={wallet.connect}
      disabled={wallet.connecting}
      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25 disabled:opacity-60"
    >
      {wallet.connecting ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
      ) : (
        <><Wallet className="w-4 h-4 mr-2" /> Connect Wallet</>
      )}
    </Button>
  );
}
