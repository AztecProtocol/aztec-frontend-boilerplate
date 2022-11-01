import "./App.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  EthersAdapter,
  AztecSdkUser,
  GrumpkinAddress,
  SchnorrSigner,
  EthAddress,
  TxSettlementTime,
  TxId,
} from "@aztec/sdk";

import { depositEthToAztec, registerAccount, aztecConnect } from "./utils";
import { fetchBridgeData } from "./bridge-data";
import { useSdk } from "./sdk";
import { useConnect, useSigner } from "wagmi";

declare var window: any;

const App = () => {
  const [hasMetamask, setHasMetamask] = useState(false);
  const [ethAccount, setEthAccount] = useState<EthAddress | null>(null);
  const { connectAsync, connectors } = useConnect();
  const { data: l1Signer } = useSigner();
  const sdk = useSdk();
  const initing = !sdk;
  const [account0, setAccount0] = useState<AztecSdkUser | null>(null);
  const [userExists, setUserExists] = useState<boolean>(false);
  const [accountPrivateKey, setAccountPrivateKey] = useState<Buffer | null>(
    null
  );
  const [accountPublicKey, setAccountPublicKey] =
    useState<GrumpkinAddress | null>(null);
  const [spendingSigner, setSpendingSigner] = useState<
    SchnorrSigner | undefined
  >(undefined);
  const [alias, setAlias] = useState("");
  const [amount, setAmount] = useState(0);
  const [txId, setTxId] = useState<TxId | null>(null);

  // Metamask Check
  useEffect(() => {
    if (window.ethereum) {
      setHasMetamask(true);
    }
    window.ethereum.on("accountsChanged", () => window.location.reload());
  }, []);

  async function connect() {
    const mmConnector = connectors[0];
    if (mmConnector && sdk) {
      const { account: mmAddressStr } = await connectAsync({
        connector: mmConnector,
      });
      // Get Metamask provider
      // TODO: Show error if Metamask is not on Aztec Testnet
      const mmProvider = new EthersAdapter(
        (await mmConnector.getSigner()).provider
      );

      // Get Metamask ethAccount
      const mmAddress = EthAddress.fromString(mmAddressStr);
      setEthAccount(mmAddress);

      // Generate user's privacy keypair
      // The privacy keypair (also known as account keypair) is used for en-/de-crypting values of the user's spendable funds (i.e. balance) on Aztec
      // It can but is not typically used for receiving/spending funds, as the user should be able to share viewing access to his/her Aztec account via sharing his/her privacy private key
      const { publicKey: accPubKey, privateKey: accPriKey } =
        await sdk.generateAccountKeyPair(mmAddress, mmProvider);
      console.log("Privacy Key:", accPriKey);
      console.log("Public Key:", accPubKey.toString());
      setAccountPrivateKey(accPriKey);
      setAccountPublicKey(accPubKey);
      if (await sdk.isAccountRegistered(accPubKey)) setUserExists(true);

      // Get or generate Aztec SDK local user
      let account0 = (await sdk.userExists(accPubKey))
        ? await sdk.getUser(accPubKey)
        : await sdk.addUser(accPriKey);
      setAccount0(account0);

      // Generate user's spending key & signer
      // The spending keypair is used for receiving/spending funds on Aztec
      const { privateKey: spePriKey } = await sdk.generateSpendingKeyPair(
        mmAddress,
        mmProvider
      );
      const schSigner = await sdk?.createSchnorrSigner(spePriKey);
      console.log("Signer:", schSigner);
      setSpendingSigner(schSigner);
    }
  }

  // Registering on Aztec enables the use of intuitive aliases for fund transfers
  // It registers an human-readable alias with the user's privacy & spending keypairs
  // All future funds transferred to the alias would be viewable with the privacy key and spendable with the spending key respectively
  async function registerNewAccount() {
    if (!l1Signer) {
      console.error("Wallet disconnected");
      return;
    }
    try {
      const depositTokenQuantity: bigint = ethers.utils
        .parseEther(amount.toString())
        .toBigInt();

      const txId = await registerAccount(
        accountPublicKey!,
        alias,
        accountPrivateKey!,
        spendingSigner!.getPublicKey(),
        "eth",
        depositTokenQuantity,
        TxSettlementTime.NEXT_ROLLUP,
        ethAccount!,
        sdk!,
        l1Signer
      );

      console.log("Registration TXID:", txId);
      console.log(
        "View TX on Explorer:",
        `https://aztec-connect-testnet-explorer.aztec.network/tx/${txId.toString()}`
      );
      setTxId(txId);
    } catch (e) {
      console.log(e); // e.g. Reject TX
    }
  }

  async function depositEth() {
    if (!l1Signer) {
      console.error("Wallet disconnected");
      return;
    }
    try {
      const depositTokenQuantity: bigint = ethers.utils
        .parseEther(amount.toString())
        .toBigInt();

      let txId = await depositEthToAztec(
        ethAccount!,
        accountPublicKey!,
        depositTokenQuantity,
        TxSettlementTime.NEXT_ROLLUP,
        sdk!,
        l1Signer
      );

      console.log("Deposit TXID:", txId);
      console.log(
        "View TX on Explorer:",
        `https://aztec-connect-testnet-explorer.aztec.network/tx/${txId.toString()}`
      );
      setTxId(txId);
    } catch (e) {
      console.log(e); // e.g. depositTokenQuantity = 0
    }
  }

  async function bridgeCrvLido() {
    try {
      const fromAmount: bigint = ethers.utils
        .parseEther(amount.toString())
        .toBigInt();

      let txId = await aztecConnect(
        account0!,
        spendingSigner!,
        6, // Testnet bridge id of CurveStEthBridge
        fromAmount,
        "ETH",
        "WSTETH",
        undefined,
        undefined,
        1e18, // Min acceptable amount of stETH per ETH
        TxSettlementTime.NEXT_ROLLUP,
        sdk!
      );

      console.log("Bridge TXID:", txId);
      console.log(
        "View TX on Explorer:",
        `https://aztec-connect-testnet-explorer.aztec.network/tx/${txId.toString()}`
      );
      setTxId(txId);
    } catch (e) {
      console.log(e); // e.g. fromAmount > user's balance
    }
  }

  async function logBalance() {
    // Wait for the SDK to read & decrypt notes to get the latest balances
    await account0!.awaitSynchronised();
    console.log(
      "Balance: zkETH -",
      sdk!.fromBaseUnits(
        await sdk!.getBalance(account0!.id, sdk!.getAssetIdBySymbol("eth"))
      ),
      ", wstETH -",
      sdk!.fromBaseUnits(
        await sdk!.getBalance(account0!.id, sdk!.getAssetIdBySymbol("wsteth"))
      )
    );
  }

  async function logBridges() {
    const bridges = await fetchBridgeData();
    console.log("Known bridges on Testnet:", bridges);
  }

  return (
    <div className="App">
      {hasMetamask ? (
        sdk ? (
          <div>
            {userExists ? <div>Welcome back!</div> : ""}
            {spendingSigner && !userExists ? (
              <form>
                <label>
                  Alias:
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                  />
                </label>
              </form>
            ) : (
              ""
            )}
            {spendingSigner ? (
              <div>
                <form>
                  <label>
                    <input
                      type="number"
                      step="0.000000000000000001"
                      min="0.000000000000000001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.valueAsNumber)}
                    />
                    ETH
                  </label>
                </form>
                {!userExists ? (
                  <button onClick={() => registerNewAccount()}>
                    Register Aztec Account
                  </button>
                ) : (
                  ""
                )}
              </div>
            ) : (
              ""
            )}
            {spendingSigner && account0 ? (
              <div>
                <button onClick={() => depositEth()}>Deposit ETH</button>
                <button onClick={() => bridgeCrvLido()}>
                  Swap ETH to wstETH
                </button>
              </div>
            ) : (
              ""
            )}
            {accountPrivateKey ? (
              <button onClick={() => logBalance()}>Log Balance</button>
            ) : (
              ""
            )}
            <button onClick={() => logBridges()}>Log Bridges</button>
            <button onClick={() => console.log("sdk", sdk)}>Log SDK</button>
            {txId ? (
              <div>
                Last TX: {txId.toString()}{" "}
                <a
                  href={`https://aztec-connect-testnet-explorer.aztec.network/tx/${txId.toString()}`}
                >
                  (View on Explorer)
                </a>
              </div>
            ) : (
              ""
            )}
          </div>
        ) : (
          <button onClick={() => connect()}>Connect Metamask</button>
        )
      ) : (
        // TODO: Fix rendering of this. Not rendered, reason unknown.
        "Metamask is not detected. Please make sure it is installed and enabled."
      )}
      {initing ? <div>Initializing Aztec SDK...</div> : ""}
    </div>
  );
};

export default App;
