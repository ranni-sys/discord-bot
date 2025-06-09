require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { handlePTInfo, createEmbedFromData } = require('./handlers/ptinfo');
const { handleProgress } = require('./handlers/progress');
const { registerCommands } = require('./deploy-commands');

// スラッシュコマンド登録
(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await registerCommands();
    console.log('✅ Slash commands registered successfully.');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

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

  const { commandName } = interaction;

  try {
    if (commandName === 'ptinfo') {
      const ptNumber = interaction.options.getString('ptnumber');
      await interaction.deferReply({ ephemeral: true });

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 3s')), 3000));
      const data = await Promise.race([
        handlePTInfo(ptNumber),
        timeout,
      ]);

      const embed = createEmbedFromData(data);

      await interaction.editReply({
        content: '✅ PT情報を正常に取得しました。',
      });
      await interaction.followUp({ embeds: [embed], ephemeral: false });

    } else if (commandName === 'progress') {
      const targetName = interaction.options.getString('targetname');
      await interaction.deferReply({ ephemeral: true });

      const result = await handleProgress(targetName || '');

      await interaction.editReply(result);
    }

  } catch (err) {
    console.error(`❌ Error handling /${commandName}:`, err);

    const errorMessage = err.message === 'Timeout after 3s'
      ? '⚠️ 処理がタイムアウトしました。'
      : '❌ エラーが発生しました。しばらくして再試行してください。';

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (e) {
      console.error('⚠️ 応答送信中に追加エラー:', e);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
