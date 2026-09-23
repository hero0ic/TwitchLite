type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
};

type TwitchUsersResponse = {
  data: TwitchUser[];
};

type TwitchStream = {
  user_login: string;
  user_name: string;
  title: string;
  game_name: string;
  viewer_count: number;
};

type TwitchStreamsResponse = {
  data: TwitchStream[];
};

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

    const tokenData = (await tokenResponse.json()) as TwitchTokenResponse;

    const accessToken = tokenData.access_token;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": clientId,
    };

    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`,
      { headers },
    );

    if (!userResponse.ok) {
      throw new Error(`User lookup failed: ${userResponse.status}`);
    }

    const userData = (await userResponse.json()) as TwitchUsersResponse;

    const user = userData.data?.[0];

    if (!user) {
      return res.status(200).json({
        channel,
        exists: false,
        live: false,
      });
    }

    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(user.login)}`,
      { headers },
    );

    if (!streamResponse.ok) {
      throw new Error(`Stream lookup failed: ${streamResponse.status}`);
    }

    const streamData = (await streamResponse.json()) as TwitchStreamsResponse;

    const stream = streamData.data?.[0];

    if (!stream) {
      return res.status(200).json({
        channel: user.login,
        displayName: user.display_name,
        exists: true,
        live: false,
      });
    }

    return res.status(200).json({
      channel: stream.user_login,
      displayName: stream.user_name,
      exists: true,
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
