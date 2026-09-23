import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const channel = window.location.pathname.split("/")[1];
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") ?? "lite";

  const customSearch = params.get("search") === "1";
  const customFollowing = params.get("following") === "1";
  const customChat = params.get("chat") === "1";

  const showSearch = mode === "balanced" || (mode === "custom" && customSearch);

  const showFollowing =
    mode === "balanced" || (mode === "custom" && customFollowing);

  const showChat =
    mode === "lite" || mode === "balanced" || (mode === "custom" && customChat);

  const playerUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  const chatUrl = `https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=${window.location.hostname}`;

  const [theaterMode, setTheaterMode] = useState(false);

  type FollowedStream = {
    user_id: string;
    user_login: string;
    user_name: string;
    game_name: string;
    title: string;
    viewer_count: number;
    thumbnail_url: string;
  };

  const clientId = "u8vnn0tzryyyylbbrn5d9vkzt1yest";

  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("twitch_access_token"),
  );

  const [followedStreams, setFollowedStreams] = useState<FollowedStream[]>([]);

  const connectTwitch = () => {
    sessionStorage.setItem("twitch_return_url", window.location.href);

    const redirectUri = window.location.origin + "/";

    const authUrl =
      `https://id.twitch.tv/oauth2/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=user%3Aread%3Afollows`;

    window.location.href = authUrl;
  };

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.substring(1));

    const token = hash.get("access_token");

    if (!token) return;

    localStorage.setItem("twitch_access_token", token);
    setAccessToken(token);

    const returnUrl = sessionStorage.getItem("twitch_return_url");

    sessionStorage.removeItem("twitch_return_url");

    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  const getCurrentUser = async (token: string) => {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": clientId,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get Twitch user");
    }

    const data = await response.json();

    return data.data[0];
  };

  const loadFollowedStreams = async (token: string) => {
    try {
      const user = await getCurrentUser(token);

      if (!user) return;

      const response = await fetch(
        `https://api.twitch.tv/helix/streams/followed?user_id=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Client-Id": clientId,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load followed streams: ${response.status}`);
      }

      const data = await response.json();

      setFollowedStreams(data.data);
    } catch (error) {
      console.error("[TwitchLite] Followed streams error:", error);
    }
  };

  useEffect(() => {
    if (!accessToken) return;

    loadFollowedStreams(accessToken);
  }, [accessToken]);

  const changeDisplayMode = () => {
    setTheaterMode(!theaterMode);
  };

  const [searchedChannel, setSearchedChannel] = useState("");
  const searchChannel = () => {
    const newChannel = searchedChannel.trim();

    if (!newChannel) return;

    window.location.href = `/${newChannel}${window.location.search}`;
  };

  return (
    <div className={theaterMode ? "app theater-active" : "app"}>
      {showSearch && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            searchChannel();
          }}
        >
          <label>
            <input
              className="input"
              type="text"
              value={searchedChannel}
              onChange={(e) => setSearchedChannel(e.target.value)}
              placeholder="Search Twitch channel"
            />
            <div className="fancy-bg"></div>

            <div className="search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.5 3a6.5 6.5 0 1 0 3.98 11.64L19.85 21 21 19.85l-6.36-6.37A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
              </svg>
            </div>
            <button
              className="close-btn"
              type="button"
              onClick={() => setSearchedChannel("")}
            >
              ×
            </button>
          </label>
        </form>
      )}
      <div className={theaterMode ? "viewer theater" : "viewer"}>
        {showFollowing && !theaterMode && (
          <aside className="following-sidebar">
            <h3>Followed Channels</h3>

            {!accessToken ? (
              <button onClick={connectTwitch}>Connect Twitch</button>
            ) : followedStreams.length === 0 ? (
              <p>No followed channels are live.</p>
            ) : (
              followedStreams.map((stream) => (
                <button
                  key={stream.user_id}
                  className="followed-channel"
                  onClick={() => {
                    window.location.href = `/${stream.user_login}${window.location.search}`;
                  }}
                >
                  <strong>{stream.user_name}</strong>
                  <span>{stream.game_name}</span>
                  <span>{stream.viewer_count.toLocaleString()} viewers</span>
                </button>
              ))
            )}
          </aside>
        )}
        <div className="video-column">
          <div className="video">
            <iframe src={playerUrl} allowFullScreen></iframe>
          </div>
          <button
            className="theater-button"
            type="button"
            aria-pressed={theaterMode}
            onClick={changeDisplayMode}
          >
            {theaterMode ? "Exit Theater" : "Theater Mode"}
          </button>
        </div>
        {showChat && (
          <div className="chat">
            <iframe src={chatUrl}></iframe>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
