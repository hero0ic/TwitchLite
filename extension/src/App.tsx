import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [channel, setChannel] = useState<string | null>(null);

  type ViewingMode = "lite" | "balanced" | "custom";
  const [mode, setMode] = useState<ViewingMode>("lite");
  const changeMode = (newMode: ViewingMode) => {
    setMode(newMode);
    chrome.storage.sync.set({
      mode: newMode,
    });
  };

  const openTwitchLite = () => {
    const viewerUrl = `https://twitchlite.app/${channel}?mode=${mode}`;
    chrome.tabs.create({
      url: viewerUrl,
    });
  };

  useEffect(() => {
    const loadMode = async () => {
      const result = await chrome.storage.sync.get("mode");
      if (
        result.mode === "lite" ||
        result.mode === "balanced" ||
        result.mode === "custom"
      )
        setMode(result.mode);
    };
    const detectChannel = async () => {
      if (typeof chrome === "undefined" || !chrome.tabs) {
        return;
      }
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!tab?.url) {
          return;
        }

        const url = new URL(tab.url);

        if (url.hostname !== "www.twitch.tv" && url.hostname !== "twitch.tv") {
          return;
        }

        const pathParts = url.pathname.split("/").filter(Boolean);

        if (pathParts.length === 0) {
          return;
        }

        const possibleChannel = pathParts[0];

        const reservedPages = [
          "directory",
          "downloads",
          "jobs",
          "p",
          "settings",
          "subscriptions",
          "wallet",
          "help",
          "profile",
          "home",
        ];

        if (!reservedPages.includes(possibleChannel.toLowerCase())) {
          setChannel(possibleChannel);
        }
      } catch {
        setChannel(null);
      }
    };

    loadMode();
    detectChannel();
  }, []);

  return (
    <main>
      <h1>TwitchLite</h1>

      {channel ? (
        <>
          <p>
            Watching: <strong>{channel}</strong>
          </p>

          <h3>Viewing Mode</h3>

          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "lite"}
              onChange={() => changeMode("lite")}
            />
            Lite
          </label>

          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "balanced"}
              onChange={() => changeMode("balanced")}
            />
            Balanced
          </label>

          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "custom"}
              onChange={() => changeMode("custom")}
            />
            Custom
          </label>

          <button onClick={openTwitchLite}>Open in TwitchLite</button>
        </>
      ) : (
        <>
          <p>No Twitch stream detected.</p>
          <p>Open a Twitch stream to use TwitchLite.</p>
        </>
      )}
    </main>
  );
}
export default App;
