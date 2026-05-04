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
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  parseUnits,
} from "viem";
import { mainnet, polygon, bsc } from "viem/chains";

const WalletContext = createContext(undefined);

export const SUPPORTED_CHAIN_IDS = [1, 137, 56];

// Public RPCs (publicnode.com is generous & does not aggressively rate-limit
// the preview environment the way default Cloudflare endpoints do).
export const RPC_URLS = {
  1:   "https://ethereum-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  56:  "https://bsc-rpc.publicnode.com",
};

export const VIEM_CHAINS = {
  1: { ...mainnet,  rpcUrls: { default: { http: [RPC_URLS[1]]   } } },
  137: { ...polygon, rpcUrls: { default: { http: [RPC_URLS[137]] } } },
  56: { ...bsc,     rpcUrls: { default: { http: [RPC_URLS[56]]  } } },
};

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

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

export const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "");
export const explorerTxUrl = (chainId, hash) => `${CHAINS[chainId]?.explorer || ""}/tx/${hash}`;

// Lazily initialise the WalletConnect Ethereum provider so we don't pay the
// cost on first paint.
let _wcProviderPromise = null;
const getWCProvider = async () => {
  if (_wcProviderPromise) return _wcProviderPromise;
  _wcProviderPromise = (async () => {
    const { default: EthereumProvider } = await import("@walletconnect/ethereum-provider");
    const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;
    return EthereumProvider.init({
      projectId,
      chains: [1],
      optionalChains: [137, 56],
      showQrModal: true,
      rpcMap: { 1: RPC_URLS[1], 137: RPC_URLS[137], 56: RPC_URLS[56] },
      metadata: {
        name: "MONERO RIG",
        description: "Cloud mining for Monero — connect your wallet to start earning.",
        url: typeof window !== "undefined" ? window.location.origin : "https://monerorig.com",
        icons: [],
      },
    });
  })();
  return _wcProviderPromise;
};

