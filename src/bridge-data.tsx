import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DataProviderWrapper,
  BridgeData,
} from "./bridge-clients/client/aztec/data-provider/DataProvider.js";
import { EthAddress, JsonRpcProvider } from "@aztec/sdk";

export async function fetchBridgeData() {
  const provider = new JsonRpcProvider("http://localhost:8545");
  const testnetAddress = EthAddress.fromString(
    "0x773330693cb7d5D233348E25809770A32483A940"
  );
  const dataProvider = DataProviderWrapper.create(
    provider,
    testnetAddress as any
  );
  const bridges = await dataProvider.getBridges();
  return bridges;
}

type BridgeDataByName = Record<string, BridgeData>;

interface BridgeDataContextValue {
  bridges: BridgeDataByName | null;
}

const BridgeDataContext = createContext<BridgeDataContextValue>({
  bridges: null,
});

export function BridgeDataProvider(props: { children: React.ReactNode }) {
  const [bridges, setBridges] = useState<BridgeDataByName | null>(null);
  useEffect(() => {
    fetchBridgeData().then(setBridges);
  }, []);
  return (
    <BridgeDataContext.Provider value={{ bridges }}>
      {props.children}
    </BridgeDataContext.Provider>
  );
}

export function useBridgeData() {
  return useContext(BridgeDataContext).bridges;
}
