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
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 起動時にスラッシュコマンド登録
  try {
    await registerCommands();
    console.log('✅ スラッシュコマンドを登録しました');
  } catch (err) {
    console.error('❌ コマンド登録に失敗しました:', err);
  }
});

// スラッシュコマンドのインタラクション処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ptinfo') {
    await handlePTInfo(interaction);
  }
});

// Discordボットにログイン
client.login(process.env.DISCORD_TOKEN);
