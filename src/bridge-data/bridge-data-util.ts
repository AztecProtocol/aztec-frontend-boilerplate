import {
  AztecAssetType,
  AztecAsset,
} from "@aztec/bridge-clients/client-dest/src/client/bridge-data";
import { AztecSdk, EthAddress } from "@aztec/sdk";
import { toRogue } from "./rogue-eth-address";

export function toBridgeDataAsset(
  sdk: AztecSdk,
  assetId: number | null
): AztecAsset {
  if (assetId === null) return UNUSED_BRIDGE_DATA_ASSET;
  const asset = sdk.getAssetInfo(assetId);
  const assetType = assetId === 0 ? AztecAssetType.ETH : AztecAssetType.ERC20;
  return {
    id: assetId,
    assetType,
    erc20Address: toRogue(asset.address),
  };
}

const UNUSED_BRIDGE_DATA_ASSET: AztecAsset = {
  id: 0,
  assetType: AztecAssetType.NOT_USED,
  erc20Address: toRogue(EthAddress.ZERO),
};
