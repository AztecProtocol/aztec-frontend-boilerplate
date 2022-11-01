import { AssetValue } from "@aztec/sdk";
import { useEffect, useState } from "react";
import { useSdk } from "../sdk";
import { BridgeClientName } from "./bridge-client-cache";
import { useBridgeData } from "./bridge-data";
import { toBridgeDataAsset } from "./bridge-data-util";

interface ExpectedOutputHookState {
  isLoading: boolean;
  output: {
    valueA: AssetValue;
    valueB: AssetValue | null;
  } | null;
}

export function useExpectedOutput(args: {
  clientName: BridgeClientName;
  skip?: boolean;
  arguments?: {
    inputAssetIdA: number;
    inputAssetIdB: null;
    outputAssetIdA: number;
    outputAssetIdB: null;
    auxData: number;
    inputValue: bigint;
  };
}) {
  const sdk = useSdk();
  const { bridgeClientCache } = useBridgeData();
  const [state, setState] = useState<ExpectedOutputHookState>({
    isLoading: true,
    output: null,
  });
  useEffect(() => {
    if (!sdk) return;
    if (args.skip) return;
    const client = bridgeClientCache?.get(args.clientName);
    if (!client) return;
    if (!args.arguments) {
      console.error("Missing arguments for useExpectedOutput");
      return;
    }
    if (!client.getExpectedOutput) {
      console.error(`Can't use '${args.clientName}' with useExpectedOutput`);
      return;
    }
    const {
      inputAssetIdA,
      inputAssetIdB,
      outputAssetIdA,
      outputAssetIdB,
      auxData,
      inputValue,
    } = args.arguments;
    setState({ isLoading: true, output: null });
    client
      .getExpectedOutput(
        toBridgeDataAsset(sdk, inputAssetIdA),
        toBridgeDataAsset(sdk, inputAssetIdB),
        toBridgeDataAsset(sdk, outputAssetIdA),
        toBridgeDataAsset(sdk, outputAssetIdB),
        auxData,
        inputValue
      )
      .then((values) => {
        const valueA = { assetId: outputAssetIdA, value: values[0] };
        const valueB =
          outputAssetIdB === null
            ? null
            : { assetId: outputAssetIdA, value: values[1] };
        setState({ isLoading: false, output: { valueA, valueB } });
      });
  }, [
    sdk,
    bridgeClientCache,
    args.clientName,
    args.skip,
    args.arguments?.inputAssetIdA,
    args.arguments?.outputAssetIdA,
    args.arguments?.auxData,
    args.arguments?.inputValue,
  ]);
  return state;
}
