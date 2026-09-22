(async () => {
  const pathParts = window.location.pathname.split("/").filter(Boolean);

  if (pathParts[0] !== "embed" || !pathParts[1] || pathParts[2] !== "chat") {
    return;
  }

  const channel = pathParts[1].toLowerCase();

  console.log(`[TwitchLite] Chat detected: ${channel}`);

  const emoteMap = new Map();

  const normalizeUrl = (url) => {
    if (!url) return null;

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    return url;
  };

  const addEmote = (name, url, provider) => {
    if (!name || !url) return;

    emoteMap.set(name, {
      url: normalizeUrl(url),
      provider,
    });
  };

  try {
    const ffzRoomResponse = await fetch(
      `https://api.frankerfacez.com/v1/room/${encodeURIComponent(channel)}`,
    );

    if (!ffzRoomResponse.ok) {
      throw new Error(`FFZ room lookup failed: ${ffzRoomResponse.status}`);
    }

    const ffzRoomData = await ffzRoomResponse.json();

    const twitchId = String(ffzRoomData.room?.twitch_id ?? "");

    if (!twitchId) {
      throw new Error("Could not determine Twitch user ID");
    }

    console.log(`[TwitchLite] Twitch ID: ${twitchId}`);

    // ffz global emotes
    try {
      const ffzGlobalResponse = await fetch(
        "https://api.frankerfacez.com/v1/set/global",
      );

      if (ffzGlobalResponse.ok) {
        const ffzGlobalData = await ffzGlobalResponse.json();

        const defaultSets = ffzGlobalData.default_sets ?? [];

        for (const setId of defaultSets) {
          const set = ffzGlobalData.sets?.[setId];

          if (!set?.emoticons) continue;

          for (const emote of set.emoticons) {
            const url =
              emote.animated?.["2"] ||
              emote.urls?.["2"] ||
              emote.animated?.["1"] ||
              emote.urls?.["1"];

            addEmote(emote.name, url, "ffz");
          }
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] FFZ global emotes failed:", error);
    }

    // ffz channel emotes
    try {
      const sets = ffzRoomData.sets ?? {};

      for (const set of Object.values(sets)) {
        const emotes = set.emoticons ?? [];

        for (const emote of emotes) {
          const url =
            emote.animated?.["2"] ||
            emote.urls?.["2"] ||
            emote.animated?.["1"] ||
            emote.urls?.["1"];

          addEmote(emote.name, url, "ffz");
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] FFZ channel emotes failed:", error);
    }

    // bttv global emotes
    try {
      const bttvGlobalResponse = await fetch(
        "https://api.betterttv.net/3/cached/emotes/global",
      );

      if (bttvGlobalResponse.ok) {
        const bttvGlobalData = await bttvGlobalResponse.json();

        for (const emote of bttvGlobalData) {
          addEmote(
            emote.code,
            `https://cdn.betterttv.net/emote/${emote.id}/2x`,
            "bttv",
          );
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] BTTV global emotes failed:", error);
    }

    // bttv channel emotes
    try {
      const bttvChannelResponse = await fetch(
        `https://api.betterttv.net/3/cached/users/twitch/${twitchId}`,
      );

      if (bttvChannelResponse.ok) {
        const bttvChannelData = await bttvChannelResponse.json();

        const channelEmotes = bttvChannelData.channelEmotes ?? [];

        const sharedEmotes = bttvChannelData.sharedEmotes ?? [];

        for (const emote of [...channelEmotes, ...sharedEmotes]) {
          addEmote(
            emote.code,
            `https://cdn.betterttv.net/emote/${emote.id}/2x`,
            "bttv",
          );
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] BTTV channel emotes failed:", error);
    }

    // 7tv global emotes
    try {
      const sevenTvGlobalResponse = await fetch(
        "https://7tv.io/v3/emote-sets/global",
      );

      if (sevenTvGlobalResponse.ok) {
        const sevenTvGlobalData = await sevenTvGlobalResponse.json();

        const emotes = sevenTvGlobalData.emotes ?? [];

        for (const emote of emotes) {
          const host = emote.data?.host;

          if (!host?.url || !host?.files) continue;

          const file =
            host.files.find((file) => file.name === "2x.webp") ||
            host.files.find((file) => file.name === "1x.webp") ||
            host.files[0];

          if (!file) continue;

          const baseUrl = normalizeUrl(host.url);

          addEmote(emote.name, `${baseUrl}/${file.name}`, "7tv");
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] 7TV global emotes failed:", error);
    }

    // 7tv channel emotes
    try {
      const sevenTvChannelResponse = await fetch(
        `https://7tv.io/v3/users/twitch/${twitchId}`,
      );

      if (sevenTvChannelResponse.ok) {
        const sevenTvChannelData = await sevenTvChannelResponse.json();

        const emotes = sevenTvChannelData.emote_set?.emotes ?? [];

        for (const emote of emotes) {
          const host = emote.data?.host;

          if (!host?.url || !host?.files) continue;

          const file =
            host.files.find((file) => file.name === "2x.webp") ||
            host.files.find((file) => file.name === "1x.webp") ||
            host.files[0];

          if (!file) continue;

          const baseUrl = normalizeUrl(host.url);

          addEmote(emote.name, `${baseUrl}/${file.name}`, "7tv");
        }
      }
    } catch (error) {
      console.warn("[TwitchLite] 7TV channel emotes failed:", error);
    }

    const providerCounts = {
      "7tv": 0,
      bttv: 0,
      ffz: 0,
    };

    for (const emote of emoteMap.values()) {
      providerCounts[emote.provider]++;
    }

    console.log("[TwitchLite] Provider counts:", providerCounts);

    console.log(`[TwitchLite] Loaded ${emoteMap.size} third-party emotes`);

    const style = document.createElement("style");

    style.textContent = `
      .twitchlite-emote {
        height: 28px;
        width: auto;
        vertical-align: middle;
        margin: 0 2px;
      }
    `;

    document.head.appendChild(style);

    const processMessage = (messageElement) => {
      if (messageElement.dataset.twitchliteProcessed === "true") {
        return;
      }

      const messageParts = messageElement.querySelectorAll(
        '[data-a-target="chat-message-text"]',
      );

      if (messageParts.length === 0) {
        return;
      }

      messageElement.dataset.twitchliteProcessed = "true";

      for (const part of messageParts) {
        const textNodes = [];

        const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);

        let node;

        while ((node = walker.nextNode())) {
          textNodes.push(node);
        }

        for (const textNode of textNodes) {
          const text = textNode.textContent;

          if (!text) continue;

          const pieces = text.split(/(\s+)/);

          let hasEmote = false;

          const fragment = document.createDocumentFragment();

          for (const piece of pieces) {
            const emote = emoteMap.get(piece);

            if (emote) {
              hasEmote = true;

              const img = document.createElement("img");

              img.src = emote.url;
              img.alt = piece;
              img.title = `${piece} (${emote.provider})`;

              img.className = "twitchlite-emote";

              img.decoding = "async";
              img.loading = "lazy";

              fragment.appendChild(img);
            } else {
              fragment.appendChild(document.createTextNode(piece));
            }
          }

          if (hasEmote) {
            textNode.replaceWith(fragment);
          }
        }
      }
    };

    // process current messages
    document
      .querySelectorAll('[data-a-target="chat-line-message"]')
      .forEach(processMessage);

    // watch for future messages
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          if (!(addedNode instanceof HTMLElement)) {
            continue;
          }

          if (addedNode.matches?.('[data-a-target="chat-line-message"]')) {
            processMessage(addedNode);
          }

          const parentMessage = addedNode.closest?.(
            '[data-a-target="chat-line-message"]',
          );

          if (parentMessage) {
            processMessage(parentMessage);
          }

          addedNode
            .querySelectorAll?.('[data-a-target="chat-line-message"]')
            .forEach(processMessage);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[TwitchLite] 7TV + BTTV + FFZ renderer active");
  } catch (error) {
    console.error("[TwitchLite] Emote engine failed:", error);
  }
})();
