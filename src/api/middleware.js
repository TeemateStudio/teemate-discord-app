import Session from '../models/Session.js';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Refresh Discord OAuth2 token
 */
async function refreshDiscordToken(session) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.APP_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  session.accessToken = data.access_token;
  session.refreshToken = data.refresh_token;
  session.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  await session.save();
  return true;
}

/**
 * Require authenticated session
 */
export async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await Session.findOne({ sessionId });
  if (!session || session.expiresAt < new Date()) {
    if (session) await session.deleteOne();
    return res.status(401).json({ error: 'Session expired' });
  }

  // Refresh token if expired
  if (session.tokenExpiresAt < new Date()) {
    const refreshed = await refreshDiscordToken(session);
    if (!refreshed) {
      await session.deleteOne();
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  req.session = session;
  next();
}

/**
 * Require admin permission on the requested guild
 * Must be used after requireAuth
 */
export async function requireGuildAdmin(req, res, next) {
  const { id } = req.params;
  const guild = req.session.guilds.find((g) => g.id === id);

  if (!guild) {
    return res.status(403).json({ error: 'Guild not found in your servers' });
  }

  // Check ADMINISTRATOR permission (bit 3 = 0x8)
  const permissions = BigInt(guild.permissions);
  const isAdmin = (permissions & 0x8n) === 0x8n;
  const isOwner = guild.owner;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Missing admin permissions' });
  }

  req.guild = guild;
  next();
}
