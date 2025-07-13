import { Event } from '../handler';
import { Collection, EmbedBuilder, Events, GuildMember, Invite } from 'discord.js';
import User from '../schemas/user';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Cache to store guild invites
export const invitesCache = new Collection<string, Collection<string, number>>();

// Function to generate keys based on invite count
async function generateKeyForInviter(inviterId: string, days: number, note: string): Promise<string | null> {
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('https://securexvmcore.com/page/admin/');

    await page.waitForSelector('#inputLogin');
    await page.waitForSelector('#inputPassword');
    
    await page.type('#inputLogin', 'ziun');
    await page.type('#inputPassword', 'Gu!t0.061099');
    
    await page.click('body > div.container > form > button');

    await page.waitForNavigation();
    
    await page.click('#navbar-menu > div.d-flex.flex-column.flex-md-row.flex-fill.align-items-stretch.align-items-md-center > ul > li:nth-child(3) > a');
    
    await page.waitForSelector('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(1) > input:nth-child(2)');
    
    await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(1) > input:nth-child(2)', '1');
    await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(3) > input', days.toString());
    await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(4) > textarea', note);
    
    await page.click('body > div > div.content > div > div > div > div.card-body > form > button');
    
    await page.waitForSelector('#lastCreatedKeysTextarea');
    
    const generatedKeys = await page.evaluate(() => {
      const textarea = document.querySelector('#lastCreatedKeysTextarea') as HTMLTextAreaElement;
      return textarea ? textarea.value : '';
    });
    
    await browser.close();
    
    const keyLines = generatedKeys.split('\n').filter(line => line.trim() !== '');
    if (keyLines.length > 0) {
      const keyMatch = keyLines[0].match(/\|\s*([\w\d]+)\s*-/);
      return keyMatch ? keyMatch[1] : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating key:', error);
    return null;
  }
}

export default new Event({
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember): Promise<void> {
    try {
      // Skip if it's a bot
      if (member.user.bot) return;
      
      // Get the guild's cached invites
      const cachedInvites = invitesCache.get(member.guild.id);
      if (!cachedInvites) return;
      
      // Fetch the current invites
      const currentInvites = await member.guild.invites.fetch();
      
      // Find the invite that was used
      let usedInvite: Invite | undefined;
      let inviter: string | null = null;
      
      currentInvites.forEach(invite => {
        const cachedUses = cachedInvites.get(invite.code) || 0;
        if (cachedUses < invite.uses!) {
          usedInvite = invite;
          inviter = invite.inviterId;
        }
      });
      
      // Update the cache with current invite counts
      const newCache = new Collection<string, number>();
      currentInvites.forEach(invite => {
        newCache.set(invite.code, invite.uses!);
      });
      invitesCache.set(member.guild.id, newCache);
      
      // If no invite was found, return
      if (!usedInvite || !inviter) return;
      
      // Find the inviter in the database
      const inviterUser = await User.findOne({ discordId: inviter });
      if (!inviterUser) return;
      
      // Find or create the new member in the database
      let newMemberUser = await User.findOne({ discordId: member.id });
      
      if (!newMemberUser) {
        // Create a new user record if they don't exist
        newMemberUser = new User({
          discordId: member.id,
          username: member.user.username,
          accessTier: 'lifetime', // Default tier, can be changed as needed
          accessExpires: null,
          invitedBy: inviterUser._id,
          isActive: true
        });
        await newMemberUser.save();
      } else {
        // Update existing user with inviter info
        newMemberUser.invitedBy = inviterUser._id;
        await newMemberUser.save();
      }
      
      // Update the invite in the inviter's record
      const inviteIndex = inviterUser.invites.findIndex((inv: any) => inv.code === usedInvite!.code);
      
      if (inviteIndex !== -1) {
        // Update existing invite
        inviterUser.invites[inviteIndex].usedBy = newMemberUser._id;
        await inviterUser.save();
      }
      
      // Increment the totalInvites counter for the inviter
      inviterUser.totalInvites = (inviterUser.totalInvites || 0) + 1;
      await inviterUser.save();
      
      // Use totalInvites for reward thresholds instead of counting used invites
      const validInvitesCount = inviterUser.totalInvites;
      
      // Check if inviter has reached any invite thresholds and generate keys
      let generatedKey: string | null = null;
      let rewardDays = 0;
      let rewardNote = '';
      
      if (validInvitesCount === 3) {
        rewardDays = 1;
        rewardNote = 'Reward for 3 invites';
        generatedKey = await generateKeyForInviter(inviter, rewardDays, rewardNote);
      } else if (validInvitesCount === 5) {
        rewardDays = 7;
        rewardNote = 'Reward for 5 invites';
        generatedKey = await generateKeyForInviter(inviter, rewardDays, rewardNote);
      } else if (validInvitesCount === 10) {
        rewardDays = 30;
        rewardNote = 'Reward for 10 invites';
        generatedKey = await generateKeyForInviter(inviter, rewardDays, rewardNote);
      }
      
      // If a key was generated, store it in the inviter's record
      if (generatedKey) {
        inviterUser.generatedKeys.push({
          value: generatedKey,
          days: rewardDays,
          note: rewardNote,
          createdAt: new Date()
        });
        await inviterUser.save();
        
        // Send a DM to the inviter with their reward
        try {
          const inviterMember = await member.guild.members.fetch(inviter);
          const rewardEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎉 Invite Reward!')
            .setDescription(`You've reached ${validInvitesCount} invites and earned a reward!`)
            .addFields(
              { name: 'Key', value: `\`${generatedKey}\``, inline: false },
              { name: 'Duration', value: `${rewardDays} day(s)`, inline: true },
              { name: 'Total Invites', value: `${validInvitesCount}`, inline: true }
            )
            .setTimestamp();
          
          await inviterMember.send({ embeds: [rewardEmbed] });
        } catch (error) {
          console.error('Error sending DM to inviter:', error);
        }
      }
      
      // Send notification to the specified channel
      const notificationChannel = member.guild.channels.cache.get('1303272246608920599');
      if (notificationChannel && notificationChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('New Member Joined')
          .setDescription(`${member.user.username} joined using an invite from ${inviterUser.username}`)
          .addFields(
            { name: 'Invite Code', value: usedInvite.code, inline: true },
            { name: 'Inviter', value: `<@${inviter}>`, inline: true },
            { name: 'Member', value: `<@${member.id}>`, inline: true },
            { name: 'Total Invites', value: `${validInvitesCount}`, inline: true }
          )
          .setTimestamp();
        
        await notificationChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
});