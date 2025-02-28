import React, { JSX } from "react";
import logo from "./logo.svg";
import "./App.css";
import { useRandomOption } from "./useRandomOption";

export function App(): JSX.Element {
  const [luckyOption, tryYourLuck] = useRandomOption();

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Latest attempt:{" "}
          {luckyOption.isSome() ? luckyOption.value : "No luck 🥺 Try again?"}
        </p>
        <button
          onClick={tryYourLuck}
          className="App-button"
          type="button"
          rel="noopener noreferrer"
        >
          Click to test your luck!
        </button>
      </header>
    </div>
  );
}
