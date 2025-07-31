import { Button } from '../../handler';
import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, TextBasedChannel, MessageFlags } from 'discord.js';

function isTextChannelWithName(channel: TextBasedChannel | null): channel is TextChannel {
  return channel !== null && 'name' in channel && channel.name !== null;
}

function isDeletableChannel(channel: TextBasedChannel | null): channel is TextChannel & { deletable: boolean } {
  return channel !== null && 'deletable' in channel && typeof channel.deletable === 'boolean';
}

export default new Button({
  customId: 'close_application',

  async execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.channel || !interaction.guild) return;

    try {
      if (!isTextChannelWithName(interaction.channel) || !interaction.channel.name.startsWith('application-')) {
        await interaction.reply({
          content: 'This command can only be used in application channels.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
      
      const appChannel = interaction.channel as TextChannel;
      const disabledButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_application')
            .setLabel('Closing...')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

      await interaction.update({ components: [disabledButton] });

      if ('send' in appChannel) {
        try {
          await appChannel.send(`This application is being closed by ${interaction.user}.`);
        } catch (error) {
          console.error('Failed to send closing message:', error);
        }
      }

      setTimeout(async () => {
        try {
          if (isDeletableChannel(appChannel) && appChannel.deletable) {
            await appChannel.delete('Application closed');
          }
        } catch (error) {
          console.error('Failed to delete application channel:', error);
        }
      }, 3000);

    } catch (error) {
      console.error('Error in close application handler:', error);
      try {
        const content = interaction.replied || interaction.deferred 
          ? 'An error occurred while closing the application.'
          : 'An error occurred while closing the application.';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, flags: [MessageFlags.Ephemeral] });
        } else {
          await interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
        }
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  },
});
