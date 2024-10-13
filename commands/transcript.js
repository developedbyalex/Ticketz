const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Get a transcript of the current ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        const channel = interaction.channel;

        // Check if the channel is a ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: 'This command can only be used in ticket channels.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Create transcript
            const transcript = await createTranscript(channel, {
                limit: -1,
                fileName: `${channel.name}-transcript.html`,
            });

            // Create embed
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle(`Transcript: ${channel.name}`)
                .setDescription('The transcript of this ticket is attached.')
                .setTimestamp();

            // Send transcript to the user who requested it
            await interaction.user.send({
                content: `Here's the transcript for ${channel.name}`,
                embeds: [embed],
                files: [transcript],
            });

            // Reply to the interaction
            await interaction.editReply({ content: 'The transcript has been sent to your DMs.', ephemeral: true });

            // Send a message in the ticket channel
            const channelEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setDescription(`${interaction.user} has requested a transcript of this ticket.`)
                .setTimestamp();

            await channel.send({ embeds: [channelEmbed] });

        } catch (error) {
            console.error('Error creating transcript:', error);
            if (error.code === 50007) {
                await interaction.editReply({ content: 'I couldn\'t send you a DM. Please make sure your DMs are open and try again.', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'There was an error creating the transcript. Please try again.', ephemeral: true });
            }
        }
    },
};