import { ChatInputCommandInteraction, TextChannel } from "discord.js";

export async function safeReply(interaction: ChatInputCommandInteraction, options: { embeds?: any[], content?: string, ephemeral?: boolean }) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(options);
    } else {
      await interaction.reply({ ...options, ephemeral: options.ephemeral ?? true, fetchReply: true });
    }
    return true;
  } catch (error: any) {
    if (error.code === 10062) { // Unknown interaction
      try {
        const channel = interaction.channel as TextChannel;
        if (channel) {
          await channel.send({
            content: `<@${interaction.user.id}> Your key generation is complete!`,
            embeds: options.embeds,
          });
          return true;
        }
      } catch (fallbackError) {
        console.error('Failed to send fallback message:', fallbackError);
      }
    }
    console.error('Failed to send interaction reply:', error);
    return false;
  }
}