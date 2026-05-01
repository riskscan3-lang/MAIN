// @ts-nocheck
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { createWalletClient, createPublicClient, custom, http, parseEther, parseUnits } from "viem";
import { mainnet, polygon, bsc } from "viem/chains";

const WalletContext = createContext(undefined);

const PROJECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

const VIEM_CHAINS = { 1: mainnet, 137: polygon, 56: bsc };

// Public RPC endpoints for read-only simulations (server-to-server from publicnode.com)
const RPC_URLS = {
  1:   "https://ethereum-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  56:  "https://bsc-rpc.publicnode.com",
};

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

export const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

export const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "");
export const explorerTxUrl = (chainId, hash) => `${CHAINS[chainId]?.explorer || ""}/tx/${hash}`;

/** Initialize a singleton WalletConnect provider (lazily) */
let _wcProviderPromise = null;
async function getWCProvider() {
  if (_wcProviderPromise) return _wcProviderPromise;
  _wcProviderPromise = EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [1],                // required (optional chains listed separately)
    optionalChains: SUPPORTED_CHAIN_IDS,
    rpcMap: {
      1: "https://ethereum-rpc.publicnode.com",
      137: "https://polygon-bor-rpc.publicnode.com",
      56: "https://bsc-rpc.publicnode.com",
    },
    showQrModal: true,
    qrModalOptions: {
      themeMode: "dark",
      themeVariables: {
        "--wcm-z-index": "10000",
        "--wcm-accent-color": "#f97316",
        "--wcm-background-color": "#0f172a",
      },
    },
    metadata: {
      name: "MONERO RIG",
      description: "Professional cloud mining for Monero — pay with crypto and start earning USDT daily.",
      url: typeof window !== "undefined" ? window.location.origin : "https://monerorig.com",
      icons: ["https://avatars.githubusercontent.com/u/179229932"],
    },
  });
  return _wcProviderPromise;
}

export function WalletProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const injected = typeof window !== "undefined" ? window.ethereum : null;

  // Detect injected wallet first (MetaMask / Trust / Coinbase extension etc.)
  useEffect(() => {
    if (!injected) return;
    (async () => {
      try {
        const accounts = await injected.request({ method: "eth_accounts" });
        if (accounts && accounts[0]) {
          setProvider(injected);
          setAddress(accounts[0]);
          const cid = await injected.request({ method: "eth_chainId" });
          setChainId(parseInt(cid, 16));
        }
      } catch (_) {}
      const onAcc = (accs) => setAddress(accs && accs[0] ? accs[0] : null);
      const onChain = (cid) => setChainId(typeof cid === "string" ? parseInt(cid, 16) : cid);
      injected.on?.("accountsChanged", onAcc);
      injected.on?.("chainChanged", onChain);
      return () => {
        injected.removeListener?.("accountsChanged", onAcc);
        injected.removeListener?.("chainChanged", onChain);
      };
    })();
  }, [injected]);

  const attachProviderListeners = useCallback((p) => {
    p.on("accountsChanged", (accs) => setAddress(accs?.[0] || null));
    p.on("chainChanged", (cid) => setChainId(typeof cid === "string" ? parseInt(cid, 16) : cid));
    p.on("disconnect", () => {
      setAddress(null);
      setChainId(null);
      setProvider(null);
    });
  }, []);

  const connectInjected = useCallback(async () => {
    if (!injected) throw new Error("No injected wallet found");
    const accounts = await injected.request({ method: "eth_requestAccounts" });
    const cid = await injected.request({ method: "eth_chainId" });
    setProvider(injected);
    setAddress(accounts[0]);
    setChainId(parseInt(cid, 16));
  }, [injected]);

  const connectWalletConnect = useCallback(async () => {
    const wc = await getWCProvider();
    await wc.connect();
    attachProviderListeners(wc);
    setProvider(wc);
    setAddress(wc.accounts?.[0] || null);
    setChainId(wc.chainId || null);
  }, [attachProviderListeners]);

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
