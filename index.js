require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const { registerCommands } = require('./deploy-commands');
const { handlePTInfo } = require('./handlers/ptinfo');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

client.once('ready', async () => {
  const botTag = client.user.tag;
  console.log(`✅ Discord Bot Ready! Logged in as ${botTag}`);

  try {
    await registerCommands();
    console.log('✅ スラッシュコマンドの登録に成功しました');
  } catch (err) {
    console.error('❌ スラッシュコマンドの登録に失敗しました:', err);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ptinfo') {
      const ptNumber = interaction.options.getString('ptnumber');
      console.log(`📥 /ptinfo コマンドを受信: ${interaction.user.tag} が ${ptNumber} をリクエスト`);

      // deferReplyで即時応答（非公開メッセージ）
      await interaction.deferReply({ ephemeral: true });

      // タイムアウト監視付きでhandlePTInfoを実行
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 3s')), 3000);
      });

      await Promise.race([
        handlePTInfo(interaction),
        timeout
      ]);
    }
  } catch (err) {
    console.error('❌ インタラクションの処理中にエラーが発生しました:', err);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '⚠️ エラーが発生しました。しばらくして再試行してください。',
          flags: MessageFlags.Ephemeral
        });
      } else if (interaction.isRepliable()) {
        await interaction.reply({
          content: '⚠️ コマンド処理中に問題が発生しました。',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (innerErr) {
      console.error('⚠️ エラーハンドリング中に失敗しました:', innerErr);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Discordへのログインに失敗しました:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未処理の例外 (uncaughtException):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否 (unhandledRejection):', reason);
});

setInterval(() => {
  if (!client || !client.isReady()) {
    console.warn('⚠️ BotがReady状態ではありません');
  }
}, 10000);
