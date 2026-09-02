// Vercel Serverless Function: Discord OAuth2 Token Exchange & Profile Fetch
// Endpoint: /api/discord-callback

export default async function handler(req, res) {
  // 1. Set CORS Headers for arenax.cyou and local dev
  const allowedOrigins = [
    'https://arenax.cyou',
    'https://www.arenax.cyou',
    'https://arena-x-beta.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin) || origin.endsWith('.run.app') || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://arenax.cyou');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Extract authorization code from Query string or Request Body
  let code = req.query?.code;
  if (!code && req.body) {
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        code = parsed.code;
      } catch (e) {}
    } else {
      code = req.body.code;
    }
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing Discord authorization code' });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://arenax.cyou/discord-callback';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ 
      error: 'Discord OAuth credentials not configured on server (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET)' 
    });
  }

  try {
    // 3. Exchange authorization code for Discord access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Discord Token Exchange Failed:', tokenData);
      return res.status(tokenResponse.status || 400).json({
        error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Discord'
      });
    }

    // 4. Fetch user profile from Discord with scope=identify
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.id) {
      console.error('Discord User Fetch Failed:', userData);
      return res.status(userResponse.status || 400).json({
        error: userData.message || 'Failed to fetch Discord user profile'
      });
    }

    // Construct Discord Avatar URL
    let avatarUrl = '';
    if (userData.avatar) {
      const isAnimated = userData.avatar.startsWith('a_');
      avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${isAnimated ? 'gif' : 'png'}?size=128`;
    } else {
      const defaultIndex = (BigInt(userData.id) >> 22n) % 6n;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    const discordTag = userData.discriminator && userData.discriminator !== '0'
      ? `${userData.username}#${userData.discriminator}`
      : userData.username;

    // 5. Return Discord user data to client
    return res.status(200).json({
      success: true,
      discord: {
        id: userData.id,
        username: discordTag,
        globalName: userData.global_name || userData.username,
        avatar: avatarUrl
      }
    });

  } catch (error) {
    console.error('Discord OAuth Handler Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error during Discord verification'
    });
  }
}
