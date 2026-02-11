# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Teemate is a Discord bot with a web dashboard (inspired by carl.gg). It features:
- `/ping` slash command via Discord Interactions API
- Web dashboard at `/dashboard` for managing server settings
- Welcome messages with embed support
- Moderation logs tracking server events
- Discord OAuth2 authentication

## Stack

- **Backend**: Express.js + MongoDB (Mongoose) + Discord Gateway (ws)
- **Frontend**: React 19 (Vite) with React Router, custom dark theme CSS
- **Auth**: Discord OAuth2 (scopes: `identify`, `guilds`)
- **Deployment**: Docker multi-container (discord-app, mongodb, cloudflared)

## Environment Setup

Create a `.env` file with the following required variables:
- `APP_ID` - Discord application ID
- `DISCORD_TOKEN` - Bot token
- `PUBLIC_KEY` - Public key for verifying Discord requests
- `CLIENT_SECRET` - Discord OAuth2 client secret
- `SESSION_SECRET` - Random string for session security
- `DASHBOARD_URL` - Dashboard base URL (e.g., `https://discord.teemate.gg`)
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://mongodb:27017/teemate`)
- `TUNNEL_TOKEN` - Cloudflare tunnel token
- `PORT` (optional) - Server port, defaults to 3000

## Common Commands

### Install dependencies
```bash
npm install
cd dashboard && npm install
```

### Register slash commands with Discord
```bash
npm run register
```

### Run the application
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### Build dashboard
```bash
cd dashboard && npm run build
```

### Dashboard dev server (with API proxy)
```bash
cd dashboard && npm run dev
```

## Architecture

### Project Structure

```
teemate-discord-app/
├── src/                      # Backend
│   ├── app.js                # Express server (entry point)
│   ├── db.js                 # MongoDB connection
│   ├── bot/
│   │   ├── commands.js       # Slash command definitions
│   │   ├── handlers.js       # Interaction handlers
│   │   ├── gateway.js        # Discord Gateway (WebSocket events)
│   │   └── utils.js          # Discord API helpers
│   ├── api/
│   │   ├── auth.js           # OAuth2 routes (/api/auth/*)
│   │   ├── guilds.js         # Guild config routes (/api/guilds/*)
│   │   └── middleware.js     # Auth middleware
│   └── models/
│       ├── GuildConfig.js    # Server config schema
│       └── Session.js        # User session schema
├── dashboard/                # React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx           # Router setup
│   │   ├── api/client.js     # API fetch wrapper
│   │   ├── components/       # Layout, Sidebar, Header, etc.
│   │   └── pages/            # Login, ServerList, Overview, Welcome, Logs
│   ├── index.html
│   └── vite.config.js
├── docker-compose.yml        # 3 services: discord-app, mongodb, cloudflared
└── Dockerfile                # Multi-stage (React build + Node production)
```

### Key Endpoints

**Bot:**
- `POST /interactions` - Discord interaction handler (signature verified)
- `GET /health` - Health check

**API (require auth):**
- `GET/POST /api/auth/*` - OAuth2 login/callback/me/logout
- `GET /api/guilds` - List user's guilds (admin + bot present)
- `GET /api/guilds/:id` - Guild details (channels, roles)
- `GET/PATCH /api/guilds/:id/config` - Guild configuration
- `GET/PATCH /api/guilds/:id/welcome` - Welcome message settings
- `GET/PATCH /api/guilds/:id/logs` - Moderation log settings

**Dashboard:**
- `GET /dashboard/*` - React SPA (static files)

### Key Patterns

- **Components v2**: Bot responses use `InteractionResponseFlags.IS_COMPONENTS_V2`
- **Discord Gateway**: WebSocket connection for real-time events (member join/leave, message edit/delete, bans)
- **Session auth**: HTTP-only cookies with MongoDB-backed sessions (7-day TTL)
- **Guild admin check**: Verifies ADMINISTRATOR permission (bit 0x8) before allowing config changes

### MongoDB Collections

- `guildconfigs` - Per-server settings (welcome, logs)
- `sessions` - User sessions (TTL-indexed for auto-expiry)

## Deployment and Updates

### Docker Services
- `discord-app` - Main app (Express + React static files)
- `mongodb` - MongoDB 7 with persistent volume
- `cloudflared` - Cloudflare Tunnel

### Deployment Scripts
- **deploy.ps1** (Windows PowerShell) - `.\deploy.ps1 -Destination "user@nas-ip:/path"`

### NAS Specifics
On Synology NAS, docker-compose is located at `/usr/local/bin/docker-compose`.

### Prerequisites for Dashboard
1. Get `CLIENT_SECRET` from Discord Developer Portal > OAuth2
2. Add redirect URI `https://discord.teemate.gg/api/auth/callback` in Discord Developer Portal
3. Enable Gateway Intents: Server Members Intent, Message Content Intent

## Examples Directory

The `examples/` folder contains feature-specific code samples from the Discord starter project.
