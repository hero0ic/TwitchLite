import { useEffect, useState } from "react";
import "./App.css";

type ViewingMode = "lite" | "balanced" | "custom";

type CustomSettings = {
  showSearch: boolean;
  showFollowing: boolean;
  showChat: boolean;
  sevenTv: boolean;
  bttv: boolean;
  ffz: boolean;
  animatedEmotes: boolean;
  emoteQuality: "1x" | "2x";
};

const defaultCustomSettings: CustomSettings = {
  showSearch: true,
  showFollowing: true,
  showChat: true,
  sevenTv: true,
  bttv: true,
  ffz: true,
  animatedEmotes: true,
  emoteQuality: "2x",
};

function App() {
  const [channel, setChannel] = useState<string | null>(null);

  const [mode, setMode] = useState<ViewingMode>("lite");

  const [customSettings, setCustomSettings] = useState<CustomSettings>(
    defaultCustomSettings,
  );

  const changeMode = (newMode: ViewingMode) => {
    setMode(newMode);

    chrome.storage.sync.set({
      mode: newMode,
    });
  };

  const updateCustomSettings = (changes: Partial<CustomSettings>) => {
    const updatedSettings = {
      ...customSettings,
      ...changes,
    };

    setCustomSettings(updatedSettings);

    chrome.storage.sync.set({
      customSettings: updatedSettings,
    });
  };

  const openTwitchLite = () => {
    if (!channel) return;

    const params = new URLSearchParams();

    params.set("mode", mode);

    if (mode === "custom") {
      params.set("search", customSettings.showSearch ? "1" : "0");
      params.set("following", customSettings.showFollowing ? "1" : "0");
      params.set("chat", customSettings.showChat ? "1" : "0");
    }

    const viewerUrl = `https://twitch-lite.vercel.app/${channel}?${params.toString()}`;

    chrome.tabs.create({
      url: viewerUrl,
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      const result = await chrome.storage.sync.get(["mode", "customSettings"]);

      if (
        result.mode === "lite" ||
        result.mode === "balanced" ||
        result.mode === "custom"
      ) {
        setMode(result.mode);
      }

      if (result.customSettings) {
        setCustomSettings({
          ...defaultCustomSettings,
          ...result.customSettings,
        });
      }
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

    loadSettings();
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

          {mode === "custom" && (
            <div className="custom-settings">
              <h3>Custom Settings</h3>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.showSearch}
                  onChange={(e) =>
                    updateCustomSettings({
                      showSearch: e.target.checked,
                    })
                  }
                />
                Search bar
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.showFollowing}
                  onChange={(e) =>
                    updateCustomSettings({
                      showFollowing: e.target.checked,
                    })
                  }
                />
                Followed channels
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.showChat}
                  onChange={(e) =>
                    updateCustomSettings({
                      showChat: e.target.checked,
                    })
                  }
                />
                Chat
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.sevenTv}
                  onChange={(e) =>
                    updateCustomSettings({
                      sevenTv: e.target.checked,
                    })
                  }
                />
                7TV emotes
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.bttv}
                  onChange={(e) =>
                    updateCustomSettings({
                      bttv: e.target.checked,
                    })
                  }
                />
                BTTV emotes
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.ffz}
                  onChange={(e) =>
                    updateCustomSettings({
                      ffz: e.target.checked,
                    })
                  }
                />
                FFZ emotes
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={customSettings.animatedEmotes}
                  onChange={(e) =>
                    updateCustomSettings({
                      animatedEmotes: e.target.checked,
                    })
                  }
                />
                Animated emotes
              </label>

              <label>
                Emote quality
                <select
                  value={customSettings.emoteQuality}
                  onChange={(e) =>
                    updateCustomSettings({
                      emoteQuality: e.target.value as "1x" | "2x",
                    })
                  }
                >
                  <option value="1x">1x — Lower resource usage</option>
                  <option value="2x">2x — Higher quality</option>
                </select>
              </label>
            </div>
          )}

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
