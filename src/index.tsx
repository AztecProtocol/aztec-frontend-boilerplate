import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BridgeDataProvider } from "./bridge-data/bridge-data";
import { WagmiConfig } from "wagmi";
import { SdkProvider } from "./sdk";
import { wagmiClient } from "./wagmi";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <WagmiConfig client={wagmiClient}>
      <SdkProvider>
        <BridgeDataProvider>
          <App />
        </BridgeDataProvider>
      </SdkProvider>
    </WagmiConfig>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
