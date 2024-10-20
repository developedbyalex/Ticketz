const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const { handleTicketCreation, handleModalSubmit, handleCloseTicket } = require('./ticketHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

function loadCommands() {
  const commands = [];
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
  return commands;
}

async function refreshCommands() {
  const commands = loadCommands();
  const rest = new REST({ version: '10' }).setToken(client.config.token);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  refreshCommands();
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      if (interaction.commandName === 'refresh') {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
          return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
        await refreshCommands();
        await interaction.reply({ content: 'Commands refreshed successfully!', ephemeral: true });
      } else {
        await command.execute(interaction, client);
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'create_ticket') {
      await handleTicketCreation(interaction, client);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('ticket_')) {
      await handleModalSubmit(interaction, client);
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === 'close_ticket') {
      await handleCloseTicket(interaction, client);
    }
  }
});

client.on('guildMemberRemove', async (member) => {
  const guild = member.guild;
  const config = client.config;

  // Get all text channels in the ticket category
  const ticketCategory = await guild.channels.fetch(config.ticketCategory);
  const ticketChannels = ticketCategory.children.cache.filter(channel => channel.type === ChannelType.GuildText);

  for (const [, channel] of ticketChannels) {
    // Check if the channel topic contains the member's ID
    if (channel.topic && channel.topic.split('|')[0].trim() === member.id) {
      const embed = new EmbedBuilder()
        .setColor(config.panelColor)
        .setDescription(config.messages.ticketCreatorLeft.replace('{user}', member.toString()));

      // Create close button
      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      await channel.send({ embeds: [embed], components: [row] });
    }
  }
});

client.login(client.config.token);