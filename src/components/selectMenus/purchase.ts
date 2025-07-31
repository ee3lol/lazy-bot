import { SelectMenu } from '../../handler';
import { 
  type AnySelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  MessageFlags
} from 'discord.js';

const REQUIRED_ROLE_ID = '1400348606052958269';
const APPLICATION_CHANNEL_ID = '1399361553811247204';
const TICKET_CATEGORY_ID = '1394023186449829969';
const PRODUCT_CATEGORY_ID = '1398261425188769994';

export default new SelectMenu({
  customId: 'purchase_select',

  async execute(interaction: AnySelectMenuInteraction, values: string[], uniqueIds: (string | null)[]): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;

    try {
      // Check if user has required role
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
        await interaction.reply({
          content: `❌ You need to be approved to make a purchase. Please apply at <#${APPLICATION_CHANNEL_ID}> first.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const [selectedProductId] = values;
      const productChannel = interaction.guild.channels.cache.get(selectedProductId);
      
      if (!productChannel || !('name' in productChannel)) {
        await interaction.reply({
          content: '❌ Error: Product not found.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Create ticket channel
      const ticketChannel = await interaction.guild.channels.create({
        name: `purchase-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
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

      // Send ticket message
      const ticketEmbed = new EmbedBuilder()
        .setTitle(`Purchase Request - ${productChannel.name}`)
        .setDescription(`**Customer:** ${interaction.user.tag} (${interaction.user.id})`)
        .addFields(
          { name: 'Product', value: `${productChannel}` },
        )
        .setColor(Colors.Gold)
        .setTimestamp();

      const closeButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        ) as ActionRowBuilder<ButtonBuilder>;

      await ticketChannel.send({
        content: `${interaction.user}, a staff member will assist you with your purchase of ${productChannel}.`,
        embeds: [ticketEmbed],
        components: [closeButton]
      });

      // Send confirmation to user
      await interaction.reply({
        content: `Your purchase request has been created: ${ticketChannel}`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error('Error in purchase select menu:', error);
      await interaction.reply({
        content: 'An error occurred while processing your request. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }
  },
});
