import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const channel =
    typeof req.query.channel === "string"
      ? req.query.channel.trim().toLowerCase()
      : "";

  if (!channel) {
    return res.status(400).json({ error: "Missing channel" });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Twitch credentials not configured" });
  }

  try {
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
        clientId,
      )}&client_secret=${encodeURIComponent(
        clientSecret,
      )}&grant_type=client_credentials`,
      {
        method: "POST",
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
    };

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Twitch access token missing");
    }

    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      throw new Error(`User lookup failed: ${userResponse.status}`);
    }

    const userData = (await userResponse.json()) as {
      data?: Array<{
        id: string;
        login: string;
        display_name: string;
      }>;
    };

    const user = userData.data?.[0];

    if (!user) {
      return res.status(404).json({ error: "Channel not found" });
    }

    return res.status(200).json({
      id: user.id,
      login: user.login,
      displayName: user.display_name,
    });
  } catch (error) {
    console.error("[TwitchLite] Channel ID lookup failed:", error);

    return res.status(500).json({
      error: "Failed to resolve channel",
    });
  }
}
