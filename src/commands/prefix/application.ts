import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, TextChannel } from 'discord.js';
import { PrefixCommand } from '../../handler';

export default new PrefixCommand({
  name: 'application',
  aliases: ['app'],
  userCooldown: 10,
  allowedRoles: ['1385996799918997685'], // Adjust role ID as needed

  async execute(message: Message): Promise<void> {
    try {
      const channel = message.channel as TextChannel;
      // Create the application message content
      const applicationMessage = `# Application
Take your time and read before applying to our platform.
- We are very strict with our users and you must follow our behavior guidelines.
- We track all activity related to our products. This includes usage logs, session time, IP addresses, and any interaction with our products and servers.
- We do not access your personal files, system, or anything unrelated to our software activity or servers.
- If your application is denied, you must wait 7 days before reapplying.

## Interview Process
To join our platform you will have to go through an intensive interview that works in a few steps:
1. Staff Review and Interview
2. Community Review
3. Purchase (You must be able to pay as soon as your application is approved).

## Important Notes
- If you have any doubts or questions, please open a support ticket in <#1387499512637034689> before applying.
- Our team is happy to help clarify any part of the application process.
- Make sure to read all instructions carefully before submitting your application.

Apply by clicking the button below when you're ready:`;

      // Create the Apply button
      const applyButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('Apply')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
        );

      // Send the message with the button
      await channel.send({
        content: applicationMessage,
        components: [applyButton]
      });

      // Delete the command message
      if (message.deletable) {
        await message.delete().catch(console.error);
      }

    } catch (error) {
      console.error('Error sending application message:', error);
      await message.reply('An error occurred while sending the application message.')
        .catch(console.error);
    }
  },
});
