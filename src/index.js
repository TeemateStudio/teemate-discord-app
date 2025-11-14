import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { getAllCommands } from './utils.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection(); 
client.cooldowns = new Collection();

// Charger les commandes
const commands = await getAllCommands();
for (const command of commands) {
	client.commands.set(command.data.name, command);
}

// Charger les événements
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file).replace(/\\/g, '/');
	const fileUrl = `file://${filePath}`;
	const event = (await import(fileUrl));
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

client.login(process.env.DISCORD_TOKEN);