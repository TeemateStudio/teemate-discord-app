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

const ALL_COMMANDS = [PING_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
