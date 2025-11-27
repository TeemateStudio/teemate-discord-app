import { Collection, Events, MessageFlags } from 'discord.js';

export const name = Events.InteractionCreate;
export async function execute(interaction) {
    if (interaction.isChatInputCommand()){
        const command = interaction.client.commands.get(interaction.commandName);

        const { cooldowns } = interaction.client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }
        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1_000);
                const locales = {
                    fr: `Veuillez attendre <t:${expiredTimestamp}:R> avant de réutiliser la commande \`${command.data.name}\`.`,
                };
                return interaction.reply({
                    content: locales[interaction.locale] ?? `Please wait <t:${expiredTimestamp}:R> before reusing the \`${command.data.name}\` command.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    } else if (interaction.isStringSelectMenu() || interaction.isButton()) {
        // Ajout de la logique pour les composants
        const commandName = 'play'; // On suppose que ces interactions appartiennent à la commande 'play'
        
        // On vérifie si les customId correspondent à ceux de la commande 'play'
        const isPlayInteraction = ['game_select', 'mode_select', 'queue_join', 'queue_cancel_picker'].includes(interaction.customId);

        if (isPlayInteraction) {
            const command = interaction.client.commands.get(commandName);
            if (!command) {
                console.error(`Command ${commandName} not found for component interaction.`);
                return;
            }
            try {
                // On exécute la commande 'play' avec l'interaction du composant
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing component for ${commandName}`, error);
            }
        }
    }
}