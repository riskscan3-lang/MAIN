// @ts-nocheck
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WalletContext = createContext(undefined);

export const SUPPORTED_CHAIN_IDS = [1, 137, 56];

export const CHAINS = {
  1:   { id: 1,   name: "Ethereum", short: "ETH",   nativeSymbol: "ETH",   explorer: "https://etherscan.io" },
  137: { id: 137, name: "Polygon",  short: "MATIC", nativeSymbol: "MATIC", explorer: "https://polygonscan.com" },
  56:  { id: 56,  name: "BSC",      short: "BNB",   nativeSymbol: "BNB",   explorer: "https://bscscan.com" },
};

export const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS;

export const TOKENS = {
  USDT: {
    1:   { address: process.env.REACT_APP_USDT_ETHEREUM, decimals: 6 },
    137: { address: process.env.REACT_APP_USDT_POLYGON,  decimals: 6 },
    56:  { address: process.env.REACT_APP_USDT_BSC,      decimals: 18 },
  },
  USDC: {
    1:   { address: process.env.REACT_APP_USDC_ETHEREUM, decimals: 6 },
    137: { address: process.env.REACT_APP_USDC_POLYGON,  decimals: 6 },
    56:  { address: process.env.REACT_APP_USDC_BSC,      decimals: 18 },
  },
};

export const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "");
export const explorerTxUrl = (chainId, hash) => `${CHAINS[chainId]?.explorer || ""}/tx/${hash}`;

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const isValidAddress = (addr) => typeof addr === "string" && ETH_ADDRESS_RE.test(addr.trim());

const STORAGE_KEY = "monerorig.wallet";

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.address && isValidAddress(data.address)) {
        setAddress(data.address);
        if (data.chainId) setChainId(data.chainId);
      }
    } catch (_) {}
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      if (address) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, chainId }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }, [address, chainId]);

  // Dedupe backend session recording within this tab
  const recordedRef = useRef(new Set());
  const recordSession = useCallback(async (addr, source, cid) => {
    if (!addr) return;
    const key = `${addr.toLowerCase()}::${source}`;
    if (recordedRef.current.has(key)) return;
    recordedRef.current.add(key);
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/wallet-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addr,
          source,
          chain_id: cid || null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
          referrer: typeof document !== "undefined" ? document.referrer.slice(0, 1000) : null,
        }),
      });
    } catch (_) {}
  }, []);

  const connect = useCallback(async (rawAddress, opts = {}) => {
    setError(null);
    setConnecting(true);
    try {
      const addr = (rawAddress || "").trim();
      if (!isValidAddress(addr)) {
        throw new Error("Invalid wallet address. Must be a valid 0x… EVM address.");
      }
      setAddress(addr);
      const cid = opts.chainId || chainId || 1;
      setChainId(cid);
      recordSession(addr, opts.source || "manual", cid);
      return addr;
    } catch (e) {
      setError(e?.message || "Failed to connect wallet");
      throw e;
    } finally {
      setConnecting(false);
    }
  }, [chainId, recordSession]);

  // Backwards-compat alias retained from the old Web3 flow — both buttons in the
  // chooser route to the same paste-address modal now.
  const connectWalletConnect = useCallback(
    async (addr, opts) => connect(addr, { ...(opts || {}), source: opts?.source || "walletconnect" }),
    [connect]
  );

  const disconnect = useCallback(async () => {
    setAddress(null);
    setError(null);
  }, []);

  const ensureChain = useCallback(async (targetChainId) => {
    setChainId(targetChainId);
  }, []);

  const ctx = useMemo(
    () => ({
      address,
      chainId,
      connecting,
      error,
      isConnected: !!address,
      connect,
      connectWalletConnect,
      disconnect,
      ensureChain,
    }),
    [address, chainId, connecting, error, connect, connectWalletConnect, disconnect, ensureChain]
  );

  return <WalletContext.Provider value={ctx}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const c = useContext(WalletContext);
  if (!c) throw new Error("useWallet must be used within WalletProvider");
  return c;
}
