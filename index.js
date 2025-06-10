require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { handlePTInfo, createEmbedFromData } = require('./handlers/ptinfo');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`✅ Discord Bot Ready! Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ptinfo') {
    const ptNumber = interaction.options.getString('ptnumber');

    try {
      await interaction.deferReply({ ephemeral: true });

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 3s')), 10000));

      const data = await Promise.race([
        handlePTInfo(ptNumber),
        timeout,
      ]);

      await interaction.editReply({
        content: '✅ PT情報を正常に取得しました。',
      });

      const embed = createEmbedFromData(data);
      await interaction.followUp({ embeds: [embed], ephemeral: false });

    } catch (err) {
      // interactionの状態をログに出す
      console.error('--- Interaction state ---');
      console.error('deferred:', interaction.deferred);
      console.error('replied:', interaction.replied);
      console.error('ephemeral:', interaction.ephemeral);
      console.error('isRepliable:', interaction.isRepliable());
      console.error('Error:', err);

      const errorMessage = err.message === 'Timeout after 3s' ?
        '⚠️ 処理がタイムアウトしました。結果は通常チャットに表示します。' :
        '❌ エラーが発生しました。しばらくして再試行してください。';

      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({ content: errorMessage });
        } catch (e) {
          console.error('editReply失敗:', e);
        }
      } else {
        try {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        } catch (e) {
          console.error('reply失敗:', e);
        }
      }

      if (err.message === 'Timeout after 3s') {
        try {
          const data = await handlePTInfo(ptNumber);
          const embed = createEmbedFromData(data);
          await interaction.followUp({ embeds: [embed], ephemeral: false });
        } catch (e) {
          console.error('フォローアップ送信失敗:', e);
        }
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
