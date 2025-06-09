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
    try {
      const ptNumber = interaction.options.getString('ptnumber');

      // 即時応答（非公開）
      await interaction.deferReply({ ephemeral: true });

      // タイムアウト用Promise
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 3s')), 3000);
      });

      // PT情報取得をPromise.raceでタイムアウト制御
      const data = await Promise.race([
        handlePTInfo(ptNumber),
        timeout
      ]);

      // 正常取得した場合、ephemeralメッセージを編集（任意）
      await interaction.editReply({
        content: '✅ PT情報を正常に取得しました。',
        ephemeral: true
      });

      // 通常チャットに埋め込みメッセージ送信
      const embed = createEmbedFromData(data);
      await interaction.followUp({ embeds: [embed], ephemeral: false });

    } catch (err) {
      if (err.message === 'Timeout after 3s') {
        // タイムアウト時はephemeralメッセージで通知
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '⚠️ 処理がタイムアウトしました。結果は通常チャットに表示します。',
            ephemeral: true
          });
        } else if (interaction.isRepliable()) {
          await interaction.reply({
            content: '⚠️ 処理がタイムアウトしました。結果は通常チャットに表示します。',
            ephemeral: true
          });
        }

        // タイムアウトしてもhandlePTInfoを再度呼んで埋め込みだけ送る（GASは非同期応答想定）
        const ptNumber = interaction.options.getString('ptnumber');
        const data = await handlePTInfo(ptNumber);
        const embed = createEmbedFromData(data);
        await interaction.followUp({ embeds: [embed], ephemeral: false });
      } else {
        // その他エラー処理
        console.error(err);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '❌ エラーが発生しました。しばらくして再試行してください。',
            ephemeral: true
          });
        } else if (interaction.isRepliable()) {
          await interaction.reply({
            content: '❌ エラーが発生しました。',
            ephemeral: true
          });
        }
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
