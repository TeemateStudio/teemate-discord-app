import { SlashCommandBuilder } from 'discord.js';
import db from '../../db.js';
import { games } from '../../mocks.js';

export default {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription("Vérifier ton statut dans la file d'attente."),
    async execute(interaction) {
        const row = db.prepare('SELECT game, mode FROM queues WHERE discord_id = ?').get(interaction.user.id);

        if (row) {
            const game = games.find(g => g.value === row.game);
            const mode = game?.modes.find(m => m.value === row.mode);

            const gameLabel = game?.label || row.game;
            const modeLabel = mode?.label || row.mode;

            await interaction.reply({ content: `Tu es dans la file pour **${gameLabel} / ${modeLabel}**.`, ephemeral: true });
        } else {
            await interaction.reply({ content: "Tu n'es dans aucune file d'attente.", ephemeral: true });
        }
    },
};