require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { registerCommands } = require('./deploy-commands');

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
  console.log(`Logged in as ${client.user.tag}`);

  // 起動時にスラッシュコマンド登録（Render無料プラン対策）
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

// PT情報取得用の関数
async function handlePTInfo(interaction) {
  const ptNumber = interaction.options.getString('ptnumber');

  if (!ptNumber) {
    await interaction.reply({
      content: '❗ PT番号が指定されていません。',
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const res = await fetch(`${process.env.GAS_URL}?PTnumber=${encodeURIComponent(ptNumber)}`);
    const data = await res.json();

    if (data.error) {
      await interaction.editReply({ content: `❌ ${data.error}` });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`PT情報: ${data.title}`)
      .setColor(0x00AE86)
      .addFields(
        data.entries.map(entry => ({
          name: entry.label,
          value: entry.value || '―',
          inline: true
        }))
      )
      .setFooter({ text: 'PT祠募集（GAS連携）' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('❌ GAS からのデータ取得に失敗しました:', error);
    await interaction.editReply({
      content: '⚠️ GAS から情報を取得できませんでした。しばらくしてから再度お試しください。'
    });
  }
}

// Discordボットにログイン
client.login(process.env.DISCORD_TOKEN);
