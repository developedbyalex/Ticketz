const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a user from the current ticket')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove from the ticket')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;
        const userToRemove = interaction.options.getUser('user');

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Check if the user is in the ticket
        if (!channel.permissionsFor(userToRemove).has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ content: 'This user does not have access to the ticket.', ephemeral: true });
        }

        // Check if the user is the ticket opener
        if (channel.ticketOpener && channel.ticketOpener.id === userToRemove.id) {
            return interaction.reply({ content: 'You cannot remove the user who opened the ticket.', ephemeral: true });
        }

        try {
            // Remove the user from the ticket channel
            await channel.permissionOverwrites.delete(userToRemove);

            // Create and send the embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('User Removed from Ticket')
                .setDescription(`${userToRemove} has been removed from the ticket by ${interaction.user}`)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            // Reply to the interaction
            await interaction.reply({ content: `Successfully removed ${userToRemove} from the ticket.`, ephemeral: true });

        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({ content: 'There was an error removing the user from the ticket. Please try again.', ephemeral: true });
        }
    },
};