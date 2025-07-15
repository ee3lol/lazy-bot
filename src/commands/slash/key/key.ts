import { RegisterType, SlashCommand } from '../../../handler';
import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { checkAccess } from '../../../utils/checkAccess';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import User from '../../../schemas/user';
import { safeReply } from '../../../utils/safeReply';

puppeteer.use(StealthPlugin());

export default new SlashCommand({
  registerType: RegisterType.Guild,
  allowedChannels: ["1387503579186597968"],
  userCooldown: 15 * 60 * 1000,

  data: new SlashCommandBuilder()
    .setName('key')
    .setDescription('Key management commands')
    .addSubcommand(subcommand => 
      subcommand
        .setName('generate')
        .setDescription('Generate a new key')
        .addIntegerOption(option => 
          option
            .setName('days')
            .setDescription('Number of days for the key')
            .setRequired(true)
        )
        .addStringOption(option => 
          option
            .setName('note')
            .setDescription('Note for the key')
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    const handleGenerate = async (interaction: ChatInputCommandInteraction): Promise<void> => {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
      
      try {
        const accessCheck = await checkAccess(interaction);
        if (!accessCheck.hasAccess || !accessCheck.user) {
          if (accessCheck.errorEmbed) {
            await safeReply(interaction, { embeds: [accessCheck.errorEmbed] });
          }
          return;
        }
        
        const user = accessCheck.user;
        const days = interaction.options.getInteger('days', true);
        const note = interaction.options.getString('note', true);
        
        const loadingEmbed = new EmbedBuilder()
          .setTitle('Generating Key...')
          .setDescription('Please wait while we generate your key...')
          .setColor(Colors.Blue);
        
        await safeReply(interaction, { embeds: [loadingEmbed] });
        
       if (!process.env.PANEL_EMAIL || !process.env.PANEL_PASSWORD) {
          throw new Error('Panel credentials not configured. Please contact an administrator.');
        }
        
        const browser = await puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        try {
          await page.goto('https://securexvmcore.com/page/admin/', { waitUntil: 'networkidle2' });
          
          await page.waitForSelector('#inputLogin', { timeout: 10000 });
          
          await page.type('#inputLogin', 'ziun', { delay: 30 });
          await page.type('#inputPassword', 'Gu!t0.061099', { delay: 30 });
          
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('body > div.container > form > button')
          ]);
          
          await page.waitForSelector('#navbar-menu > div.d-flex.flex-column.flex-md-row.flex-fill.align-items-stretch.align-items-md-center > ul > li:nth-child(3) > a');
          await page.waitForSelector('#navbar-menu > div.d-flex.flex-column.flex-md-row.flex-fill.align-items-stretch.align-items-md-center > ul > li:nth-child(3) > a');
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#navbar-menu > div.d-flex.flex-column.flex-md-row.flex-fill.align-items-stretch.align-items-md-center > ul > li:nth-child(3) > a')
          ]);
          
          await page.waitForSelector('body > div > div.content > div > div > div > div.card-body > form', { timeout: 10000 });
          
          await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(1) > input:nth-child(2)', '1');
          
          await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(3) > input', days.toString());
          
          await page.type('body > div > div.content > div > div > div > div.card-body > form > div:nth-child(4) > textarea', note);
          
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('body > div > div.content > div > div > div > div.card-body > form > button')
          ]);
          
          await page.waitForSelector('#lastCreatedKeysTextarea', { timeout: 10000 });
          const keyText = await page.$eval('#lastCreatedKeysTextarea', (el: any) => el.value);
          
          const keyMatch = keyText.match(/Days: \d+ \| (\w+) -/);
          if (!keyMatch || !keyMatch[1]) {
            throw new Error('Failed to extract key from response');
          }
          const key = keyMatch[1];
        
          await User.findByIdAndUpdate(
            user._id,
            {
              $push: {
                generatedKeys: {
                  value: key,
                  days,
                  note,
                  createdAt: new Date()
                }
              }
            },
            { new: true, useFindAndModify: false }
          );
          
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Key Generated Successfully')
            .setDescription(`**Key:** \`${key}\`\n**Days:** ${days}\n**Note:** ${note}`)
            .setColor(Colors.Green)
            .setFooter({ text: 'Key generated successfully' })
            .setTimestamp();
          
          await safeReply(interaction, { embeds: [successEmbed] });
          
        } catch (error) {
          console.error('Error generating key:', error);
          let errorMessage = 'An error occurred while generating your key. Please try again later.';
          
          if (error instanceof Error) {
            if (error.message.includes('failed to find element')) {
              errorMessage = 'Failed to access the panel. The page structure may have changed.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'The panel is taking too long to respond. Please try again later.';
            } else if (error.message.includes('environment variable')) {
              errorMessage = 'Configuration error. Please contact an administrator.';
            }
          }
          
          const errorEmbed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription(errorMessage)
            .setColor(Colors.Red);
            
          await safeReply(interaction, { embeds: [errorEmbed] });
        } finally {
          await browser.close();
        }
      } catch (error) {
        console.error('Error in generate command:', error);
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('An unexpected error occurred. Please try again later.')
          .setColor(Colors.Red);
        
        await safeReply(interaction, { embeds: [errorEmbed] });
      }
    };
    
  if (subcommand === 'generate') {
    await handleGenerate(interaction);
  } 
},
});
