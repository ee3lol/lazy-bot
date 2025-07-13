import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Colors, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { PrefixCommand } from '../../handler';

export default new PrefixCommand({
  name: 'embed',
  aliases: ['em'],
  userCooldown: 10,
  allowedRoles: ['1385996799918997685'],

  async execute(message: Message): Promise<any> {
    // Ask for template type
    const channel = message.channel as TextChannel;
    const templatePrompt = await channel.send('Which template would you like to send? (Available: `rules`, `products`, `reseller`, `freetrial`, `support`)\nType the template name:');
    
    // Create a collector for template selection
    const templateCollector = channel.createMessageCollector({
      filter: (m) => m.author.id === message.author.id,
      max: 1,
      time: 30000 // 30 seconds timeout
    });
    
    templateCollector.on('collect', async (templateResponse) => {
      const templateType = templateResponse.content.toLowerCase().trim();
      
      const validTemplates = ['rules', 'products', 'reseller', 'freetrial', 'support', 'key', 'hwid'];
      if (!validTemplates.includes(templateType)) {
        return message.reply(`Template '${templateType}' is not available. Available templates: ${validTemplates.map(t => `'${t}'`).join(', ')}.`);
      }
      
      const channelPrompt = await channel.send('Which channel would you like to send this embed to? Please mention the channel or provide the channel ID:');
      
      // Create a collector for channel selection
      const channelCollector = channel.createMessageCollector({
        filter: (m) => m.author.id === message.author.id,
        max: 1,
        time: 30000 // 30 seconds timeout
      });
      
      channelCollector.on('collect', async (channelResponse) => {
        // Extract channel ID from mention or direct ID input
        let channelId = channelResponse.content.trim();
        if (channelId.startsWith('<#') && channelId.endsWith('>')) {
          channelId = channelId.slice(2, -1);
        }
        
        const targetChannel = message.guild?.channels.cache.get(channelId) as TextChannel;
        
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
          return message.reply('Invalid channel. Please provide a valid text channel.');
        }
        
        // Create the appropriate embed based on template type
        try {
          let embed: EmbedBuilder;
          let components: ActionRowBuilder<ButtonBuilder>[] = [];
          
          switch(templateType) {
            case 'rules':
              embed = createRulesEmbed();
              components.push(createRulesButtonRow());
              break;
            case 'products':
              embed = createProductsEmbed();
              break;
            case 'reseller':
              embed = createResellerEmbed();
              break;
            case 'freetrial':
              embed = createFreeTrialEmbed();
              break;
            case 'support':
              embed = createSupportEmbed();
              components.push(createSupportButtonRow());
              break;
            case 'key':
              embed = createKeyEmbed();
              break;
            case 'hwid':
              embed = createHwidEmbed();
              break;
          }

          await targetChannel.send({ embeds: [embed!], components: components });

          
          await message.reply(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} embed successfully sent to <#${targetChannel.id}>!`);
        } catch (error) {
          console.error('Error sending embed:', error);
          await message.reply('There was an error sending the embed. Please check my permissions in the target channel.');
        }
      });
      
      channelCollector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          message.reply('Channel selection timed out. Please try again.');
        }
      });
    });
    
    templateCollector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        message.reply('Template selection timed out. Please try again.');
      }
    });
  },
});

// Function to create the rules embed
function createRulesEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6') 
    .setTitle('Rules & Guidelines:')
    .setImage('https://i.pinimg.com/originals/bd/0b/ef/bd0bef945d48694a42908848603cd785.gif')
    .setDescription(
      'This server follows Discord\'s ToS, any violation of these terms of service by any member will result in kicks or bans\n' +
      'Please read the TOS.\n' +
      'https://discordapp.com/terms'
    )
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> Rule 1: Respectful Conduct',
        value: '> <:arrowright:1387654610742939668> Please demonstrate courtesy and consideration towards fellow members and their opinions. Engage in constructive debates while maintaining a respectful tone. Harassment, trolling, or any form of offensive behavior will not be tolerated.'
      },
      {
        name: '<:purpledot:1387654172282720316> Rule 2: Appropriate Content',
        value: '> <:arrowright:1387654610742939668> Sensitive topics, such as sexist or homophobic remarks, racial slurs, political discourse, harassment, threats, offensive material, drug usage, or references to suicide, are strictly prohibited. This also includes any NSFW (Not Safe for Work) content in any channel.'
      },
      {
        name: '<:purpledot:1387654172282720316> Rule 3: No Spam or Advertising',
        value: '> <:arrowright:1387654610742939668> Spamming, including repetitive messages and excessive tagging of users, is not allowed. The dissemination of harmful materials, such as viruses or IP grabbers, will result in an immediate and permanent ban. Additionally, any form of direct advertising or sharing affiliate links is strictly forbidden.'
      },
      {
        name: '<:purpledot:1387654172282720316> Rule 4: Respectful Channel Usage',
        value: '> <:arrowright:1387654610742939668> We kindly request that you use the designated channels appropriately, respecting their intended purposes. Refrain from inappropriate role mentions and ensure that conversations are relevant to the respective channels.'
      }
    )
    .setFooter({ text: 'Thank you for your understanding and cooperation in upholding the integrity of our community.' });
}

// Function to create the rules button row
function createRulesButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rules:accept')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Primary)
    );
}

function createSupportButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('support')
        .setLabel('Ticket')
        .setStyle(ButtonStyle.Primary)
    );
}

