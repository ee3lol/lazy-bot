import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors, MessageFlags, ButtonStyle } from 'discord.js';
import { RegisterType, SlashCommand } from '../../../handler';
import { checkAccess } from '../../../utils/checkAccess';
import { safeReply } from '../../../utils/safeReply';
import { EmbedPaginator } from '../../../handler/utils/EmbedPaginator';
import { PaginatorButtonType } from '../../../handler/types/Paginator';

export default new SlashCommand({
  registerType: RegisterType.Guild,
  allowedChannels: ["1387503579186597968"],
  
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List your generated keys')
    .addSubcommand(subcommand => 
      subcommand
        .setName('keys')
        .setDescription('List all your generated keys')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const accessCheck = await checkAccess(interaction);
      if (!accessCheck.hasAccess || !accessCheck.user) {
        if (accessCheck.errorEmbed) {
          await interaction.reply({ 
            embeds: [accessCheck.errorEmbed], 
            flags: [MessageFlags.Ephemeral]
          });
        }
        return;
      }

      const user = accessCheck.user;
    
      
        const generatedKeys = user?.generatedKeys && Array.isArray(user.generatedKeys) ? user.generatedKeys : [];
      
      if (!generatedKeys || generatedKeys.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🔑 No Keys Found')
          .setDescription('You have not generated any keys yet.')
          .setColor(Colors.Blue);
          
        await interaction.reply({ 
          embeds: [embed], 
          flags: [MessageFlags.Ephemeral]
        });
        return;
      }

      const sortedKeys = [...generatedKeys].sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
      const itemsPerPage = 5;
      const pages = [];
      
      for (let i = 0; i < sortedKeys.length; i += itemsPerPage) {
        const pageKeys = sortedKeys.slice(i, i + itemsPerPage);
        const description = pageKeys.map((key, index) => {
          const keyNum = i + index + 1;
          const createdAt = key.createdAt ? new Date(key.createdAt).toLocaleString() : 'Unknown';
          return `**${keyNum}.** \`${key.value}\` - ${key.days} days\n   Created: ${createdAt}\n   Note: ${key.note || 'No note'}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
          .setTitle('🔑 Your Generated Keys')
          .setDescription(description)
          .setColor(Colors.Green)
          .setFooter({ 
            text: `Page ${Math.floor(i / itemsPerPage) + 1} of ${Math.ceil(sortedKeys.length / itemsPerPage)} • Total keys: ${sortedKeys.length}` 
          });

        pages.push({ embed });
      }

      if (pages.length === 1) {
        await interaction.reply({ 
          embeds: [pages[0].embed], 
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        const paginator = new EmbedPaginator({
          pages,
          timeout: 300000,
          buttons: [
            { type: PaginatorButtonType.First, emoji: '⏮️' },
            { type: PaginatorButtonType.Previous, emoji: '◀️' },
            { type: PaginatorButtonType.Next, emoji: '▶️' },
            { type: PaginatorButtonType.Last, emoji: '⏭️' }
          ],
          showButtonsAfterTimeout: false,
          loopPages: true,
          autoPageDisplay: true,
          restrictToAuthor: true
        });

        await paginator.send({
          context: interaction,
          ephemeral: true,
          followUp: false
        });
      }

    } catch (error) {
      console.error('Error listing keys:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching your keys. Please try again later.')
        .setColor(Colors.Red);
        
      try {
        await safeReply(interaction, { embeds: [errorEmbed] });
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  }
});
