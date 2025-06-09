console.log('discord.js version:', require('discord.js').version);

require('dotenv').config();
const { Client, GatewayIntentBits, InteractionResponseFlags } = require('discord.js');
const { handlePTInfo } = require('./handlers/ptinfo');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

client.once('ready', () => {
  console.log(`✅ Discord Bot Ready! Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'ptinfo') return;

  const PTnumber = interaction.options.getString('ptnumber');
  console.log(`📥 /ptinfo コマンドを受信: ${interaction.user.tag} が ${PTnumber} をリクエスト`);

  // 即時応答 (ephemeral=true の代わりに flags を使用)
  await interaction.reply({
    content: '⏳ データを取得しています...',
    flags: InteractionResponseFlags.Ephemeral,
  });

  // タイムアウト制御付きの処理
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    await handlePTInfo(interaction, PTnumber, controller.signal);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('⚠️ タイムアウト発生');

      // 表は visible で表示
      await interaction.followUp({
        content: '⏱️ 応答に時間がかかっていますが、以下は現在の情報です。',
        ephemeral: false,
      });

      // 後続で fetch は継続して行い、埋め込みだけ非ephemeralで送る
      await handlePTInfo(interaction, PTnumber, null, true); // true: フォローアップ用
    } else {
      console.error('❌ エラー:', err);
      await interaction.followUp({
        content: '⚠️ データ取得中にエラーが発生しました。',
        flags: InteractionResponseFlags.Ephemeral,
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
