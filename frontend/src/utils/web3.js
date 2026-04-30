// @ts-nocheck
import { createWalletClient, createPublicClient, custom, http, parseEther, parseUnits } from "viem";
import { mainnet, polygon, bsc } from "viem/chains";

export const SUPPORTED_CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    short: "ETH",
    nativeSymbol: "ETH",
    chain: mainnet,
    explorer: "https://etherscan.io",
    usdt: process.env.REACT_APP_ETHEREUM_USDT_ADDRESS,
    color: "from-blue-500 to-indigo-500",
  },
  {
    id: 137,
    name: "Polygon",
    short: "MATIC",
    nativeSymbol: "MATIC",
    chain: polygon,
    explorer: "https://polygonscan.com",
    usdt: process.env.REACT_APP_POLYGON_USDT_ADDRESS,
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    id: 56,
    name: "BSC",
    short: "BNB",
    nativeSymbol: "BNB",
    chain: bsc,
    explorer: "https://bscscan.com",
    usdt: process.env.REACT_APP_BSC_USDT_ADDRESS,
    color: "from-yellow-500 to-amber-500",
  },
];

export const CHAINS_BY_ID = Object.fromEntries(SUPPORTED_CHAINS.map((c) => [c.id, c]));

export const RECIPIENT_ADDRESS = process.env.REACT_APP_RECIPIENT_ADDRESS;

const USDT_ABI = [
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

export const isMetaMaskInstalled = () => {
  return typeof window !== "undefined" && !!window.ethereum;
};

export const requestConnection = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts;
};

export const getAccount = async () => {
  if (!isMetaMaskInstalled()) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || null;
};

export const getChainId = async () => {
  if (!isMetaMaskInstalled()) return null;
  const id = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(id, 16);
};

export const switchChain = async (chainId) => {
  const hex = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
  } catch (err) {
    if (err && (err.code === 4902 || err.code === -32603)) {
      const c = CHAINS_BY_ID[chainId];
      if (c) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hex,
              chainName: c.chain.name,
              rpcUrls: [c.chain.rpcUrls.default.http[0]],
              nativeCurrency: c.chain.nativeCurrency,
              blockExplorerUrls: [c.explorer],
            },
          ],
        });
        return;
      }
    }
    throw err;
  }
};

const getWalletClient = (chainId) => {
  const c = CHAINS_BY_ID[chainId];
  if (!c) throw new Error(`Unsupported chain: ${chainId}`);
  return createWalletClient({ chain: c.chain, transport: custom(window.ethereum) });
};

const getPublicClient = (chainId) => {
  const c = CHAINS_BY_ID[chainId];
  if (!c) throw new Error(`Unsupported chain: ${chainId}`);
  return createPublicClient({ chain: c.chain, transport: http() });
};

export const sendNative = async ({ chainId, recipient, amountInDecimal }) => {
  const wallet = getWalletClient(chainId);
  const [account] = await wallet.getAddresses();
  const hash = await wallet.sendTransaction({
    account,
    to: recipient,
    value: parseEther(String(amountInDecimal)),
  });
  return hash;
};

export const sendUSDT = async ({ chainId, recipient, amountInDecimal }) => {
  const c = CHAINS_BY_ID[chainId];
  if (!c?.usdt) throw new Error(`USDT not configured on chain ${chainId}`);
  const wallet = getWalletClient(chainId);
  const pub = getPublicClient(chainId);
  const [account] = await wallet.getAddresses();
  const amount = parseUnits(String(amountInDecimal), 6); // USDT uses 6 decimals on ETH/Polygon. BSC USDT uses 18 — handled below.
  const finalAmount = chainId === 56 ? parseUnits(String(amountInDecimal), 18) : amount;

  const { request } = await pub.simulateContract({
    account,
    address: c.usdt,
    abi: USDT_ABI,
    functionName: "transfer",
    args: [recipient, finalAmount],
  });
  const hash = await wallet.writeContract(request);
  return hash;
};

export const explorerTxUrl = (chainId, hash) => {
  const c = CHAINS_BY_ID[chainId];
  if (!c) return "#";
  return `${c.explorer}/tx/${hash}`;
};

export const shortAddress = (addr) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};
