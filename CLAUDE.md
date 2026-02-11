# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal Discord bot application built with Express.js. It implements a simple `/ping` slash command to demonstrate Discord's interactions API. It uses Discord's Components v2 API with the `discord-interactions` package.

## Environment Setup

Create a `.env` file with the following required variables:
- `APP_ID` - Discord application ID
- `DISCORD_TOKEN` - Bot token
- `PUBLIC_KEY` - Public key for verifying Discord requests
- `PORT` (optional) - Server port, defaults to 3000

## Common Commands

### Install dependencies
```bash
npm install
```

### Register slash commands with Discord
```bash
npm run register
```
This must be run whenever commands are modified in `commands.js`.

### Run the application
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### Set up ngrok for local development
```bash
ngrok http 3000
```
Configure the ngrok HTTPS URL + `/interactions` as the Interactions Endpoint URL in Discord Developer Portal.

## Architecture

### Core Files

- **app.js** - Main Express server and interaction handler
  - Single POST endpoint `/interactions` that handles all Discord interactions
  - Uses `verifyKeyMiddleware` to verify request signatures from Discord
  - Handles `PING` (verification) and `APPLICATION_COMMAND` (slash commands)
  - `/health` endpoint for Docker healthcheck

- **commands.js** - Command definitions and registration script
  - Exports `ALL_COMMANDS` array with slash command payloads
  - When executed directly (`npm run register`), installs commands globally via Discord API
  - Uses `InstallGlobalCommands` utility to bulk overwrite commands

- **utils.js** - Discord API helpers
  - `DiscordRequest()` - Wrapper for Discord API calls with authentication
  - `InstallGlobalCommands()` - Bulk command registration using bulk overwrite endpoint

### Interaction Flow

1. User executes `/ping` command → `APPLICATION_COMMAND` interaction
2. Bot responds with "🏓 Pong!" message using Components v2

### Key Patterns

- **Components v2**: All responses must include `InteractionResponseFlags.IS_COMPONENTS_V2` and structure components as arrays with explicit `type` fields
- **TEXT_DISPLAY component**: Used for simple text responses (`MessageComponentTypes.TEXT_DISPLAY`)
- **Integration types & contexts**: Commands support different integration types (0=guild, 1=user) and contexts (0=guild, 1=DM, 2=group DM)
- **Verification**: Discord sends `PING` interactions to verify the endpoint, respond with `PONG`

### Discord API Integration

- All interactions must respond within 3 seconds
- Interaction responses use `InteractionResponseType` constants
- Follow-up actions use webhook endpoints: `webhooks/${APP_ID}/${token}/messages/${messageId}`
- Commands support different integration types (guild, user) and contexts (guild, DM, group DM)

## Deployment and Updates

### Deployment Scripts

- **deploy.ps1** (Windows PowerShell) - Automated deployment script
- **deploy.sh** (Linux/Mac/WSL) - Automated deployment script

Both scripts:
- Create a compressed archive of the project (excluding node_modules, .git, logs)
- Transfer via SSH to the NAS
- Extract, rebuild Docker images, and restart containers
- Show status and logs after deployment

### Update Workflow

When making code changes:
1. Test locally with `npm start`
2. Commit changes to git
3. Deploy using `.\deploy.ps1 -Destination "user@nas-ip:/path"` (Windows) or `./deploy.sh user@nas-ip:/path` (Linux)
4. Verify logs: `ssh user@nas-ip "cd /path && docker-compose logs -f"`

### NAS Specifics

On Synology NAS, docker-compose is located at `/usr/local/bin/docker-compose` (not in standard PATH).

### Documentation

- **docs/DEPLOYMENT.md** - Complete deployment guide with Quick Start section, comprehensive updates guide, and detailed security analysis
- **docs/UPDATE.md** - Quick reference for common update operations
- **SECURITY.md** - Detailed security analysis and verification procedures
- **README.md** - General project overview with deployment section

## Examples Directory

The `examples/` folder contains feature-specific code samples demonstrating:
- Complete app.js with full game flow
- Button components
- Select menus
- Modal forms
- Command handling

Refer to these when implementing new interaction patterns.
