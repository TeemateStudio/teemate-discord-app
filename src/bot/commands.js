import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Simple ping command
const PING_COMMAND = {
  name: 'ping',
  description: 'Responds with Pong!',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

export const ALL_COMMANDS = [PING_COMMAND];

// When run directly, register commands with Discord
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule || process.argv[1]?.includes('commands')) {
  InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
}
