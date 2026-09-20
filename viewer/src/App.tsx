import { useState } from "react";
import "./App.css";

function App() {
  const channel = window.location.pathname.split("/")[1];
  // const params = new URLSearchParams(window.location.search);
  // const mode = params.get("mode");

  const playerUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  const chatUrl = `https://www.twitch.tv/embed/${channel}/chat?parent=${window.location.hostname}`;

  const [theaterMode, setTheaterMode] = useState(false);

  const changeDisplayMode = () => {
    setTheaterMode(!theaterMode);
  };

  return (
    <div className="app">
      <button onClick={changeDisplayMode}>
        {theaterMode ? "Exit Theater" : "Theater Mode"}
      </button>

      <div className={theaterMode ? "viewer theater" : "viewer"}>
        <div className="video">
          <iframe src={playerUrl} allowFullScreen></iframe>
        </div>

        <div className="chat">
          <iframe src={chatUrl}></iframe>
        </div>
      </div>
    </div>
  );
}

export default App;
