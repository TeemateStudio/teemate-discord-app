import { SlashCommandBuilder } from 'discord.js';
import db from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cancel')
        .setDescription("Se retirer de la file d'attente."),
    async execute(interaction) {
        const result = db.prepare('DELETE FROM queues WHERE discord_id = ?').run(interaction.user.id);

        if (result.changes > 0) {
            await interaction.reply({ content: "Tu as été retiré de la file d'attente.", ephemeral: true });
        } else {
            await interaction.reply({ content: "Tu n'es dans aucune file d'attente.", ephemeral: true });
        }
    },
};