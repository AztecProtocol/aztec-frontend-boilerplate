import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DataProviderWrapper,
  BridgeData,
} from "@aztec/bridge-clients/client-dest/src/client/aztec/data-provider/DataProvider";
import { EthereumProvider, EthersAdapter } from "@aztec/sdk";
import { rogueEthAddressFromString } from "./rogue-eth-address";
import { BridgeClientCache } from "./bridge-client-cache";
import { useProvider } from "wagmi";

interface BridgeDataContextValue {
  bridges: BridgeDataByName | null;
  bridgeClientCache: BridgeClientCache | null;
}

async function initBridgeData(
  provider: EthereumProvider
): Promise<BridgeDataContextValue> {
  // This address is stale - needs updating once the contract has been redeployed.
  const testnetAddress = "0x525b43be6c67d10c73ca06d790b329820a1967b7";
  const dataProvider = DataProviderWrapper.create(
    provider,
    rogueEthAddressFromString(testnetAddress)
  );
  const rollupProviderAddressProm = dataProvider.getRollupProvider();
  const bridgesProm = dataProvider.getBridges();
  const rollupContractAddress = await rollupProviderAddressProm;
  const bridges = await bridgesProm;
  const bridgeClientCache = new BridgeClientCache(
    provider,
    rollupContractAddress,
    bridges
  );
  return { bridges, bridgeClientCache };
}

type BridgeDataByName = Record<string, BridgeData>;

const BridgeDataContext = createContext<BridgeDataContextValue>({
  bridges: null,
  bridgeClientCache: null,
});

export function BridgeDataProvider(props: {
  // provider: EthereumProvider;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState<BridgeDataContextValue>({
    bridges: null,
    bridgeClientCache: null,
  });
  const provider = useProvider();
  // The first provider should be the stable public provider...
  const firstProvider = useRef(provider).current;
  useEffect(() => {
    initBridgeData(new EthersAdapter(firstProvider)).then(setValue);
  }, [firstProvider]);
  return (
    <BridgeDataContext.Provider value={value}>
      {props.children}
    </BridgeDataContext.Provider>
  );
}

export function useBridgeData() {
  return useContext(BridgeDataContext);
}
