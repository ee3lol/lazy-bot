import { Button } from '../../handler';
import { ButtonInteraction, Colors, EmbedBuilder, GuildMember, MessageFlags } from 'discord.js';

export default new Button({
  customId: 'rules',

  async execute(interaction: ButtonInteraction, uniqueId: string | null): Promise<void> {
    try {
      if (uniqueId !== 'accept') return;

      const guild = interaction.guild;
      const member = interaction.member as GuildMember;
      const role = guild?.roles.cache.get('1387500015844327618');

      if (!guild) {
        await interaction.reply({
          content: 'Error: Could not find the guild.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      if (!member) {
        await interaction.reply({
          content: 'Error: Could not find your member information.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      if (!role) {
        await interaction.reply({
          content: 'Error: Could not find the verification role. Please contact an administrator.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      if (member.roles.cache.has(role.id)) {
        await interaction.reply({
          content: 'You are already verified!',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      await member.roles.add(role);

      const successEmbed = new EmbedBuilder()
        .setTitle('Verification Successful')
        .setDescription(`You have accepted the rules and have been given access to the server.`)
        .setColor(Colors.Green)
        .setTimestamp();

      await interaction.reply({
        embeds: [successEmbed],
        flags: [MessageFlags.Ephemeral],
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in verify button:', error);

        const errorEmbed = new EmbedBuilder()
          .setTitle('Verification Error')
          .setDescription(`An error occurred during verification: ${error.message}`)
          .setColor(Colors.Red)
          .setTimestamp();

        if (!interaction.replied) {
          await interaction.reply({
            embeds: [errorEmbed],
            flags: [MessageFlags.Ephemeral],
          });
        } else {
          await interaction.followUp({
            embeds: [errorEmbed],
            flags: [MessageFlags.Ephemeral],
          });
        }
      }
    }
  },
});
