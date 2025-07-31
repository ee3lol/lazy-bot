import { Button } from '../../handler';
import { ButtonInteraction, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { canReapply } from '../../schemas/Application';

export default new Button({
  customId: 'apply',

  async execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) return;

    // Check for any existing application channels for this user
    const existingApplications = interaction.guild.channels.cache.filter(channel => 
      channel.type === ChannelType.GuildText && 
      channel.name.startsWith('application-') &&
      (channel as TextChannel).permissionOverwrites.cache.has(interaction.user.id)
    );

    if (existingApplications.size > 0) {
      const existingApp = existingApplications.first() as TextChannel;
      await interaction.reply({
        content: `You already have an application in progress: ${existingApp}`,
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
    
    try {
      // Create a private channel for the application
      const appChannel = await interaction.guild.channels.create({
        name: `application-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: '1394023186449829969', // Same category as tickets, adjust if needed
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

      // Check if user can reapply
      const { canReapply: canApply, daysLeft } = await canReapply(interaction.user.id);
      
      if (!canApply) {
        await interaction.reply({
          content: `❌ You cannot apply again yet. Please wait ${daysLeft} more days before reapplying.`,
          ephemeral: true
        });
        return;
      }

      // Send application message
      const applicationEmbed = new EmbedBuilder()
        .setTitle(`${interaction.user.username} Application`)
        .setDescription(`Thank you for your interest in joining our platform!
All questions during the interview process are unique for every application.

A staff member will handle your application as soon as possible.

**Note:** If your application is denied, you will need to wait 31 days before reapplying.`)
        .setColor('#2f3136') // Discord dark theme color
        .setFooter({ text: 'We appreciate your patience.' });

      const closeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('close_application')
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
      );

      await appChannel.send({
        embeds: [applicationEmbed],
        components: [closeButton]
      });

      // Send confirmation to the user
      await interaction.reply({
        content: `Your application has been started: ${appChannel}`,
        flags: [MessageFlags.Ephemeral]
      });

    } catch (error) {
      console.error('Error creating application:', error);
      await interaction.reply({
        content: 'An error occurred while creating your application. Please try again later.',
        flags: [MessageFlags.Ephemeral]
      });
    }
  },
});
