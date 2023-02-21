import "./App.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AztecSdk,
  createAztecSdk,
  EthersAdapter,
  EthereumProvider,
  GrumpkinAddress,
  SchnorrSigner,
  EthAddress,
  TxSettlementTime,
  TxId,
  EthereumRpc,
  BarretenbergWasm,
  createIframeAztecWalletProviderServer,
  LegacyKeyStore,
  EIP1193SignClient,
  AztecWalletProviderClient,
  RPC_METHODS,
} from "@aztec/sdk";

// import { depositEthToAztec, registerAccount, aztecConnect } from "./utils.js";
// import { fetchBridgeData } from "./bridge-data.js";

import { createClient, createWeb3Modal } from "./walletConnect.js";

declare var window: any;

const App = () => {
  const [hasMetamask, setHasMetamask] = useState(false);
  const [ethAddress, setEthAddress] = useState<EthAddress | null>(null);
  const [initing, setIniting] = useState(false);
  const [sdk, setSdk] = useState<null | AztecSdk>(null);
  const [account0, setAccount0] = useState<GrumpkinAddress | null>(null);
  const [ethereumRpc, setEthereumRpc] = useState<EthereumRpc | null>(null);
  // const [userExists, setUserExists] = useState<boolean>(false);
  // const [accountPrivateKey, setAccountPrivateKey] = useState<Buffer | null>(
  //   null
  // );
  const [accountPublicKey, setAccountPublicKey] =
    useState<GrumpkinAddress | null>(null);
  // const [spendingSigner, setSpendingSigner] = useState<
  //   SchnorrSigner | undefined
  // >(undefined);
  // const [alias, setAlias] = useState("");
  // const [amount, setAmount] = useState(0);
  // const [txId, setTxId] = useState<TxId | null>(null);

  // Metamask Check
  useEffect(() => {
    if (window.ethereum) {
      setHasMetamask(true);
    }
    window.ethereum.on("accountsChanged", () => window.location.reload());
  }, []);

  async function iframeMain() {
    const ethereumRpc = new EthereumRpc(window.ethereum);
    const [depositor] = await ethereumRpc.getAccounts();
    const wasm = await BarretenbergWasm.new();
    const server = createIframeAztecWalletProviderServer(
      wasm,
      new LegacyKeyStore(window.ethereum, depositor, wasm, [])
    );
    server.run();
  }

  async function connectWallet() {
    try {
      if (window.ethereum) {
        setIniting(true); // Start init status

        // Get Metamask provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const ethereumProvider: EthereumProvider = new EthersAdapter(provider);
        const ethereumRpc = new EthereumRpc(ethereumProvider);
        let [ethAddress] = await ethereumRpc.getAccounts();
        setEthAddress(ethAddress);

        // Get Metamask ethAccount
        // await provider.send("eth_requestAccounts", []);

        // Initialize SDK
        const sdk = await createAztecSdk(ethereumProvider, {
          serverUrl: "http://localhost:8081", // local devnet, run `yarn devnet` to start
          pollInterval: 2000,
          memoryDb: true,
          debug: "bb:*",
          minConfirmation: 1, // ETH block confirmations
        });

        console.log("Aztec SDK initialized:", sdk);
        setSdk(sdk);

        const signClient = await createClient();
        const web3Modal = await createWeb3Modal();
        const aztecChainId = +"671337";
        const chains = [`aztec:${aztecChainId}`];

        const { uri, approval } = await signClient.connect({
          requiredNamespaces: {
            aztec: {
              methods: [],
              chains,
              events: RPC_METHODS,
            },
          },
        });

        await web3Modal.openModal({ uri, standaloneChains: chains });
        const session = await approval();
        web3Modal.closeModal();

        const awpClient = new AztecWalletProviderClient(
          new EIP1193SignClient(signClient, aztecChainId, session)
        );

        const aztecWalletProvider = await awpClient.init();

        // const keyStore = sdk.createLegacyKeyStore(
        //   ethAddress,
        //   [],
        //   ethereumProvider
        // );
        // const aztecWalletProvider = await sdk.createAztecWalletProvider(
        //   keyStore
        // );

        await aztecWalletProvider.connect();
        const accountPublicKey = await sdk.addAccount(aztecWalletProvider);
        setAccountPublicKey(accountPublicKey);

        console.log("Aztec public key:", accountPublicKey);

        sdk.run();
        await sdk.awaitAccountSynchronised(accountPublicKey);

        console.log("Account synced.");

        setIniting(false); // End init status
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function deposit(valueStr: string) {
    const assetId = 0;

    const value = sdk!.toBaseUnits(assetId, valueStr);
    const [, fee] = await sdk!.getDepositFees(assetId);
    const publicInput = value.value + fee.value;
    const [depositor] = await ethereumRpc!.getAccounts();
    const controller = sdk!.createDepositController(
      depositor,
      value,
      fee,
      accountPublicKey!,
      true
    );
    const assetBalance = await sdk!.getPublicBalance(depositor, assetId);
    const pendingBalance = await controller.getPendingFunds();
    if (assetBalance.value + pendingBalance < publicInput) {
      throw new Error("insufficient balance.");
    }
    if (publicInput > pendingBalance) {
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
    }
    await controller.createProofs();
    await controller.sign();
    await controller.send();
  }

  // Registering on Aztec enables the use of intuitive aliases for fund transfers
  // It registers an human-readable alias with the user's privacy & spending keypairs
  // All future funds transferred to the alias would be viewable with the privacy key and spendable with the spending key respectively

  return (
    <div className="App">
      {hasMetamask ? (
        sdk ? (
          <div>
            <button onClick={() => console.log("sdk", sdk)}>Log SDK</button>
            <button onClick={() => iframeMain()}>Connect iframe</button>
          </div>
        ) : (
          <div>
            <button onClick={() => connectWallet()}>Connect Metamask</button>
          </div>
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
