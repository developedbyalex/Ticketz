// commands/alert.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { handleCloseTicket } = require('../ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Set an inactivity alert for the ticket'),
  async execute(interaction, client) {
    // Check if the channel is a ticket
    if (!interaction.channel.topic || !interaction.channel.topic.includes('|')) {
      return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
    }

    const config = client.config;
    const inactivityTime = config.inactivityTimeout * 60 * 1000; // Convert minutes to milliseconds
    const closeTime = Math.floor((Date.now() + inactivityTime) / 1000);

    const embed = new EmbedBuilder()
      .setColor(config.panelColor)
      .setTitle('Inactivity Alert')
      .setDescription(`If this ticket has no activity by <t:${closeTime}:F> (<t:${closeTime}:R>), it will be automatically closed. If you're finished with this ticket, click the close button below.`);

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    const alertMessage = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Set up the inactivity check
    const checkInactivity = async () => {
      const messages = await interaction.channel.messages.fetch({ limit: 1, after: alertMessage.id });
      if (messages.size === 0) {
        // No new messages, close the ticket
        const closeInteraction = { 
          channel: interaction.channel,
          guild: interaction.guild,
          user: interaction.user,
          client: client,
          customId: 'close_ticket'
        };
        await handleCloseTicket(closeInteraction, client, `Automatically closed due to inactivity (/alert ran by ${interaction.user})`);
      } else {
        // There was activity, remove the alert message
        await alertMessage.delete().catch(console.error);
      }
    };

    // Schedule the inactivity check
    setTimeout(checkInactivity, inactivityTime);
  },
};