import "./App.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AztecSdk,
  createAztecSdk,
  EthersAdapter,
  EthereumProvider,
  SdkFlavour,
  AztecSdkUser,
  GrumpkinAddress,
  SchnorrSigner,
  EthAddress,
  TxSettlementTime,
  TxId,
} from "@aztec/sdk";

import { depositEthToAztec, registerAccount, aztecConnect } from "./utils.js";

declare var window: any;

const App = () => {
  const [hasMetamask, setHasMetamask] = useState(false);
  const [ethAccount, setEthAccount] = useState<EthAddress | null>(null);
  const [initing, setIniting] = useState(false);
  const [sdk, setSdk] = useState<null | AztecSdk>(null);
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
    try {
      if (window.ethereum) {
        setIniting(true); // Start init status

        // Get Metamask provider
        // TODO: Show error if Metamask is not on Aztec Testnet
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const ethereumProvider: EthereumProvider = new EthersAdapter(provider);

        // Get Metamask ethAccount
        await provider.send("eth_requestAccounts", []);
        const mmSigner = provider.getSigner();
        const mmAddress = EthAddress.fromString(await mmSigner.getAddress());
        setEthAccount(mmAddress);

        // Initialize SDK
        const sdk = await createAztecSdk(ethereumProvider, {
          serverUrl: "https://api.aztec.network/aztec-connect-dev/falafel", // Testnet
          pollInterval: 1000,
          // memoryDb: true,
          debug: "bb:*",
          flavour: SdkFlavour.PLAIN,
          minConfirmation: 1, // ETH block confirmations
        });
        await sdk.run();
        console.log("Aztec SDK initialized:", sdk);
        setSdk(sdk);

        // Generate user's privacy keypair
        // The privacy keypair (also known as account keypair) is used for en-/de-crypting values of the user's spendable funds (i.e. balance) on Aztec
        // It can but is not typically used for receiving/spending funds, as the user should be able to share viewing access to his/her Aztec account via sharing his/her privacy private key
        const { publicKey: accPubKey, privateKey: accPriKey } =
          await sdk.generateAccountKeyPair(mmAddress);
        console.log("Public Key:", accPubKey.toString());
        setAccountPrivateKey(accPriKey);
        setAccountPublicKey(accPubKey);
        if (await sdk.isAccountRegistered(accPubKey)) setUserExists(true);

        // Get or generate Aztec SDK local user
        let account0 = (await sdk.userExists(accPubKey))
          ? await sdk.getUser(accPubKey)
          : await sdk.addUser(accPriKey);
        setAccount0(account0);

        setIniting(false); // End init status
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function getHistory() {
    let txs = await sdk!.getUserTxs(accountPublicKey!);
    let rows = [["userId", "txId", "created", "settled", "Tx Type"]];
    txs.map((tx) => {
      let txType = "";
      switch (tx.proofId) {
        case 1:
          txType = "Deposit";
          break;
        case 2:
          txType = "Withdrawal";
          break;
        case 3:
          txType = "Send";
          break;
        case 4:
          txType = "Account";
          break;
        case 5:
          txType = "Defi Deposit";
          break;
        case 6:
          txType = "Defi Claim";
          break;
      }
      rows.push([
        tx.userId.toString(),
        tx.txId!.toString(),
        tx.created!.toDateString(),
        tx.settled!.toDateString(),
        txType
      ]);
    });
    let csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    var encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  return (
    <div className="App">
      {hasMetamask ? (
        sdk ? (
          <div>
            {userExists ? <div>Welcome back!</div> : ""}
            <button onClick={() => getHistory()}>
              Download transaction history
            </button>
          </div>
        ) : (
          <button onClick={() => connect()}>Connect Metamask</button>
        )
      ) : (
        // TODO: Fix rendering of this. Not rendered, reason unknown.
        "Metamask is not detected. Please make sure it is installed and enabled."
      )}
      {initing ? <div>Initializing...</div> : ""}
    </div>
  );
};

export default App;
