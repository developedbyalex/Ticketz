const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

// Load configuration
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Create a ticket panel'),
    async execute(interaction) {
        // Check if the user has permission to create a panel
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Create a Ticket')
            .setDescription('Select the type of ticket you want to create from the dropdown menu below.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Select ticket type');

        config.tickets.ticketTypes.forEach(type => {
            selectMenu.addOptions({
                label: type.name,
                value: type.name.toLowerCase().replace(/ /g, '_'),
                description: type.description,
                emoji: type.emoji,
            });
        });

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        // Send the panel as a new message in the channel
        const message = await interaction.channel.send({ embeds: [embed], components: [row] });

        // Acknowledge the command usage with an ephemeral message
        await interaction.reply({ content: 'Ticket panel created successfully.', ephemeral: true });

        // Create a collector for the select menu
        const collector = message.createMessageComponentCollector({ time: 60000 }); // 60 seconds timeout

        collector.on('collect', async i => {
            if (i.customId === 'ticket_select') {
                const selectedValue = i.values[0];
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

                    await i.showModal(modal);
                } else {
                    await i.reply({ content: 'Invalid ticket type selected.', ephemeral: true });
                }
                
                try {
                    // Delete the original message
                    await message.delete();
                } catch (error) {
                    console.error('Error deleting message:', error);
                }
                
                collector.stop();
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                try {
                    // If no selection was made, remove the select menu
                    await message.delete();
                } catch (error) {
                    console.error('Error deleting message:', error);
                    // If deletion fails, try to send a new message
                    await interaction.followUp({ content: 'Ticket panel has expired.', ephemeral: true });
                }
            }
        });
    },
};