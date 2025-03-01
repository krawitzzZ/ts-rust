import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { useRandomOption } from "./useRandomOption";
import { useState } from "react";

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [luckyOption, tryYourLuck] = useRandomOption();

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => {
            if (!isStarted) {
              setIsStarted(true);
            }
            tryYourLuck();
          }}
        >
          Click to test your luck!
        </button>
        {isStarted && (
          <p>
            {luckyOption.isSome() ? luckyOption.value : "No luck 🥺 Try again?"}
          </p>
        )}
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
