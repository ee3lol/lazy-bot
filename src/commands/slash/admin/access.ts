import { RegisterType, SlashCommand } from '../../../handler';
import { type ChatInputCommandInteraction, Colors, EmbedBuilder, GuildMember, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import User, { AccessTier } from '../../../schemas/user';

const RESELLER_ROLE = "1387501252992307322";

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('access')
    .setDescription('Manage access to the bot.')
    .addSubcommand(subCommand => subCommand
    .setName('grant')
    .setDescription('Grant access to the bot.')
   .addUserOption(option => option
   .setName('member')
   .setDescription('The member to grant access to.')
   .setRequired(true))
   .addStringOption(option => option
   .setName('tier')
   .setDescription('Access tier to grant')
   .setRequired(true)
   .addChoices(
     { name: '1 Day', value: AccessTier.OneDay },
     { name: '1 Week', value: AccessTier.OneWeek },
     { name: '1 Month', value: AccessTier.OneMonth },
     { name: '3 Months', value: AccessTier.ThreeMonths },
     { name: 'Lifetime', value: AccessTier.Lifetime },
   ))
   .addStringOption(option => option
   .setName('reason')
   .setDescription('The reason for granting access to the bot.')
   .setRequired(true)))
   .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subCommand => subCommand
  .setName('revoke')
  .setDescription('Revoke access to the bot.')
  .addUserOption(option => option
  .setName('member')
  .setDescription('The member to revoke access to.')
  .setRequired(true))
  .addStringOption(option => option
 .setName('reason')
 .setDescription('The reason for revoking access to the bot.')
 .setRequired(true)))
 .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.options.getSubcommand()) {
        case 'grant': {
            const member = interaction.options.getMember('member') as GuildMember;
            const tier = interaction.options.getString('tier') as AccessTier;
            const reason = interaction.options.getString('reason');
            
            if (!member) {
                await interaction.reply({ content: 'Member not found.', flags: MessageFlags.Ephemeral });
                return;
            }
            if (!reason) {
                await interaction.reply({ content: 'Reason not found.', flags: MessageFlags.Ephemeral });
                return;
            }

            // Calculate expiration date based on tier
            let expirationDate: Date | null = null;
            const now = new Date();
            
            switch(tier) {
                case AccessTier.OneDay:
                    expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
                    break;
                case AccessTier.OneWeek:
                    expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
                    break;
                case AccessTier.OneMonth:
                    expirationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
                    break;
                case AccessTier.ThreeMonths:
                    expirationDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); 
                    break;
                case AccessTier.Lifetime:
                    expirationDate = null; 
                    break;
            }

            try {
                
                const existingUser = await User.findOne({ discordId: member.id });
                
                if (existingUser) {
                    
                    existingUser.accessTier = tier;
                    existingUser.accessExpires = expirationDate;
                    existingUser.isActive = true;
                    await existingUser.save();
                } else {
                    
                    await User.create({
                        discordId: member.id,
                        username: member.user.username,
                        accessTier: tier,
                        accessExpires: expirationDate,
                        isActive: true
                    });
                }

                
                if(!member.roles.cache.has(RESELLER_ROLE)) {
                    await member.roles.add(RESELLER_ROLE);
                }
                
                
                const expirationText = expirationDate 
                    ? `Expires: <t:${Math.floor(expirationDate.getTime() / 1000)}:R>` 
                    : 'Access: Lifetime';
                
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('Access Granted')
                        .setDescription(`<@${member.id}> has been granted access to the bot.\n\n**Tier:** ${tier}\n**${expirationText}**`)
                        .setColor(Colors.Green)
                        .setFooter({ text: `Reason: ${reason}` })
                        .setTimestamp()
                    ]
                });

                try {
                    await member.send({
                        embeds: [
                            new EmbedBuilder()
                            .setTitle('Access Granted')
                            .setDescription(`You have been granted access to the bot.\n\n**Tier:** ${tier}\n**${expirationText}**`)
                            .setColor(Colors.Green)
                            .setFooter({ text: `Reason: ${reason}` })
                            .setTimestamp()
                        ]
                    });
                } catch (error) {
                        
                }
            } catch (error) {
                console.error('Error granting access:', error);
                await interaction.reply({ 
                    content: 'An error occurred while granting access.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
            break;

            case 'revoke': {
                const member = interaction.options.getMember('member') as GuildMember;
                const reason = interaction.options.getString('reason');

                if (!member) {
                    await interaction.reply({ content: 'Member not found.', flags: MessageFlags.Ephemeral });
                    return;
                }
                if (!reason) {
                    await interaction.reply({ content: 'Reason not found.', flags: MessageFlags.Ephemeral });
                    return; 
                }
                
                try {
                    const user = await User.findOne({ discordId: member.id });
                    if (user) {
                        user.isActive = false;
                        await user.save();
                    }

                    if(member.roles.cache.has(RESELLER_ROLE)) {
                        await member.roles.remove(RESELLER_ROLE);
                    }
                    
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                           .setTitle('Access Revoked')
                           .setDescription(`<@${member.id}> has been revoked access to the bot.`)
                           .setColor(Colors.Red)
                           .setFooter({ text: `Reason: ${reason}` })
                           .setTimestamp()  
                        ]
                    });
                    
                    try {
                        await member.send({
                            embeds: [
                                new EmbedBuilder()
                               .setTitle('Access Revoked')
                               .setDescription(`Your access to the bot has been revoked.`)
                               .setColor(Colors.Red)
                               .setFooter({ text: `Reason: ${reason}` })
                               .setTimestamp()
                            ]
                        });
                    } catch (error) {
                      
                    }
                } catch (error) {
                    console.error('Error revoking access:', error);
                    await interaction.reply({ 
                        content: 'An error occurred while revoking access.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                break;
            }
    
        default:
            break;
    }
  },
});
