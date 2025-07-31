import { ActionRowBuilder, ChannelType, EmbedBuilder, Message, StringSelectMenuBuilder, TextChannel } from 'discord.js';
import { PrefixCommand } from '../../handler';

// Helper function to clean up channel names
function formatChannelName(name: string): string {
  // Remove the initial emoji and pipe (🟢｜) if present
  const withoutEmoji = name.replace(/^[^\w\s]+\s*\|?\s*/, '');
  
  // Convert to uppercase and clean up any remaining special characters
  const cleaned = withoutEmoji
    .replace(/[\-\_\s]+/g, ' ') // Replace separators with single space
    .trim()
    .toUpperCase();
  
  return cleaned || 'PRODUCT';
}

const PRODUCT_CATEGORY_ID = '1398261425188769994';

export default new PrefixCommand({
  name: 'purchase',
  aliases: ['buy'],
  userCooldown: 10,
  allowedRoles: ['1385996799918997685'], // Adjust role ID as needed

  async execute(message: Message): Promise<void> {
    if (!message.guild) return;
    const channel = message.channel as TextChannel;

    try {
      // Fetch all text channels from the product category
      const category = message.guild.channels.cache.get(PRODUCT_CATEGORY_ID);
      if (!category || category.type !== ChannelType.GuildCategory) {
        await channel.send('❌ Product category not found.');
        return;
      }

      const productChannels = category.children.cache.filter(
        ch => ch.type === ChannelType.GuildText
      );

      if (productChannels.size === 0) {
        await channel.send('❌ No products available at the moment.');
        return;
      }

      // Create the purchase embed
      const purchaseEmbed = new EmbedBuilder()
        .setTitle('🛒 Purchase Products')
        .setDescription('Select a product from the dropdown below to start your purchase.')
        .setColor('#9b59b6')
        .setFooter({ text: 'Galxy Inc. | Secure Purchase' });

      // Create the product select menu
      const productSelect = new StringSelectMenuBuilder()
        .setCustomId('purchase_select')
        .setPlaceholder('Select a product...')
        .addOptions(
          productChannels.map(channel => {
            const displayName = formatChannelName(channel.name);
            return {
              label: displayName,
              description: `Purchase ${displayName}`,
              value: channel.id,
            };
          })
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(productSelect);

      // Send the message with the dropdown
      await channel.send({
        embeds: [purchaseEmbed],
        components: [row]
      });

      // Delete the command message
      if (message.deletable) {
        await message.delete().catch(console.error);
      }

    } catch (error) {
      console.error('Error in purchase command:', error);
      await channel.send('❌ An error occurred while setting up the purchase menu.');
    }
  },
});
