import { Event } from '../handler';
import { Collection, Events, Guild, Invite } from 'discord.js';
import { invitesCache } from './guildMemberAdd';
import User from '../schemas/user';

export default new Event({
  name: Events.InviteCreate,
  async execute(invite: Invite): Promise<void> {
    try {
      // Check if guild exists before proceeding
      if (!invite.guild) {
        console.error('Error: Guild is null in inviteCreate event');
        return;
      }
      
      console.log(`Invite created: ${invite.code} by ${invite.inviterId || 'unknown'}`);
      
      // Fetch all invites for the guild
      const guildInvites = await (invite.guild as Guild).invites.fetch();
      
      // Create a collection of invite codes and their uses
      const inviteUses = new Map();
      guildInvites.forEach(inv => {
        inviteUses.set(inv.code, inv.uses!);
      });
      
      // Update the cache
      invitesCache.set(invite.guild.id, new Collection(inviteUses));
      console.log(`Updated invite cache for guild ${invite.guild.id}`);
      
      // Save the invite to the database
      if (invite.inviterId) {
        console.log(`Finding inviter with ID: ${invite.inviterId}`);
        const inviter = await User.findOne({ discordId: invite.inviterId });
        
        if (inviter) {
          console.log(`Found inviter: ${inviter.username}`);
          // Check if the invite already exists in the user's invites
          const inviteExists = inviter.invites.some((inv: any) => inv.code === invite.code);
          
          if (!inviteExists) {
            // Add the new invite to the user's invites array
            inviter.invites.push({
              code: invite.code,
              usedBy: null,
              createdAt: new Date(),
              expiresAt: invite.expiresAt
            });
            
            await inviter.save();
            console.log(`Saved invite ${invite.code} to ${inviter.username}'s record. Total invites: ${inviter.invites.length}`);
          } else {
            console.log(`Invite ${invite.code} already exists in ${inviter.username}'s record`);
          }
        } else {
          console.log(`Inviter with ID ${invite.inviterId} not found in database`);
        }
      } else {
        console.log('No inviterId found on the invite object');
      }
    } catch (error) {
      console.error('Error in inviteCreate event:', error);
    }
  },
});