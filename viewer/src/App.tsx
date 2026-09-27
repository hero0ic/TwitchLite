import { useEffect, useState } from "react";
import "./App.css";

function App() {
  // Landing Page //
  const [emotesVisible, setEmotesVisible] = useState(false);

  useEffect(() => {
    const section = document.getElementById("emotes");

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEmotesVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);
  // //

  const path = window.location.pathname;
  const channel = path.split("/")[1];
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") ?? "lite";
  const chatParams = new URLSearchParams({
    parent: window.location.hostname,
    mode,
  });

  const customSearch = params.get("search") === "1";
  const customFollowing = params.get("following") === "1";
  const customChat = params.get("chat") === "1";

  const showSearch = mode === "balanced" || (mode === "custom" && customSearch);

  const showFollowing =
    mode === "balanced" || (mode === "custom" && customFollowing);

  const showChat =
    mode === "lite" || mode === "balanced" || (mode === "custom" && customChat);

  if (mode === "custom") {
    chatParams.set("7tv", params.get("7tv") ?? "1");
    chatParams.set("bttv", params.get("bttv") ?? "1");
    chatParams.set("ffz", params.get("ffz") ?? "1");
    chatParams.set("quality", params.get("quality") ?? "2x");
  }

  const playerUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  const chatUrl = `https://www.twitch.tv/embed/${channel}/chat?darkpopout&${chatParams.toString()}`;

  const [channelStatus, setChannelStatus] = useState<
    "loading" | "live" | "offline" | "not-found" | "error"
  >("loading");

  useEffect(() => {
    const checkChannel = async () => {
      if (!channel) {
        return;
      }

      try {
        setChannelStatus("loading");

        const response = await fetch(
          `/api/check-live?channel=${encodeURIComponent(channel)}`,
        );

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.exists) {
          setChannelStatus("not-found");
        } else if (!data.live) {
          setChannelStatus("offline");
        } else {
          setChannelStatus("live");
        }
      } catch (error) {
        console.error("[TwitchLite] Channel check failed:", error);
        setChannelStatus("error");
      }
    };

    checkChannel();
  }, [channel]);

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

  if (path === "/welcome") {
    return (
      <main className="welcome-page">
        <div className="welcome-content">
          <p className="section-eyebrow">WELCOME</p>

          <h1>TwitchLite is installed.</h1>

          <p className="welcome-description">
            Thank you for installing TwitchLite. Follow the steps below to get
            started.
          </p>

          <div className="welcome-steps">
            <section className="welcome-step">
              <span className="welcome-step-number">01</span>

              <div>
                <h3>Pin TwitchLite</h3>
                <p>
                  Keep the extension in your Chrome toolbar so it's always easy
                  to access.
                </p>
              </div>
            </section>

            <section className="welcome-step">
              <span className="welcome-step-number">02</span>

              <div className="welcome-step-content">
                <h3>Choose how to start</h3>

                <div className="welcome-options">
                  <div>
                    <h4>Open a Twitch stream</h4>
                    <p>
                      Visit any live Twitch channel, then open the TwitchLite
                      extension.
                    </p>
                  </div>

                  <div>
                    <h4>Search directly</h4>
                    <p>
                      Enter a live Twitch username in the extension without
                      opening Twitch first.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="welcome-step">
              <span className="welcome-step-number">03</span>

              <div>
                <h3>Choose your mode</h3>
                <p>
                  Use Lite, Balanced, or Custom depending on how minimal you
                  want your setup to be.
                </p>
              </div>
            </section>
          </div>

          <a
            href="https://www.twitch.tv"
            target="_blank"
            rel="noreferrer"
            className="primary-button welcome-cta"
          >
            Open Twitch
          </a>
        </div>
      </main>
    );
  }

  if (!channel) {
    return (
      <main className="landing">
        <section id="top" className="landing-section hero-section">
          <div className="hero-background">
            <div className="squares" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <div className="square" key={i} />
              ))}
            </div>
          </div>

          <div className="hero-content">
            <p className="hero-eyebrow">LIGHTWEIGHT TWITCH VIEWER</p>

            <h1>TwitchLite</h1>

            <p className="hero-description">
              Watch Twitch with the stream, chat, emotes, and features you want
              — without the rest of the Twitch interface.
            </p>

            <div className="landing-actions">
              <a href="#" className="primary-button">
                Add to Chrome
              </a>

              <a
                href="https://github.com/hero0ic/TwitchLite/"
                target="_blank"
                rel="noreferrer"
                className="secondary-button github-button"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.93c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92v2.85c0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
                  />
                </svg>
                View on GitHub
              </a>
            </div>

            <p className="landing-note">
              TwitchLite is an independent project and is not affiliated with
              Twitch.
            </p>

            <a
              href="#modes"
              className="section-arrow section-arrow-down"
              aria-label="Scroll to viewing modes"
            >
              ↓
            </a>
          </div>
        </section>

        <section id="modes" className="landing-section modes-section">
          <div className="section-content">
            <a
              href="#top"
              className="section-arrow section-arrow-up"
              aria-label="Back to top"
            >
              ↑
            </a>
            <p className="section-eyebrow">VIEWING MODES</p>

            <h2>Choose how lightweight you want to go.</h2>

            <p className="section-description">
              Keep only the essentials, add a few conveniences, or configure
              TwitchLite exactly how you want it.
            </p>

            <div className="mode-grid">
              <article className="mode-card">
                <span className="mode-number">01</span>

                <h3>Lite</h3>

                <p>
                  The essentials for watching Twitch with as little memory usage
                  as possible.
                </p>

                <ul>
                  <li>Stream</li>
                  <li>Chat</li>
                  <li>Theater mode</li>
                  <li>7TV, BTTV, and FFZ emotes</li>
                </ul>
              </article>

              <article className="mode-card featured-mode">
                <span className="mode-number">02</span>

                <h3>Balanced</h3>

                <p>
                  Adds useful Twitch features while keeping the interface clean
                  and lightweight.
                </p>

                <ul>
                  <li>Everything in Lite</li>
                  <li>Channel search</li>
                  <li>Followed live channels</li>
                  <li>Higher-quality emotes</li>
                </ul>
              </article>

              <article className="mode-card">
                <span className="mode-number">03</span>

                <h3>Custom</h3>

                <p>
                  Decide exactly which TwitchLite features should be enabled.
                </p>

                <ul>
                  <li>Toggle search</li>
                  <li>Toggle followed channels</li>
                  <li>Toggle chat</li>
                  <li>Choose emote providers and quality</li>
                </ul>
              </article>
            </div>

            <a
              href="#emotes"
              className="section-arrow section-arrow-down"
              aria-label="Scroll to emote support"
            >
              ↓
            </a>
          </div>
        </section>

        <section id="emotes" className="landing-section emotes-section">
          <div className="emotes-layout">
            <div className="emotes-copy">
              <a
                href="#modes"
                className="section-arrow section-arrow-up"
                aria-label="Back to viewing modes"
              >
                ↑
              </a>
              <p className="section-eyebrow">THIRD-PARTY EMOTES</p>

              <h2>Full emote compatibility.</h2>

              <p>
                TwitchLite supports 7TV, BetterTTV, and FrankerFaceZ while
                keeping Twitch's normal embedded chat experience.
              </p>

              <div className="provider-list">
                <span>7TV</span>
                <span>BTTV</span>
                <span>FFZ</span>
              </div>
            </div>

            <div
              className={`emote-showcase ${emotesVisible ? "emotes-visible" : ""}`}
            >
              <div className="emote-float emote-left-float">
                <img
                  src="/emotes/LO.webp"
                  alt="LO"
                  className="showcase-emote emote-left"
                />
              </div>
              <div className="emote-float emote-center-float">
                <img
                  src="/emotes/EZ.webp"
                  alt="EZ"
                  className="showcase-emote emote-center"
                />
              </div>
              <div className="emote-float emote-right-float">
                <img
                  src="/emotes/Concerned.webp"
                  alt="Concerned"
                  className="showcase-emote emote-right"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (channel && channelStatus === "loading") {
    return (
      <div className="status-page">
        <h1>TwitchLite</h1>
        <p>Checking channel...</p>
      </div>
    );
  }

  if (channelStatus === "not-found") {
    return (
      <div className="status-page">
        <h1>Channel not found</h1>
        <p>
          The Twitch channel <strong>{channel}</strong> does not exist.
        </p>

        <button onClick={() => (window.location.href = "/")}>Go Home</button>
      </div>
    );
  }

  if (channel && channelStatus === "offline") {
    return (
      <div className="status-page">
        <h1>Streamer is offline</h1>
        <p>
          <strong>{channel}</strong> is not currently live.
        </p>

        <button onClick={() => (window.location.href = "/")}>Go Home</button>
      </div>
    );
  }

  if (channel && channelStatus === "error") {
    return (
      <div className="status-page">
        <h1>Something went wrong</h1>
        <p>Couldn't check this Twitch channel.</p>

        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className={theaterMode ? "app theater-active" : "app"}>
      {showSearch && (
        <header className="top-bar">
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
        </header>
      )}
      <div className={theaterMode ? "viewer theater" : "viewer"}>
        {showFollowing && !theaterMode && (
          <aside className="following-sidebar">
            <h3>Followed Channels</h3>

            {!accessToken ? (
              <button className="theater-button" onClick={connectTwitch}>
                Connect Twitch
              </button>
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
