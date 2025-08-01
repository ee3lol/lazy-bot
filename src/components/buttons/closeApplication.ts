import { Button } from '../../handler';
import { 
  ButtonInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  TextChannel, 
  TextBasedChannel, 
  MessageFlags 
} from 'discord.js';
import { createTranscript } from 'discord-html-transcripts';

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
    
    // Check if user has the required role
    const requiredRoleId = '1385996799918997685';
    const member = await interaction.guild.members.fetch(interaction.user.id);
    
    if (!member.roles.cache.has(requiredRoleId)) {
      await interaction.reply({
        content: 'You do not have permission to close applications.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

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

      // Generate transcript
      const transcript = await createTranscript(appChannel, {
        limit: -1,
        filename: `application-${appChannel.name}.html`,
        saveImages: true,
        footerText: 'Transcript',
        poweredBy: false,
      });

      try {
        // Send transcript to log channel
        const logChannel = interaction.guild.channels.cache.get('1394024625075130439');
        if (logChannel?.isTextBased() && 'send' in logChannel) {
          try {
            await (logChannel as TextChannel).send({
              content: `Application ${appChannel.name} closed by ${interaction.user.tag}`,
              files: [transcript],
            });
          } catch (error) {
            console.error('Failed to send to log channel:', error);
          }
        }

        // Send closing message
        if ('send' in appChannel) {
          try {
            await appChannel.send({
              content: `This application is being closed by ${interaction.user}. The transcript has been saved.`,
            });
          } catch (error) {
            console.error('Failed to send closing message:', error);
          }
        }

        // Delete the channel after a short delay
        setTimeout(async () => {
          try {
            if (isDeletableChannel(appChannel) && appChannel.deletable) {
              await appChannel.delete('Application closed');
            }
          } catch (error) {
            console.error('Failed to delete application channel:', error);
          }
        }, 5000);

      } catch (error) {
        console.error('Error generating transcript:', error);
        
        if ('send' in appChannel) {
          try {
            await appChannel.send({
              content: 'An error occurred while generating the transcript. The application will still be closed.',
            });
          } catch (sendError) {
            console.error('Failed to send error message to application channel:', sendError);
          }
        }

        // Still try to delete the channel
        setTimeout(async () => {
          try {
            if (isDeletableChannel(appChannel) && appChannel.deletable) {
              await appChannel.delete('Application closed (error generating transcript)');
            }
          } catch (deleteError) {
            console.error('Failed to delete application channel after error:', deleteError);
          }
        }, 5000);
      }

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
