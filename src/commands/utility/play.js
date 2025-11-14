import { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, TextDisplayBuilder, LabelBuilder, StringSelectMenuBuilder } from 'discord.js';

const games = [
	{ label: 'League of Legends', value: 'lol' },
	{ label: 'Overwatch', value: 'ow' },
	{ label: 'Counter-Strike: Global Offensive', value: 'csgo' },
	{ label: 'Fortnite', value: 'fortnite' },
	{ label: 'Apex Legends', value: 'apex' },
	{ label: 'Rainbow Six Siege', value: 'r6s' },
	{ label: 'Hearthstone', value: 'hs' },
	{ label: 'Dota 2', value: 'dota2' },
	{ label: 'World of Warcraft', value: 'wow' },
	{ label: 'Grand Theft Auto V', value: 'gta5' },
	{ label: 'Valorant', value: 'valorant' },
	{ label: 'Rocket League', value: 'rl' }
]

export default {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Join the play queue for a game/mode'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('myModal')
            .setTitle('My Modal');
        // Create the text input components
		const favoriteColorInput = new TextInputBuilder()
			.setCustomId('favoriteColorInput')
			// The label is the prompt the user sees for this input
			.setLabel("What's your favorite color?")
			// Short means only a single line of text
			.setStyle(TextInputStyle.Short);
		const hobbiesInput = new TextInputBuilder()
			.setCustomId('hobbiesInput')
			.setLabel("What's some of your favorite hobbies?")
			// Paragraph means multiple lines of text.
			.setStyle(TextInputStyle.Paragraph);
		// An action row only holds one text input,
		// so you need one action row per text input.
		const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
		const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);
		// Add inputs to the modal
        const label = new LabelBuilder()
            .setLabel("Games :")
            .setId(1)
            .setStringSelectMenuComponent(new StringSelectMenuBuilder()
				.setCustomId('test')
				.setPlaceholder('Select a game')
				.addOptions(games)
				.setMinValues(1));
        modal.addLabelComponents(label);
		modal.addComponents(firstActionRow);
		// Show the modal to the user
		await interaction.showModal(modal); 
    },
}