# Local Development Guide

## Prerequisites

- Node.js >= 18
- Docker Desktop (for MongoDB)
- [ngrok](https://ngrok.com/) (only needed for slash commands)

## First-Time Setup

1. **Install dependencies**

   ```bash
   npm install
   cd dashboard && npm install && cd ..
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in your Discord credentials (`APP_ID`, `DISCORD_TOKEN`, `PUBLIC_KEY`, `CLIENT_SECRET`).
   Generate a random `SESSION_SECRET`. The local defaults for `DASHBOARD_URL` and `MONGODB_URI` are already set.

3. **Add OAuth2 redirect URI in Discord Developer Portal**

   Go to your app > OAuth2 and add:
   ```
   http://localhost:5173/api/auth/callback
   ```

4. **Register slash commands**

   ```bash
   npm run register
   ```

## Daily Workflow

1. **Start MongoDB**

   ```bash
   npm run dev:db
   ```

2. **Start backend + dashboard**

   ```bash
   npm run dev:all
   ```

   This launches:
   - Backend on `http://localhost:3000` (with nodemon auto-reload)
   - Dashboard on `http://localhost:5173/dashboard`

3. **Stop MongoDB when done**

   ```bash
   npm run dev:db:stop
   ```

## VS Code Debugging

Open the Run & Debug panel (Ctrl+Shift+D) and choose:

- **Backend** — Launches `src/app.js` with the Node debugger. Set breakpoints in any `src/` file.
- **Dashboard (Vite)** — Launches the Vite dev server.
- **Backend + Dashboard** — Launches both at once.

Make sure MongoDB is running first (`npm run dev:db`).

## Testing Slash Commands with ngrok

Slash commands require Discord to reach your local server via HTTPS. The dashboard, gateway events, and welcome messages work without ngrok.

1. **Install ngrok**

   ```bash
   winget install ngrok
   ```

2. **Start the tunnel**

   ```bash
   ngrok http 3000
   ```

3. **Update Discord Developer Portal**

   Copy the ngrok HTTPS URL (e.g. `https://xxxx.ngrok-free.app`) and set it as the **Interactions Endpoint URL** in your app settings.

4. The ngrok URL changes on every restart (free plan). Update the portal each time.

## Important Notes

- **Dual bot instances**: If the production bot is running simultaneously, both instances receive gateway events (duplicates). Use a separate test bot or stop the production container during development.
- **Port 5173**: The Vite dev server is configured with `strictPort: true`. If port 5173 is taken, it will error instead of silently switching to 5174 (which would break OAuth redirects).
- **Production values**: When deploying, remember to update `DASHBOARD_URL` to `https://discord.teemate.gg`, `MONGODB_URI` to `mongodb://mongodb:27017/teemate`, and uncomment `TUNNEL_TOKEN` in your `.env`.