// Function to create the products embed
function createProductsEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('Our Products')
    .setDescription('Check the Status, information and price of our products:')
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> Lazy Spoofer',
        value: '> <:arrowright:1387654610742939668> A Private build of our temp spoofer\n' +
               '> <:arrowright:1387654610742939668> Works with ALL motherboards\n' +
               '> <:arrowright:1387654610742939668> Compatible with secure boot\n' +
               '> <:arrowright:1387654610742939668> No corrupted or fake serials – spoofed values are manufacturer-consistent\n\n' +
               '> <:purpledot:1387654172282720316> **$12 monthly**\n' +
               '> <:purpledot:1387654172282720316> **$35 lifetime**'
      },
      {
        name: '<:video_game:1387654172282720316> Supported Games',
        value: '> <:arrowright:1387654610742939668> Fortnite, Rust, League of Legends, PUBG, Call of Duty, Apex Legends, Escape from Tarkov, Valorant'
      },
      {
        name: '<:shield:1387654172282720316> Anti-Cheat Compatibility',
        value: '> <:arrowright:1387654610742939668> Works with EAC, BE, Vanguard, RICOHET, Valve, and other major anti-cheat systems.'
      },
      {
        name: '<:jigsaw:1387654172282720316> Motherboard Compatibility',
        value: '> <:arrowright:1387654610742939668> Fully supports brands like ASUS, MSI, ASRock, Dell, Lenovo, Corsair, EVGA, Gigabyte, and more.'
      }
    )
    .setFooter({ text: 'Lazy Inc. | Premium Products' })
}

// Function to create the reseller embed
function createResellerEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('Reseller Program')
    .setDescription('We have special offers to resellers')
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> Bulk Purchase',
        value: '> <:arrowright:1387654610742939668> Progressive discounts, up to 40% (Minimum 3 keys)'
      },
      {
        name: '<:purpledot:1387654172282720316> Reseller Panel',
        value: '> <:arrowright:1387654610742939668> $150 (Generate unlimited amount of keys)'
      }
    )
    .setFooter({ text: 'Lazy Inc. | Reseller Program' })
}

// Function to create the free trial embed
function createFreeTrialEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('Free Trials')
    .setDescription('We offer free trials for our products')
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> Check our available offers',
        value: '> <:arrowright:1387654610742939668> Lazy Spoofer: 1 Day trial'
      },
      {
        name: '<:purpledot:1387654172282720316> How to claim',
        value: '> <:arrowright:1387654610742939668> To claim it, open a ticket in ⁠support and request it.'
      }
    )
    .setFooter({ text: 'Lazy Inc. | Free Trials' })
}

// Function to create the support embed
function createSupportEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('Need Help?')
    .setDescription('If you need any assistance or have questions, feel free to open a ticket.')
    .addFields(
      {
        name: 'How to get support:',
        value: 'Click the button below to create a support ticket. Our team will assist you as soon as possible.'
      }
    )
    .setFooter({ text: 'Lazy Inc. Support' });
}

// Function to create the key system explanation embed
function createKeyEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('🔑 Key System')
    .setDescription('Learn how to generate and manage your access keys')
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> Generating a Key',
        value: '> <:arrowright:1387654610742939668> Use `/key generate` to create a new access key\n> <:arrowright:1387654610742939668> Select the duration and add an optional note\n> <:arrowright:1387654610742939668> Your key will be sent to you privately'
      },
      {
        name: '<:purpledot:1387654172282720316> Listing Your Keys',
        value: '> <:arrowright:1387654610742939668> Use `/list keys` to view all your generated keys\n> <:arrowright:1387654610742939668> Keys are paginated for easy navigation\n> <:arrowright:1387654610742939668> Each key shows its status and creation date'
      },
      {
        name: '<:purpledot:1387654172282720316> Key Security',
        value: '> <:arrowright:1387654610742939668> Never share your keys with anyone\n> <:arrowright:1387654610742939668> Each key is tied to your Discord account\n> <:arrowright:1387654610742939668> Report any suspicious activity immediately'
      },
      {
        name: '<:purpledot:1387654172282720316> Cooldown',
        value: '> <:arrowright:1387654610742939668> 15-minute cooldown between key generations\n> <:arrowright:1387654610742939668> Helps prevent abuse of the system'
      }
    )
    .setFooter({ text: 'Lazy Inc. | Key Management System' });
}

// Function to create the HWID reset explanation embed
function createHwidEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle('🔄 HWID Reset')
    .setDescription('Learn how to reset your HWID when needed')
    .addFields(
      {
        name: '<:purpledot:1387654172282720316> What is HWID?',
        value: '> <:arrowright:1387654610742939668> HWID (Hardware ID) identifies your system\n> <:arrowright:1387654610742939668> Prevents unauthorized license sharing'
      },
      {
        name: '<:purpledot:1387654172282720316> When to Reset',
        value: '> <:arrowright:1387654610742939668> After major hardware changes\n> <:arrowright:1387654610742939668> When reinstalling your OS\n> <:arrowright:1387654610742939668> If you see invalid HWID errors'
      },
      {
        name: '<:purpledot:1387654172282720316> How to Reset',
        value: '> <:arrowright:1387654610742939668> Use the command: `/hwid-reset <key>`\n> <:arrowright:1387654610742939668> Replace `<key>` with your activation key\n> <:arrowright:1387654610742939668> The key will be ready for a new device'
      },
      {
        name: '<:purpledot:1387654172282720316> Important Notes',
        value: '> <:arrowright:1387654610742939668> Only the key owner can reset its HWID\n> <:arrowright:1387654610742939668> Limited to one reset per key\n> <:arrowright:1387654610742939668> Contact support if you need assistance'
      }
    )
    .setFooter({ text: 'Lazy Inc. | Hardware ID Management' });
}
