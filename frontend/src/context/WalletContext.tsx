// @ts-nocheck
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  isMetaMaskInstalled,
  requestConnection,
  getAccount,
  getChainId,
  switchChain,
  CHAINS_BY_ID,
} from "../utils/web3";

const WalletContext = createContext(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const refreshState = useCallback(async () => {
    try {
      const acc = await getAccount();
      setAddress(acc);
      if (acc) {
        const cid = await getChainId();
        setChainId(cid);
      } else {
        setChainId(null);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshState();
    if (!isMetaMaskInstalled()) return;

    const onAccounts = (accounts) => {
      setAddress(accounts && accounts[0] ? accounts[0] : null);
    };
    const onChain = (cid) => {
      setChainId(parseInt(cid, 16));
    };

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      try {
        window.ethereum.removeListener("accountsChanged", onAccounts);
        window.ethereum.removeListener("chainChanged", onChain);
      } catch (_) {}
    };
  }, [refreshState]);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const accounts = await requestConnection();
      setAddress(accounts[0]);
      const cid = await getChainId();
      setChainId(cid);
    } catch (e) {
      setError(e.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  const ensureChain = useCallback(async (cid) => {
    if (chainId !== cid) {
      await switchChain(cid);
      setChainId(cid);
    }
  }, [chainId]);

  const isSupportedChain = chainId != null && !!CHAINS_BY_ID[chainId];

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        connecting,
        error,
        isConnected: !!address,
        isSupportedChain,
        connect,
        disconnect,
        ensureChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
