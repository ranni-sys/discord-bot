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

// スラッシュコマンドのインタラクション処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ptinfo') {
    console.log(`📥 /ptinfo コマンドを受信: ${interaction.user.tag} が ${interaction.options.getString('ptnumber')} をリクエスト`);
    await handlePTInfo(interaction);
  }
});

// Discordボットにログイン
client.login(process.env.DISCORD_TOKEN);
