import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AztecSdk,
  createAztecSdk,
  EthereumProvider,
  EthersAdapter,
  SdkFlavour,
} from "@aztec/sdk";
import { useProvider } from "wagmi";

interface SdkContextValue {
  sdk: AztecSdk | null;
}

async function initSdk(provider: EthereumProvider): Promise<SdkContextValue> {
  const sdk = await createAztecSdk(provider, {
    serverUrl: "https://api.aztec.network/aztec-connect-testnet/falafel", // Testnet
    pollInterval: 1000,
    memoryDb: true,
    debug: "bb:*",
    flavour: SdkFlavour.PLAIN,
    minConfirmation: 1, // ETH block confirmations
  });
  return { sdk };
}

const SdkContext = createContext<SdkContextValue>({
  sdk: null,
});

export function SdkProvider(props: { children: React.ReactNode }) {
  const [value, setValue] = useState<SdkContextValue>({ sdk: null });
  const provider = useProvider();
  // The first provider should be the stable public provider...
  const firstProvider = useRef(provider).current;
  useEffect(() => {
    initSdk(new EthersAdapter(firstProvider)).then(setValue);
  }, [firstProvider]);
  return (
    <SdkContext.Provider value={value}>{props.children}</SdkContext.Provider>
  );
}

export function useSdk() {
  return useContext(SdkContext).sdk;
}
