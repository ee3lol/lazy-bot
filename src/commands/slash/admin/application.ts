import { RegisterType, SlashCommand } from '../../../handler';
import { 
  type ChatInputCommandInteraction, 
  Colors, 
  EmbedBuilder, 
  GuildMember,
  MessageFlags, 
  PermissionFlagsBits, 
  SlashCommandBuilder 
} from 'discord.js';
import { Application } from '../../../schemas/Application';

const APPROVED_ROLE_ID = '1400348606052958269';

export default new SlashCommand({
  registerType: RegisterType.Guild,
  allowedRoles: ['1385996799918997685'],

  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Manage user applications.')
    .addSubcommand(subCommand => subCommand
      .setName('approve')
      .setDescription('Approve a user\'s application.')
      .addUserOption(option => option
        .setName('user')
        .setDescription('The user to approve')
        .setRequired(true))
      .addStringOption(option => option
        .setName('reason')
        .setDescription('Reason for approval')
        .setRequired(false)))
    .addSubcommand(subCommand => subCommand
      .setName('deny')
      .setDescription('Deny a user\'s application.')
      .addUserOption(option => option
        .setName('user')
        .setDescription('The user to deny')
        .setRequired(true))
      .addStringOption(option => option
        .setName('reason')
        .setDescription('Reason for denial')
        .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    
    const subCommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    
    try {
      const member = await interaction.guild.members.fetch(targetUser.id);
      
      if (!member) {
        await interaction.reply({ 
          content: 'Error: User not found in this server.', 
          flags: MessageFlags.Ephemeral 
        });
        return;
      }

      if (subCommand === 'approve') {
        // Record approval in database
        await Application.create({
          userId: targetUser.id,
          status: 'approved',
          reason,
          handledBy: interaction.user.id,
          expiresAt: null
        });
        
        // Add the approved role
        await member.roles.add(APPROVED_ROLE_ID);
        
        // Send DM to user
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('✅ Application Approved')
            .setDescription(`Your application has been approved by ${interaction.user.tag}`)
            .addFields({ name: 'Reason', value: reason })
            .setColor(Colors.Green)
            .setTimestamp();
            
          await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.error(`Could not send DM to ${targetUser.tag}:`, error);
        }
        
        await interaction.reply({
          content: `✅ Successfully approved ${targetUser.tag}'s application.`,
          flags: [MessageFlags.Ephemeral]
        });
        
      } else if (subCommand === 'deny') {
        // Record denial in database with 31-day cooldown
        await Application.create({
          userId: targetUser.id,
          status: 'denied',
          reason,
          handledBy: interaction.user.id,
          // expiresAt will be automatically set by the schema
        });
        
        // Calculate cooldown end date for the message
        const cooldownEnd = new Date();
        cooldownEnd.setDate(cooldownEnd.getDate() + 31);
        
        // Send DM to user
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('❌ Application Denied')
            .setDescription(
              `Your application has been denied by ${interaction.user.tag}\n\n` +
              `You can reapply after: <t:${Math.floor(cooldownEnd.getTime() / 1000)}:D>\n` +
              `(This is ${Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now)`
            )
            .addFields({ name: 'Reason', value: reason })
            .setColor(Colors.Red)
            .setTimestamp();
            
          await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.error(`Could not send DM to ${targetUser.tag}:`, error);
        }
        
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Application Denied')
          .setDescription(`Successfully denied ${targetUser}'s application.`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Note', value: 'You cannot reapply for 7 days.' }
          )
          .setColor(Colors.Red)
          .setTimestamp();

        await interaction.reply({ 
          embeds: [successEmbed],
          flags: [MessageFlags.Ephemeral]
        });
      }
      
    } catch (error) {
      console.error('Error processing application:', error);
      await interaction.reply({ 
        content: 'An error occurred while processing this application.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
});