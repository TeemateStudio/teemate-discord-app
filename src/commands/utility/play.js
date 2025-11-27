import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import db from '../../db.js';	
import { games } from '../../mocks.js';

const picks = new Map(); // userId -> { game?: string, mode?: string }

function buildPlayUI(sel = {}) {
  const selectedGame = games.find(g => g.value === sel.game);

  const gameMenu = new StringSelectMenuBuilder()
    .setCustomId('game_select')
    .setPlaceholder('Choisis ton jeu')
    .addOptions(games.map(g => ({ ...g, default: sel.game === g.value })))
    .setMinValues(1).setMaxValues(1);

  const modeOptions = selectedGame 
    ? selectedGame.modes.map(m => ({ ...m, default: sel.mode === m.value }))
    : [];

  const modeMenu = new StringSelectMenuBuilder()
    .setCustomId('mode_select')
    .setPlaceholder(sel.mode ? modeOptions?.find(m => m.value === sel.mode)?.label : 'Choisis ton mode')
    .setOptions(modeOptions.length > 0 ? modeOptions : [{ label: 'Sélectionne un jeu d\'abord', value: 'disabled', default: false }])
	.setDisabled(!sel.game)
    .setMinValues(1).setMaxValues(1);

  const rows = [
    new ActionRowBuilder().addComponents(gameMenu),
    new ActionRowBuilder().addComponents(modeMenu)
  ];

  const canJoin = !!sel.game && !!sel.mode;
  const join = new ButtonBuilder()
    .setCustomId('queue_join')
    .setLabel(sel.game && sel.mode ? `Rejoindre: ${selectedGame?.label} / ${modeOptions.find(m => m.value === sel.mode)?.label}` : 'Rejoindre')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!canJoin);

  const cancel = new ButtonBuilder()
    .setCustomId('queue_cancel_picker')
    .setLabel('Annuler')
    .setStyle(ButtonStyle.Secondary);

  rows.push(new ActionRowBuilder().addComponents(join, cancel));
  return rows;
}

export default {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Join the play queue for a game/mode'),
    async execute(interaction) {
        if (interaction.isChatInputCommand() && interaction.commandName === 'play') {
			// éviter doublons
			const exists = db.prepare('SELECT game, mode, enqueued_at FROM queues WHERE discord_id=?').get(interaction.user.id);
			if (exists) {
				const game = games.find(g => g.value === exists.game);
				const mode = game?.modes.find(m => m.value === exists.mode);
				return interaction.reply({ content: `Tu es déjà en file pour le jeu ${game?.label} / ${mode?.label} <t:${Math.floor(exists.enqueued_at / 1000)}:R>.`, ephemeral: true });
			}

			picks.set(interaction.user.id, {}); // reset
			return interaction.reply({
			content: 'Sélectionne **jeu** et **mode** puis clique **Rejoindre**.',
			components: buildPlayUI(),
			ephemeral: true
			});
		}

		// 2) Sélections
		if (interaction.isStringSelectMenu() && (interaction.customId === 'game_select' || interaction.customId === 'mode_select')) {
			const cur = picks.get(interaction.user.id) || {};
			if (interaction.customId === 'game_select') {
				cur.game = interaction.values[0];
				delete cur.mode; // Réinitialise le mode si le jeu change
			}
			if (interaction.customId === 'mode_select') cur.mode = interaction.values[0];
			picks.set(interaction.user.id, cur);
			return interaction.update({ components: buildPlayUI(cur) }); // met à jour le bouton
		}

		// 3) Bouton "Annuler" du picker
		if (interaction.isButton() && interaction.customId === 'queue_cancel_picker') {
			picks.delete(interaction.user.id);
			return interaction.update({ content: 'Sélection annulée.', components: [] });
		}

		// 4) Bouton "Rejoindre" → enfile et essaie de matcher
		if (interaction.isButton() && interaction.customId === 'queue_join') {
			await interaction.deferUpdate({ ephemeral: true });

			const sel = picks.get(interaction.user.id);
			if (!sel?.game || !sel?.mode) {
			return interaction.editReply({ content: 'Choisis d’abord jeu et mode.', ephemeral: true });
			}
			// éviter doublons
			const exists = db.prepare(
			'SELECT game, mode FROM queues WHERE discord_id=?'
			).get(interaction.user.id);
			if (exists) {
				const game = games.find(g => g.value === exists.game);
				const mode = game?.modes.find(m => m.value === exists.mode);
				return interaction.editReply({ content: `Tu es déjà en file pour le jeu ${game?.label} et le mode ${mode?.label}.`, components: [] });
			}

			db.prepare(
			'INSERT INTO queues(discord_id, game, mode, enqueued_at) VALUES (?,?,?,?)'
			).run(interaction.user.id, sel.game, sel.mode, Date.now());

			await interaction.editReply({ content: `Inscrit sur **${sel.game} / ${sel.mode}** <t:${Math.floor(Date.now() / 1000)}:R>. Recherche de joueurs en cours...`, components: [] });

			// Simule un long processus avec un sleep de 3 secondes
			await new Promise(resolve => setTimeout(resolve, 10000));
			db.prepare(
			'DELETE FROM queues WHERE discord_id = ?'
			).run(interaction.user.id);

			await interaction.editReply({ content: `Joueur trouvé`, components: [] });
			// essaie de matcher dans le même salon où /play a été tapé
			tryMatch(interaction.guild, sel.game, sel.mode, interaction.channel);
		}
    },
}