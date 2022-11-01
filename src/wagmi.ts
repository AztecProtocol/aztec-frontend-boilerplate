import { createClient, configureChains, Chain } from "wagmi";

import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";

import { MetaMaskConnector } from "wagmi/connectors/metaMask";

const aztecMainnetForkChain: Chain = {
  id: 0xa57ec,
  name: "Aztec Ethereum Mainnet Fork",
  network: "mainnet-fork",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: "https://mainnet-fork.aztec.network:8545" },
};

const { chains, provider, webSocketProvider } = configureChains(
  [aztecMainnetForkChain],
  [
    jsonRpcProvider({
      rpc: () => ({ http: "https://mainnet-fork.aztec.network:8545" }),
    }),
    publicProvider(),
  ]
);

export const wagmiClient = createClient({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains })],
  provider,
  webSocketProvider,
});
