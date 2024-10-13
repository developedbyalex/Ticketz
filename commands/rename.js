const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Rename the current ticket')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The new name for the ticket')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;
        const newName = interaction.options.getString('name');

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Ensure the new name starts with 'ticket-'
        const formattedNewName = newName.startsWith('ticket-') ? newName : `ticket-${newName}`;

        try {
            // Rename the channel
            const oldName = channel.name;
            await channel.setName(formattedNewName);

            // Create and send the embed
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Ticket Renamed')
                .setDescription(`${interaction.user} has renamed the ticket`)
                .addFields(
                    { name: 'Old Name', value: oldName, inline: true },
                    { name: 'New Name', value: formattedNewName, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Reply to the interaction
            await interaction.reply({ content: `Successfully renamed the ticket to ${formattedNewName}.`, ephemeral: true });

        } catch (error) {
            console.error('Error renaming ticket:', error);
            await interaction.reply({ content: 'There was an error renaming the ticket. Please try again.', ephemeral: true });
        }
    },
};