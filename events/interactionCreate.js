const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const { createTranscript } = require('discord-html-transcripts');

// Load configuration
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

async function userHasOpenTicket(guildId, userId) {
    const openTicket = await Ticket.findOne({ guildId, userId, open: true });
    return !!openTicket;
}

async function createTicket(guild, user, ticketTypeValue) {
    const category = await guild.channels.fetch(config.tickets.category);
    
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.id}-${ticketTypeValue}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
            {
                id: config.tickets.supportRole,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
        ],
    });

    // Save ticket to database
    await Ticket.create({
        userId: user.id,
        channelId: ticketChannel.id,
        guildId: guild.id
    });

    return ticketChannel;
}

async function closeTicket(channel, closedBy) {
    // Update ticket in database
    await Ticket.findOneAndUpdate(
        { channelId: channel.id },
        { open: false, closedAt: new Date() }
    );

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
            { name: 'Closed By', value: `<@${closedBy.id}>`, inline: true },
            { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    // Add opener information if available
    if (channel.ticketOpener) {
        closeEmbed.addFields(
            { name: 'Opened By', value: `<@${channel.ticketOpener.id}>`, inline: true },
            { name: 'Opened At', value: `<t:${Math.floor(channel.openTime / 1000)}:F>`, inline: true }
        );
    }

    // Send transcript and embed to designated channel
    const transcriptChannel = await channel.guild.channels.fetch(config.tickets.transcriptChannel);
    await transcriptChannel.send({
        embeds: [closeEmbed],
        files: [transcript],
    });

    // Send transcript and embed to the user who opened the ticket, if available
    if (channel.ticketOpener) {
        try {
            await channel.ticketOpener.send({
                content: `Your ticket ${channel.name} has been closed.`,
                embeds: [closeEmbed],
                files: [transcript],
            });
        } catch (error) {
            console.error('Error sending close notification to ticket opener:', error);
        }
    }

    // Delete the channel
    await channel.delete();
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'ticket_select') {
                const selectedValue = interaction.values[0];
                const ticketType = config.tickets.ticketTypes.find(type => type.name.toLowerCase().replace(/ /g, '_') === selectedValue);

                if (ticketType) {
                    const modal = new ModalBuilder()
                        .setCustomId(`ticket_modal_${selectedValue}`)
                        .setTitle(`Create ${ticketType.name} Ticket`);

                    ticketType.formFields.forEach((field, index) => {
                        const textInput = new TextInputBuilder()
                            .setCustomId(`field_${index}`)
                            .setLabel(field.label)
                            .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                            .setPlaceholder(field.placeholder)
                            .setRequired(field.required);

                        modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                    });

                    await interaction.showModal(modal);
                } else {
                    await interaction.reply({ content: 'Invalid ticket type selected.', ephemeral: true });
                }
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('ticket_modal_')) {
                const ticketTypeValue = interaction.customId.split('ticket_modal_')[1];
                const ticketType = config.tickets.ticketTypes.find(type => type.name.toLowerCase().replace(/ /g, '_') === ticketTypeValue);
                
                if (!ticketType) {
                    await interaction.reply({ content: 'Invalid ticket type. Please try again.', ephemeral: true });
                    return;
                }

                const responses = [];

                ticketType.formFields.forEach((field, index) => {
                    const response = interaction.fields.getTextInputValue(`field_${index}`);
                    responses.push(`${field.label}: ${response}`);
                });

                try {
                    const guild = interaction.guild;
                    
                    // Check if user already has an open ticket
                    const hasOpenTicket = await userHasOpenTicket(guild.id, interaction.user.id);
                    if (hasOpenTicket) {
                        await interaction.reply({ 
                            content: 'You already have an open ticket. Please use your existing ticket or close it before creating a new one.', 
                            ephemeral: true 
                        });
                        return;
                    }

                    const ticketChannel = await createTicket(guild, interaction.user, ticketTypeValue);

                    const embed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle(`New ${ticketType.name} Ticket`)
                        .setDescription(`Ticket created by ${interaction.user}`)
                        .addFields(responses.map(response => {
                            const [name, value] = response.split(': ');
                            return { name, value };
                        }))
                        .setTimestamp();

                    const closeButton = new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger);

                    const transcriptButton = new ButtonBuilder()
                        .setCustomId('get_transcript')
                        .setLabel('Get Transcript')
                        .setEmoji('📓')
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder()
                        .addComponents(closeButton, transcriptButton);

                    const initialMessage = await ticketChannel.send({ 
                        content: `<@${interaction.user.id}> <@&${config.tickets.supportRole}>`,
                        embeds: [embed],
                        components: [row]
                    });

                    // Store the ticket opener and open time in the channel
                    ticketChannel.ticketOpener = interaction.user;
                    ticketChannel.openTime = initialMessage.createdTimestamp;

                    await interaction.reply({ 
                        content: `Ticket created! Please check ${ticketChannel}`, 
                        ephemeral: true 
                    });

                } catch (error) {
                    console.error('Error creating ticket:', error);
                    await interaction.reply({ 
                        content: 'There was an error creating your ticket. Please try again later.', 
                        ephemeral: true 
                    });
                }
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'close_ticket') {
                await closeTicket(interaction.channel, interaction.user);
                await interaction.reply({ content: 'Closing the ticket...', ephemeral: true });
            } else if (interaction.customId === 'get_transcript') {
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
            }
        }
    },
};