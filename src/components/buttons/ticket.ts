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

// Type guard to check if a channel is text-based and has a name
function isTextChannelWithName(channel: TextBasedChannel | null): channel is TextChannel {
  return channel !== null && 'name' in channel && channel.name !== null;
}

// Type guard to check if a channel is deletable
function isDeletableChannel(channel: TextBasedChannel | null): channel is TextChannel & { deletable: boolean } {
  return channel !== null && 'deletable' in channel && typeof channel.deletable === 'boolean';
}

export default new Button({
  customId: 'close_ticket',

  async execute(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.channel || !interaction.guild) return;

    try {
      // Check if this is actually a ticket channel
      if (!isTextChannelWithName(interaction.channel) || !interaction.channel.name.startsWith('ticket-')) {
        await interaction.reply({
          content: 'This command can only be used in ticket channels.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
      
      const ticketChannel = interaction.channel as TextChannel;

      // Disable the close button
      const disabledButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Closing...')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

      await interaction.update({ components: [disabledButton] });

      // Generate transcript
      const transcript = await createTranscript(ticketChannel, {
        limit: -1,
        filename: `ticket-${ticketChannel.name}.html`,
        saveImages: true,
        footerText: 'Transcript',
        poweredBy: false,
      });

      try {
        // Send transcript to ticket creator (username is after 'ticket-' in channel name)
        const username = ticketChannel.name.replace('ticket-', '');
        const members = await interaction.guild.members.fetch({ query: username, limit: 1 });
        const member = members.first();
        
        if (member) {
          try {
            await member.send({
              content: 'Here is the transcript of your ticket:',
              files: [transcript],
            }).catch(console.error);
          } catch (error) {
            console.error('Failed to send DM to user:', error);
          }
        }

        // Send transcript to log channel
        const logChannel = interaction.guild.channels.cache.get('1394024625075130439');
        if (logChannel?.isTextBased() && 'send' in logChannel) {
          try {
            await (logChannel as TextChannel).send({
              content: `Ticket ${ticketChannel.name} closed by ${interaction.user.tag}`,
              files: [transcript],
            });
          } catch (error) {
            console.error('Failed to send to log channel:', error);
          }
        }

        // Send closing message
        if ('send' in ticketChannel) {
          try {
            await ticketChannel.send({
              content: `This ticket is being closed by ${interaction.user}. The transcript has been saved.`,
            });
          } catch (error) {
            console.error('Failed to send closing message:', error);
          }
        }

        // Delete the channel after a short delay
        setTimeout(async () => {
          try {
            if (isDeletableChannel(ticketChannel) && ticketChannel.deletable) {
              await ticketChannel.delete('Ticket closed');
            }
          } catch (error) {
            console.error('Failed to delete ticket channel:', error);
          }
        }, 5000);

      } catch (error) {
        console.error('Error generating transcript:', error);
        
        if ('send' in ticketChannel) {
          try {
            await ticketChannel.send({
              content: 'An error occurred while generating the transcript. The ticket will still be closed.',
            });
          } catch (sendError) {
            console.error('Failed to send error message to ticket channel:', sendError);
          }
        }

        // Still try to delete the channel
        setTimeout(async () => {
          try {
            if (isDeletableChannel(ticketChannel) && ticketChannel.deletable) {
              await ticketChannel.delete('Ticket closed (error generating transcript)');
            }
          } catch (deleteError) {
            console.error('Failed to delete ticket channel after error:', deleteError);
          }
        }, 5000);
      }

    } catch (error) {
      console.error('Error in close ticket handler:', error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'An error occurred while closing the ticket.',
            flags: [MessageFlags.Ephemeral],
          });
        } else {
          await interaction.reply({
            content: 'An error occurred while closing the ticket.',
            flags: [MessageFlags.Ephemeral],
          });
        }
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  },
});
