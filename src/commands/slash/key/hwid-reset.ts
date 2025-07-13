import { RegisterType, SlashCommand } from '../../../handler';
import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { checkAccess } from '../../../utils/checkAccess';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('hwid-reset')
    .setDescription('Reset HWID for a key')
    .addStringOption(option => 
      option
        .setName('key')
        .setDescription('The key to reset HWID for')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    try {
      const { hasAccess, user } = await checkAccess(interaction);
      if (!hasAccess || !user) return;
      
      const keyToReset = interaction.options.getString('key', true);
      
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
      
      await page.click('#navbar-menu > div.d-flex.flex-column.flex-md-row.flex-fill.align-items-stretch.align-items-md-center > ul > li:nth-child(2) > a > span');
      
      await page.waitForSelector('body > div > div.content > div > div > div.col-12 > div > div > form > div > div.col-md-3 > select');
      await page.select('body > div > div.content > div > div > div.col-12 > div > div > form > div > div.col-md-3 > select', 'key');
      
      await page.waitForSelector('body > div > div.content > div > div > div.col-12 > div > div > form > div > div.col > input');
      await page.type('body > div > div.content > div > div > div.col-12 > div > div > form > div > div.col > input', keyToReset);
      
      await page.click('body > div > div.content > div > div > div.col-12 > div > div > form > div > div:nth-child(3) > button');
      
      await page.waitForSelector('body > div > div.content > div > div > div.col-md-12 > div > div.table-responsive > table > tbody > tr');
      
      await page.click('body > div > div.content > div > div > div.col-md-12 > div > div.table-responsive > table > tbody > tr > td:nth-child(6) > a.badge.bg-yellow-lt');
  
      await browser.close();
      
      const embed = new EmbedBuilder()
        .setTitle('HWID Reset Successful')
        .setDescription(`HWID has been reset for key: \`${keyToReset}\`\n\nThe user can now activate the key on a new device.`)
        .setColor(Colors.Green)
        .setTimestamp()
        .setFooter({ text: 'Lazy Bot' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error resetting HWID:', error);
      if(error instanceof Error) { 
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription(`Failed to reset HWID: ${error.message}`)
          .setColor(Colors.Red)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  },
});