import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { verifyKeyMiddleware } from 'discord-interactions';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from './db.js';
import { handleInteraction } from './bot/handlers.js';
import { startGateway } from './bot/gateway.js';
import authRouter from './api/auth.js';
import guildsRouter from './api/guilds.js';
import { requireAuth } from './api/middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());

// Discord interactions endpoint (must use raw body for signature verification)
// Note: verifyKeyMiddleware handles its own body parsing, so this must come before express.json()
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), handleInteraction);

// JSON parsing for API routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/guilds', requireAuth, guildsRouter);

// Serve React dashboard (static files)
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'dist');
app.use('/dashboard', express.static(dashboardPath));
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Start server
async function start() {
  await connectDB();

  // Start Discord Gateway for events (welcome, logs)
  startGateway();

  app.listen(PORT, () => {
    console.log(`Teemate bot listening on port ${PORT}`);
  });
}

start();
