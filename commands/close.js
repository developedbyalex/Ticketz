const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const yaml = require('js-yaml');
const fs = require('fs');

// Load configuration
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        // Create transcript
        const transcript = await createTranscript(channel, {
            limit: -1,
            fileName: `${channel.name}-transcript.html`,
        });

        // Create close embed
        const closeEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`Ticket Closed: ${channel.name}`)
            .addFields(
                { name: 'Opened By', value: `<@${channel.ticketOpener.id}>`, inline: true },
                { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Opened At', value: `<t:${Math.floor(channel.openTime / 1000)}:F>`, inline: true },
                { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        // Send transcript and embed to designated channel
        const transcriptChannel = await interaction.guild.channels.fetch(config.tickets.transcriptChannel);
        await transcriptChannel.send({
            embeds: [closeEmbed],
            files: [transcript],
        });

        // Send transcript and embed to the user who opened the ticket
        await channel.ticketOpener.send({
            content: `Your ticket ${channel.name} has been closed.`,
            embeds: [closeEmbed],
            files: [transcript],
        });

        // Inform users that the ticket is being closed
        await interaction.reply({ content: 'Closing the ticket...', ephemeral: true });

        // Close the ticket
        await channel.delete();
    },
};