export function WalletProvider({ children }) {
  const [provider, setProvider] = useState(null);  // active EIP-1193 provider
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const injected = typeof window !== "undefined" ? window.ethereum : null;

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

  const attachProviderListeners = useCallback((p) => {
    if (!p || typeof p.on !== "function") return;
    p.on("accountsChanged", (accs) => setAddress(accs?.[0] || null));
    p.on("chainChanged", (cid) => setChainId(parseInt(cid, 16)));
    p.on("disconnect", () => {
      setAddress(null);
      setChainId(null);
      setProvider(null);
    });
  }, []);

  // Eagerly check existing injected connections AND restore prior WalletConnect sessions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Injected (MetaMask etc) — check eth_accounts
      if (injected) {
        try {
          const accounts = await injected.request({ method: "eth_accounts" });
          if (cancelled) return;
          if (accounts?.length) {
            const cid = await injected.request({ method: "eth_chainId" });
            setProvider(injected);
            setAddress(accounts[0]);
            setChainId(parseInt(cid, 16));
            attachProviderListeners(injected);
            recordSession(accounts[0], "injected", parseInt(cid, 16));
            return;
          }
        } catch (_) {}
      }
      // 2. WalletConnect v2 — restore active session from local storage
      try {
        const wc = await getWCProvider();
        if (cancelled) return;
        // EthereumProvider auto-restores its own session; we just need to read state
        if (wc.accounts?.length || wc.session) {
          let addr = wc.accounts?.[0] || null;
          if (!addr) {
            try {
              const accs = await wc.request({ method: "eth_accounts" });
              addr = accs?.[0] || null;
            } catch (_) {}
          }
          if (addr) {
            attachProviderListeners(wc);
            setProvider(wc);
            setAddress(addr);
            setChainId(wc.chainId || null);
            recordSession(addr, "walletconnect", wc.chainId || null);
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [injected, attachProviderListeners, recordSession]);

  const connectInjected = useCallback(async () => {
    if (!injected) throw new Error("No injected wallet found");
    const accounts = await injected.request({ method: "eth_requestAccounts" });
    const cid = await injected.request({ method: "eth_chainId" });
    const chainIdNum = parseInt(cid, 16);
    setProvider(injected);
    setAddress(accounts[0]);
    setChainId(chainIdNum);
    attachProviderListeners(injected);
    recordSession(accounts[0], "injected", chainIdNum);
  }, [injected, attachProviderListeners, recordSession]);

  const connectWalletConnect = useCallback(async () => {
    const wc = await getWCProvider();
    // Listen for the URI event so we can show a clearer error if user closes the modal
    let modalClosed = false;
    const onModalClose = () => { modalClosed = true; };
    if (typeof wc.on === "function") wc.on("display_uri", () => {});
    if (wc.modal && typeof wc.modal.subscribeModal === "function") {
      wc.modal.subscribeModal((state) => {
        if (state && state.open === false) onModalClose();
      });
    }

    await wc.connect();

    // After connect resolves, accounts and chainId may take a moment to populate.
    // Try several strategies in order of reliability.
    let addr = wc.accounts?.[0] || null;
    if (!addr && wc.session?.namespaces?.eip155?.accounts?.length) {
      const caip = wc.session.namespaces.eip155.accounts[0]; // "eip155:1:0xabc..."
      addr = caip.split(":").pop() || null;
    }
    if (!addr) {
      try {
        const accs = await wc.request({ method: "eth_accounts" });
        addr = accs?.[0] || null;
      } catch (_) {}
    }
    if (!addr) {
      throw new Error(modalClosed ? "Connection cancelled" : "Could not read wallet accounts after connect");
    }

    let cid = wc.chainId || null;
    if (!cid) {
      try {
        const chainHex = await wc.request({ method: "eth_chainId" });
        cid = chainHex ? parseInt(chainHex, 16) : null;
      } catch (_) {}
    }

    attachProviderListeners(wc);
    setProvider(wc);
    setAddress(addr);
    setChainId(cid);
    recordSession(addr, "walletconnect", cid);
  }, [attachProviderListeners, recordSession]);

  /** Open chooser: if injected exists, prefer it; else WalletConnect */
  const connect = useCallback(async ({ forceWalletConnect = false } = {}) => {
    setError(null);
    setConnecting(true);
    try {
      if (!forceWalletConnect && injected) {
        await connectInjected();
      } else {
        await connectWalletConnect();
      }
    } catch (e) {
      setError(e?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, [injected, connectInjected, connectWalletConnect]);

  const disconnect = useCallback(async () => {
    try {
      if (provider && typeof provider.disconnect === "function") {
        await provider.disconnect();
      }
    } catch (_) {}
    setProvider(null);
    setAddress(null);
    setChainId(null);
  }, [provider]);

  const ensureChain = useCallback(async (targetChainId) => {
    if (!provider) throw new Error("Wallet not connected");
    if (chainId === targetChainId) return;
    const hex = `0x${targetChainId.toString(16)}`;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      setChainId(targetChainId);
    } catch (err) {
      if (err?.code === 4902 || err?.code === -32603) {
        const chain = VIEM_CHAINS[targetChainId];
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hex,
            chainName: chain.name,
            rpcUrls: [chain.rpcUrls.default.http[0]],
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: [CHAINS[targetChainId].explorer],
          }],
        });
        setChainId(targetChainId);
        return;
      }
      throw err;
    }
  }, [provider, chainId]);

  const sendNative = useCallback(async ({ chainId: target, recipient, amount }) => {
    const wallet = createWalletClient({ chain: VIEM_CHAINS[target], transport: custom(provider) });
    const [account] = await wallet.getAddresses();
    return wallet.sendTransaction({
      account,
      to: recipient,
      value: parseEther(String(amount)),
    });
  }, [provider]);

  const sendERC20 = useCallback(async ({ chainId: target, tokenType, recipient, amount }) => {
    const token = TOKENS[tokenType]?.[target];
    if (!token?.address) throw new Error(`${tokenType} not configured on chain ${target}`);
    const wallet = createWalletClient({ chain: VIEM_CHAINS[target], transport: custom(provider) });
    const pub = createPublicClient({ chain: VIEM_CHAINS[target], transport: http(RPC_URLS[target]) });
    const [account] = await wallet.getAddresses();
    const value = parseUnits(String(amount), token.decimals);
    // Try simulate (for pre-flight balance/allowance checks); if the read-only RPC is
    // unreachable we fall back to writing the contract directly — the wallet itself
    // will still reject insufficient balance.
    try {
      const { request } = await pub.simulateContract({
        account,
        address: token.address,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient, value],
      });
      return wallet.writeContract(request);
    } catch (simErr) {
      console.warn("simulateContract failed, sending directly via wallet", simErr);
      return wallet.writeContract({
        account,
        address: token.address,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [recipient, value],
        chain: VIEM_CHAINS[target],
      });
    }
  }, [provider]);

  const ctx = useMemo(() => ({
    provider,
    address,
    chainId,
    connecting,
    error,
    isConnected: !!address,
    connect,
    connectWalletConnect: () => connect({ forceWalletConnect: true }),
    disconnect,
    ensureChain,
    sendNative,
    sendERC20,
  }), [provider, address, chainId, connecting, error, connect, disconnect, ensureChain, sendNative, sendERC20]);

  return <WalletContext.Provider value={ctx}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const c = useContext(WalletContext);
  if (!c) throw new Error("useWallet must be used within WalletProvider");
  return c;
}
