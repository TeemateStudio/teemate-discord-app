import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session.js';

const router = Router();
const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = 'identify guilds';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getRedirectUri() {
  const base = process.env.DASHBOARD_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${base}/api/auth/callback`;
}

/**
 * GET /api/auth/login - Redirect to Discord OAuth2
 */
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.APP_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

/**
 * GET /api/auth/callback - OAuth2 callback
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APP_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      console.error('OAuth2 token exchange failed:', err);
      return res.redirect('/dashboard?error=auth_failed');
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    // Fetch user guilds
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const guilds = await guildsRes.json();

    // Create session
    const sessionId = uuidv4();
    const now = new Date();

    await Session.findOneAndUpdate(
      { userId: user.id },
      {
        sessionId,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
        guilds,
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_DURATION),
      },
      { upsert: true, new: true }
    );

    // Set session cookie
    res.cookie('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.DASHBOARD_URL?.startsWith('https'),
      sameSite: 'lax',
      maxAge: SESSION_DURATION,
      path: '/',
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth2 callback error:', err);
    res.redirect('/dashboard?error=auth_failed');
  }
});

/**
 * GET /api/auth/me - Get current user info
 */
router.get('/me', async (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = await Session.findOne({ sessionId });
  if (!session || session.expiresAt < new Date()) {
    if (session) await session.deleteOne();
    return res.status(401).json({ error: 'Session expired' });
  }

  res.json({
    id: session.userId,
    username: session.username,
    avatar: session.avatar,
    guilds: session.guilds,
  });
});

/**
 * POST /api/auth/logout - Destroy session
 */
router.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    await Session.deleteOne({ sessionId });
  }
  res.clearCookie('session', { path: '/' });
  res.json({ success: true });
});

export default router;
