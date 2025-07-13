import { Button } from '../../handler';
import { ButtonInteraction, CategoryChannel, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, TextChannel } from 'discord.js';

export default new Button({
  customId: 'support',

  async execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) return;

    // Check for any existing ticket channels for this user across the entire server
    const existingTickets = interaction.guild.channels.cache.filter(channel => 
      channel.type === ChannelType.GuildText && 
      channel.name.toLowerCase().startsWith('ticket-') &&
      (channel as TextChannel).permissionOverwrites.cache.has(interaction.user.id)
    );

    if (existingTickets.size > 0) {
      const existingTicket = existingTickets.first() as TextChannel;
      await interaction.reply({
        content: `You already have an open ticket: ${existingTicket}`,
        ephemeral: true
      }).catch(console.error);
      return;
    }
    
    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: '1394023186449829969',
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: interaction.client.user!.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`Ticket - ${interaction.user.username}`)
        .setDescription('Support will be with you shortly. Please describe your issue in detail.')
        .setColor('#0099ff')
        .setFooter({ text: `Ticket created by ${interaction.user.tag}` })
        .setTimestamp();

      const closeButton = {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: 'Close Ticket',
            customId: 'close_ticket',
            emoji: '🔒',
          },
        ],
      };

      await ticketChannel.send({
        content: `${interaction.user}, welcome to your ticket!`,
        embeds: [welcomeEmbed],
        components: [closeButton],
      });

      // Send confirmation to the user
      await interaction.reply({
        content: `Your ticket has been created: ${ticketChannel}`,
        flags: [MessageFlags.Ephemeral]
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      await interaction.reply({
        content: 'An error occurred while creating your ticket. Please try again later.',
         flags: [MessageFlags.Ephemeral]
      });
    }
  },
});
