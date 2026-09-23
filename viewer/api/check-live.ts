export default async function handler(req: any, res: any) {
  const channel = String(req.query.channel ?? "")
    .trim()
    .toLowerCase();

  if (!channel) {
    return res.status(400).json({
      error: "Missing channel",
    });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "Twitch credentials are not configured",
    });
  }

  try {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Client-Id": clientId,
        },
      },
    );

    if (!streamResponse.ok) {
      throw new Error(`Stream lookup failed: ${streamResponse.status}`);
    }

    const streamData = await streamResponse.json();
    const stream = streamData.data?.[0];

    if (!stream) {
      return res.status(200).json({
        channel,
        live: false,
      });
    }

    return res.status(200).json({
      channel: stream.user_login,
      displayName: stream.user_name,
      live: true,
      title: stream.title,
      game: stream.game_name,
      viewers: stream.viewer_count,
    });
  } catch (error) {
    console.error("[TwitchLite] Live check failed:", error);

    return res.status(500).json({
      error: "Failed to check Twitch stream",
    });
  }
}
