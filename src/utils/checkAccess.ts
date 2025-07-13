import { type ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import User from '../schemas/user';

interface CheckAccessResult {
    hasAccess: boolean;
    user?: any;
    errorEmbed?: any;
}

export async function checkAccess(interaction: ChatInputCommandInteraction): Promise<CheckAccessResult> {
    try {
        const user = await User.findOne({ 
            discordId: interaction.user.id,
            isActive: true
        });
        
        if (!user) {
            return {
                hasAccess: false,
                errorEmbed: new EmbedBuilder()
                    .setTitle('🔒 Access Denied')
                    .setDescription('You do not have access to use this command. Please contact an administrator.')
                    .setColor(Colors.Red)
            };
        }
        
        if (user.accessExpires && new Date() > user.accessExpires) {
            user.isActive = false;
            await user.save();
            
            return {
                hasAccess: false,
                errorEmbed: new EmbedBuilder()
                    .setTitle('⏳ Access Expired')
                    .setDescription('Your access has expired. Please contact an administrator to renew your access.')
                    .setColor(Colors.Orange)
            };
        }
        
        return { hasAccess: true, user };
    } catch (error) {
        console.error('Error checking access:', error);
        return {
            hasAccess: false,
            errorEmbed: new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while checking your access. Please try again later.')
                .setColor(Colors.Red)
        };
    }
}
