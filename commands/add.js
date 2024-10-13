const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a user to the current ticket')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add to the ticket')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;
        const userToAdd = interaction.options.getUser('user');

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Check if the user is already in the ticket
        if (channel.permissionsFor(userToAdd).has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ content: 'This user already has access to the ticket.', ephemeral: true });
        }

        try {
            // Add the user to the ticket channel
            await channel.permissionOverwrites.edit(userToAdd, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });

            // Create and send the embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('User Added to Ticket')
                .setDescription(`${userToAdd} has been added to the ticket by ${interaction.user}`)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Reply to the interaction
            await interaction.reply({ content: `Successfully added ${userToAdd} to the ticket.`, ephemeral: true });

        } catch (error) {
            console.error('Error adding user to ticket:', error);
            await interaction.reply({ content: 'There was an error adding the user to the ticket. Please try again.', ephemeral: true });
        }
    },
};