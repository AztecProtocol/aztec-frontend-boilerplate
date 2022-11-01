import { UnderlyingAsset } from "@aztec/bridge-clients/client-dest/src/client/bridge-data";
import { EthAddress } from "@aztec/sdk";

// Annoying redeclation of EthAddress class resulting from double download of @aztec/barretenberg
export type RogueEthAddress = UnderlyingAsset["address"];

export function rogueEthAddressFromString(str: string) {
  return EthAddress.fromString(str) as unknown as RogueEthAddress;
}

export function toRogue(ethAddress: EthAddress): RogueEthAddress {
  return ethAddress as unknown as RogueEthAddress;
}
