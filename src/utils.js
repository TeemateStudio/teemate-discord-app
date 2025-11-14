import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function getAllCommands() {
  const commands = [];
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Grab all the command folders from the commands directory you created earlier
  const foldersPath = join(__dirname, 'commands');
  const commandFolders = readdirSync(foldersPath);
  
  for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file).replace(/\\/g, '/');
      // The path needs to be a file URL for dynamic import.
      const fileUrl = `file://${filePath}`;
      const command = (await import(fileUrl)).default;
      if ('data' in command && 'execute' in command) {
        commands.push(command);
      } else {
        console.log(`[WARNING] The command at ${fileUrl} is missing a required "data" or "execute" property.`);
      }
    }
  }
  return commands;
}