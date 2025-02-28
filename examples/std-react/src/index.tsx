import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
