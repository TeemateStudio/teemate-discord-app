# Getting Started app for Discord

This project contains a basic rock-paper-scissors-style Discord app written in JavaScript, built for the [getting started guide](https://discord.com/developers/docs/getting-started).

![Demo of app](https://github.com/discord/discord-example-app/raw/main/assets/getting-started-demo.gif?raw=true)

## Project structure
Below is a basic overview of the project structure:

```
├── examples    -> short, feature-specific sample apps
│   ├── app.js  -> finished app.js code
│   ├── button.js
│   ├── command.js
│   ├── modal.js
│   ├── selectMenu.js
├── .env.sample -> sample .env file
├── app.js      -> main entrypoint for app
├── commands.js -> slash command payloads + helpers
├── game.js     -> logic specific to RPS
├── utils.js    -> utility functions and enums
├── package.json
├── README.md
└── .gitignore
```

## Running app locally

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/) and [create a Discord app](https://discord.com/developers/applications) with the proper permissions:
- `applications.commands`
- `bot` (with Send Messages enabled)


Configuring the app is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

### Setup project

First clone the project:
```
git clone https://github.com/discord/discord-example-app.git
```

Then navigate to its directory and install dependencies:
```
cd discord-example-app
npm install
```
### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`DISCORD_TOKEN`), and public key (`PUBLIC_KEY`).

Fetching credentials is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

> 🔑 Environment variables can be added to the `.env` file in Glitch or when developing locally, and in the Secrets tab in Replit (the lock icon on the left).

### Install slash commands

The commands for the example app are set up in `commands.js`. All of the commands in the `ALL_COMMANDS` array at the bottom of `commands.js` will be installed when you run the `register` command configured in `package.json`:

```
npm run register
```

### Run the app

After your credentials are added, go ahead and run the app:

```
node app.js
```

> ⚙️ A package [like `nodemon`](https://github.com/remy/nodemon), which watches for local changes and restarts your app, may be helpful while locally developing.

If you aren't following the [getting started guide](https://discord.com/developers/docs/getting-started), you can move the contents of `examples/app.js` (the finished `app.js` file) to the top-level `app.js`.

### Set up interactivity

The project needs a public endpoint where Discord can send requests. To develop and test locally, you can use something like [`ngrok`](https://ngrok.com/) to tunnel HTTP traffic.

Install ngrok if you haven't already, then start listening on port `3000`:

```
ngrok http 3000
```

You should see your connection open:

```
Tunnel Status                 online
Version                       2.0/2.0
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://1234-someurl.ngrok.io -> localhost:3000

Connections                  ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

Copy the forwarding address that starts with `https`, in this case `https://1234-someurl.ngrok.io`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your ngrok address there, and append `/interactions` to it (`https://1234-someurl.ngrok.io/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀

## Deploying with Docker and Cloudflare Tunnel

For production deployment on a NAS or server with Docker, this project includes a complete Docker setup with Cloudflare Tunnel integration for secure access.

### Quick Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick steps:**
1. Set up Cloudflare Tunnel and get your `TUNNEL_TOKEN`
2. Copy `.env.example` to `.env` and fill in your credentials
3. Deploy using the PowerShell script: `.\deploy.ps1 -Destination "user@nas-ip:/path/to/bot"`

**What you get:**
- 🐳 Docker containerization for easy deployment
- 🔒 Cloudflare Tunnel for secure, zero-trust access (no port forwarding needed)
- 🛡️ Your NAS never exposed to Internet - only outbound connections
- 🔄 Auto-restart on failures
- 📊 Health checks
- 📝 Log management

**Security:**
- ✅ No ports open on your router (no port forwarding)
- ✅ No direct exposure to Internet attacks
- ✅ End-to-end TLS encryption
- ✅ Docker isolation
- ✅ Cloudflare DDoS protection

For detailed security analysis, see [DEPLOYMENT.md - Security section](./docs/DEPLOYMENT.md#%EF%B8%8F-sécurité)

### Manual Docker deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Updating your deployment

After making code changes, redeploy using the deployment script:

**Windows:**
```powershell
.\deploy.ps1 -Destination "user@nas-ip:/path/to/bot"
```

**Linux/Mac:**
```bash
./deploy.sh user@nas-ip:/path/to/bot
```

The script automatically:
- ✅ Archives your code (excludes node_modules, .git, logs)
- 📤 Transfers to your NAS via SSH
- 🔧 Extracts and rebuilds Docker images
- 🚀 Restarts containers with zero downtime
- 📊 Shows status and recent logs

**For detailed update workflows, see the [deployment guide](./DEPLOYMENT.md#-mise-à-jour-de-lapplication)**

## Other resources
- Read **[the documentation](https://discord.com/developers/docs/intro)** for in-depth information about API features.
- Browse the `examples/` folder in this project for smaller, feature-specific code examples
- Join the **[Discord Developers server](https://discord.gg/discord-developers)** to ask questions about the API, attend events hosted by the Discord API team, and interact with other devs.
- Check out **[community resources](https://discord.com/developers/docs/topics/community-resources#community-resources)** for language-specific tools maintained by community members.
