require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands } = require('./deploy-commands');
const { handlePTInfo } = require('./handlers/ptinfo');

// Discordクライアントを作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// 起動時の処理
client.once('ready', async () => {
  const botTag = client.user.tag;
  console.log(`✅ Discord Bot Ready! Logged in as ${botTag}`);

  // スラッシュコマンド登録
  try {
    await registerCommands();
    console.log('✅ スラッシュコマンドの登録に成功しました');
  } catch (err) {
    console.error('❌ スラッシュコマンドの登録に失敗しました:', err);
  }
});

// スラッシュコマンドのインタラクション処理（安全なtry-catch付き）
client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ptinfo') {
      console.log(`📥 /ptinfo コマンドを受信: ${interaction.user.tag} が ${interaction.options.getString('ptnumber')} をリクエスト`);

      // Discordのタイムアウト防止のため即座にdeferReply
      await interaction.deferReply({ ephemeral: true });

      await handlePTInfo(interaction);
    }
  } catch (err) {
    console.error('❌ インタラクションの処理中にエラーが発生しました:', err);

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: '⚠️ エラーが発生しました。しばらくして再試行してください。',
        ephemeral: true
      }).catch(console.error);
    } else {
      await interaction.reply({
        content: '⚠️ コマンド処理中に問題が発生しました。',
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// ログイン処理とエラーハンドリング
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Discordへのログインに失敗しました:', err);
});

// プロセス全体のエラーハンドリング
process.on('uncaughtException', (err) => {
  console.error('❌ 未処理の例外 (uncaughtException):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否 (unhandledRejection):', reason);
});

// ハートビート監視（任意）
setInterval(() => {
  if (!client || !client.isReady()) {
    console.warn('⚠️ BotがReady状態ではありません');
  }
}, 10000); // 10秒ごとにチェック
