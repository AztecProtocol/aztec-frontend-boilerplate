import "./App.css";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AztecSdk,
  createAztecSdk,
  EthersAdapter,
  EthereumProvider,
  GrumpkinAddress,
  EthAddress,
  EthereumRpc,
  EIP1193SignClient,
  AztecWalletProviderClient,
  RPC_METHODS,
  ProofRequestOptions,
  GetFeesOptions,
} from "@aztec/sdk";

import { createClient, createWeb3Modal } from "./walletConnect.js";

declare var window: any;

const App = () => {
  const [hasMetamask, setHasMetamask] = useState(false);
  const [ethAddress, setEthAddress] = useState<EthAddress | null>(null);
  const [initing, setIniting] = useState(false);
  const [sdk, setSdk] = useState<null | AztecSdk>(null);
  const [accountPublicKey, setAccountPublicKey] =
    useState<GrumpkinAddress | null>(null);

  // Metamask Check
  useEffect(() => {
    if (window.ethereum) {
      setHasMetamask(true);
    }
    window.ethereum.on("accountsChanged", () => window.location.reload());
  }, []);

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

        const useWalletConnect = true;
        let aztecWalletProvider;

        if (useWalletConnect) {
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

          aztecWalletProvider = await awpClient.init();
        } else {
          const keyStore = sdk.createLegacyKeyStore(
            ethAddress,
            [],
            ethereumProvider
          );
          aztecWalletProvider = await sdk.createAztecWalletProvider(keyStore);
        }

        await aztecWalletProvider!.connect();
        const accountPublicKey = await sdk.addAccount(aztecWalletProvider!);
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
    const controller = sdk!.createDepositController(
      ethAddress!,
      value,
      fee,
      accountPublicKey!,
      false
    );
    const assetBalance = await sdk!.getPublicBalance(ethAddress!, assetId);
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

  async function withdraw(valueStr: string, assetId: number) {
    const value = sdk!.toBaseUnits(assetId, valueStr);

    const feeOptions: GetFeesOptions = {
      // accountPublicKey: accountPublicKey!,
      // spendingKeyRequired: false,
      // excludePendingNotes: false,
      // feeSignificantFigures: 6,
    };

    const [, fee] = await sdk!.getWithdrawFees(assetId, {
      ...feeOptions,
      recipient: ethAddress!,
    });

    const proofRequestOptions: ProofRequestOptions = {
      // excludedNullifiers: [],
      excludePendingNotes: false,
      useAccountKey: true,
      allowChain: true,
      hideNoteCreator: true,
    };

    const controller = sdk!.createWithdrawController(
      accountPublicKey!,
      value,
      fee,
      ethAddress!,
      proofRequestOptions
    );
    await controller.createProofs();
    await controller.send();
  }

  async function logBalance() {
    let ethBalance = sdk?.fromBaseUnits(
      await sdk?.getBalance(accountPublicKey!, 0),
      true,
      6
    );

    console.log("ETH Balance:", ethBalance);
  }

  async function transfer(alias: string, valueStr: string, assetId: number) {
    const to = await sdk!.getAccountPublicKey(alias);
    const value = sdk!.toBaseUnits(assetId, valueStr);

    const feeOptions: GetFeesOptions = {
      // accountPublicKey: accountPublicKey!,
      // spendingKeyRequired: false,
      // excludePendingNotes: false,
      // feeSignificantFigures: 6,
    };

    const [, fee] = await sdk!.getTransferFees(assetId, feeOptions);

    const proofRequestOptions: ProofRequestOptions = {
      // excludedNullifiers: [],
      excludePendingNotes: false,
      // useAccountKey: true,
      allowChain: true,
      hideNoteCreator: true,
    };

    const controller = sdk!.createTransferController(
      accountPublicKey!,
      value,
      fee,
      to,
      true, // flag for spending key
      proofRequestOptions
    );
    await controller.createProofs();
    await controller.send();
  }

  async function userInfo() {
    console.log("Account Public Key:", accountPublicKey!.toShortString());
    console.log(
      "Synchronized: ",
      await sdk!.isAccountSynching(accountPublicKey!)
    );
    console.log(
      "Account Registered: ",
      await sdk!.isAccountRegistered(accountPublicKey!)
    );
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
            <button onClick={() => deposit("1")}>Deposit 1 ETH</button>
            <button onClick={() => logBalance()}>Log Balance</button>
            <button onClick={() => withdraw("0.1", 0)}>Withdraw</button>
            <button onClick={() => userInfo()}>User Info</button>
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
