const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

// Map to store ticket close timers
const ticketCloseTimers = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Alert that the ticket will be closed in 12 hours if inactive')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Cancel any existing timer for this channel
        if (ticketCloseTimers.has(channel.id)) {
            clearTimeout(ticketCloseTimers.get(channel.id));
        }

        // Calculate the close time (12 hours from now)
        const closeTime = Date.now() + 12 * 60 * 60 * 1000;

        // Create the alert embed
        const alertEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Ticket Closure Notification')
            .setDescription(`This ticket will be closed <t:${Math.floor(closeTime / 1000)}:R> if no response has been received.`)
            .setTimestamp();

        // Create the close ticket button
        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        // Send the alert message
        const alertMessage = await channel.send({ embeds: [alertEmbed], components: [row] });

        // Set up the timer to close the ticket
        const timerId = setTimeout(async () => {
            // Check if the alert message still exists
            try {
                await channel.messages.fetch(alertMessage.id);
                // If the message exists, close the ticket
                await channel.delete();
            } catch (error) {
                // If the message doesn't exist, do nothing (ticket was likely manually closed or alert was cancelled)
            }
        }, 12 * 60 * 60 * 1000);

        // Store the timer ID
        ticketCloseTimers.set(channel.id, timerId);

        // Set up a message listener to cancel the timer if there's activity
        const filter = m => !m.author.bot;
        const collector = channel.createMessageCollector({ filter });

        collector.on('collect', async () => {
            // Cancel the timer
            clearTimeout(ticketCloseTimers.get(channel.id));
            ticketCloseTimers.delete(channel.id);

            // Delete the alert message
            try {
                await alertMessage.delete();
            } catch (error) {
                console.error('Error deleting alert message:', error);
            }

            // Stop the collector
            collector.stop();
        });

        await interaction.reply({ content: 'Alert has been set. The ticket will close in 12 hours if inactive.', ephemeral: true });
    },
};