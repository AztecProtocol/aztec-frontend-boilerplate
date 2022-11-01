import { BridgeData } from "@aztec/bridge-clients/client-dest/src/client/aztec/data-provider/DataProvider";
import { BridgeDataFieldGetters } from "@aztec/bridge-clients/client-dest/src/client/bridge-data";
import { CurveStethBridgeData } from "@aztec/bridge-clients/client-dest/src/client/curve/curve-steth/curve-bridge-data";
import { DCABridgeData } from "@aztec/bridge-clients/client-dest/src/client/dca/dca-bridge-data";
import { EulerBridgeData } from "@aztec/bridge-clients/client-dest/src/client/euler/euler-bridge-data";
import { ElementBridgeData } from "@aztec/bridge-clients/client-dest/src/client/element/element-bridge-data";
import { YearnBridgeData } from "@aztec/bridge-clients/client-dest/src/client/yearn/yearn-bridge-data";
import { EthereumProvider } from "@aztec/sdk";
import {
  RogueEthAddress,
  rogueEthAddressFromString,
} from "./rogue-eth-address";

type BridgeDataByName = Record<string, BridgeData>;

interface BuildArgs {
  provider: EthereumProvider;
  rollupContractAddress: RogueEthAddress;
  bridges: BridgeDataByName;
  falafelGraphQlEndpoint: string;
}

const clientBuilders = {
  "curve-lido": (args: BuildArgs) => {
    const curvePoolAddress = "0xdc24316b9ae028f1497c275eb9192a3ea0f67022";
    const wstETHAddress = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
    const lidoOracleAddress = "0x442af784A788A5bd6F42A01Ebe9F287a871243fb";
    return CurveStethBridgeData.create(
      args.provider,
      rogueEthAddressFromString(wstETHAddress),
      rogueEthAddressFromString(lidoOracleAddress),
      rogueEthAddressFromString(curvePoolAddress)
    );
  },

  dca: (args: BuildArgs) =>
    DCABridgeData.create(args.provider, args.bridges["DCA400K"].bridgeAddress),

  euler: (args: BuildArgs) => {
    const lidoOracleAddress = "0x442af784A788A5bd6F42A01Ebe9F287a871243fb";
    return EulerBridgeData.createWithLido(
      args.provider,
      rogueEthAddressFromString(lidoOracleAddress)
    );
  },

  element: (args: BuildArgs) => {
    const balancerAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    return ElementBridgeData.create(
      args.provider,
      args.bridges["ElementBridge"].bridgeAddress,
      rogueEthAddressFromString(balancerAddress),
      args.rollupContractAddress,
      args.falafelGraphQlEndpoint
    );
  },

  yearn: (args: BuildArgs) =>
    YearnBridgeData.create(args.provider, args.rollupContractAddress as any),
};

export type BridgeClientName = keyof typeof clientBuilders;
export class BridgeClientCache {
  private clients = new Map<BridgeClientName, BridgeDataFieldGetters | null>();
  private falafelGraphQlEndpoint =
    "https://api.aztec.network/aztec-connect-testnet/falafel/graphql";
  constructor(
    private provider: EthereumProvider,
    private rollupContractAddress: RogueEthAddress,
    private bridges: BridgeDataByName
  ) {}

  get(name: BridgeClientName) {
    if (!this.clients.has(name)) {
      this.clients.set(
        name,
        clientBuilders[name]({
          provider: this.provider,
          rollupContractAddress: this.rollupContractAddress,
          bridges: this.bridges,
          falafelGraphQlEndpoint: this.falafelGraphQlEndpoint,
        })
      );
    }
    return this.clients.get(name)!;
  }
}
