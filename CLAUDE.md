# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot application built with Express.js that implements an interactive rock-paper-scissors-style game using Discord's slash commands and message components. It uses Discord's Components v2 API with the `discord-interactions` package.

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
  - Handles `PING` (verification), `APPLICATION_COMMAND` (slash commands), and `MESSAGE_COMPONENT` (button/select interactions)
  - Manages `activeGames` object as in-memory state (should use database in production)

- **commands.js** - Command definitions and registration script
  - Exports `ALL_COMMANDS` array with slash command payloads
  - When executed directly (`npm run register`), installs commands globally via Discord API
  - Uses `InstallGlobalCommands` utility to bulk overwrite commands

- **game.js** - Game logic and choices
  - Defines `RPSChoices` object mapping game objects to their win conditions and verbs
  - `getResult()` - Determines winner between two players and formats result message
  - `getShuffledOptions()` - Returns randomized options for select menus

- **utils.js** - Discord API helpers
  - `DiscordRequest()` - Wrapper for Discord API calls with authentication
  - `InstallGlobalCommands()` - Bulk command registration
  - Helper functions: `getRandomEmoji()`, `capitalize()`

### Interaction Flow

1. User executes slash command → `APPLICATION_COMMAND` interaction
2. Bot responds with button component → stores game state in `activeGames[interactionId]`
3. Another user clicks button → `MESSAGE_COMPONENT` interaction
4. Bot responds with ephemeral select menu
5. User selects choice → `MESSAGE_COMPONENT` interaction
6. Bot calculates result, deletes game state, posts winner message

### Key Patterns

- **Components v2**: All responses must include `InteractionResponseFlags.IS_COMPONENTS_V2` and structure components as arrays with explicit `type` fields
- **Context-aware user IDs**: User ID is in `req.body.member.user.id` for guild contexts (context=0) and `req.body.user.id` for DMs (context=1,2)
- **Custom IDs**: Component custom_ids encode game state (e.g., `accept_button_${gameId}`, `select_choice_${gameId}`)
- **Ephemeral messages**: Use `InteractionResponseFlags.EPHEMERAL` for private responses
- **Message updates**: Use webhook endpoints to update or delete messages after initial response

### Discord API Integration

- All interactions must respond within 3 seconds
- Interaction responses use `InteractionResponseType` constants
- Follow-up actions use webhook endpoints: `webhooks/${APP_ID}/${token}/messages/${messageId}`
- Commands support different integration types (guild, user) and contexts (guild, DM, group DM)

## Examples Directory

The `examples/` folder contains feature-specific code samples demonstrating:
- Complete app.js with full game flow
- Button components
- Select menus
- Modal forms
- Command handling

Refer to these when implementing new interaction patterns.
