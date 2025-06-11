require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { handlePTInfo, createEmbedComponentsFromData } = require('./handlers/ptinfo');
const { handleprogress } = require('./handlers/progress'); // ✅ 追加
const { registerCommands } = require('./deploy-commands');
const TIMEOUT_MS = 10000;

const express = require('express');
const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', async () => {
  console.log(`✅ Discord Bot Ready! Logged in as ${client.user.tag}`);

  try {
    await registerCommands();
  } catch (err) {
    console.error('スラッシュコマンド登録時にエラー:', err);
  }
});

// ==========================
// 通知API
// ==========================
const { EmbedBuilder } = require('discord.js');

app.post('/notify', async (req, res) => {
  try {
    const data = req.body;
    const ptNumber = String(data.ptNumber);
    const source = data.source || 'A';

    const channelId =
      source === 'C'
        ? process.env.DISCORD_NOTIFY_CHANNEL_ID_C
        : source === 'B'
        ? process.env.DISCORD_NOTIFY_CHANNEL_ID_B
        : source === 'D'
        ? process.env.DISCORD_NOTIFY_CHANNEL_ID_D
        : process.env.DISCORD_NOTIFY_CHANNEL_ID_A;

    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).send('通知先チャンネルが見つかりません');

    if (source === 'C') {
      const embed = new EmbedBuilder()
        .setTitle(`PT情報: ${ptNumber}`)
        .setColor(0x00AE86)
        .setDescription('パーティを削除しました');

      await channel.send({ embeds: [embed] });
      return res.status(200).send('通知を送信しました');
    }

    if (source === 'D') {
      const embed = new EmbedBuilder()
        .setTitle(`メンバー情報: ${data.membername || '不明'}`)
        .setColor(0x3498db)
        .setDescription('PT祠進捗が更新されました。');

      await channel.send({ embeds: [embed] });
      return res.status(200).send('通知を送信しました');
    }

    async function retryHandlePTInfo(ptNumber, maxRetries = 5, delayMs = TIMEOUT_MS) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await handlePTInfo(ptNumber);
        } catch (err) {
          if (i === maxRetries - 1) throw err;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    let fetchedData;
    try {
      fetchedData = await retryHandlePTInfo(ptNumber);
    } catch (err) {
      console.error('PT情報取得に失敗:', err);
      return res.status(500).send(`通知送信エラー: ${err.message}`);
    }

    const { embed, components } = createEmbedComponentsFromData(fetchedData);
    const message =
      source === 'B'
        ? 'パーティに追加メンバーが加入しました！'
        : '新しいパーティの募集があります';

    await channel.send({
      content: message,
      embeds: [embed],
      components: components
    });

    res.status(200).send('通知を送信しました');
  } catch (error) {
    console.error('通知送信中に予期せぬエラー:', error);
    res.status(500).send('通知送信中にエラーが発生しました');
  }
});

// ==========================
// スラッシュコマンド処理
// ==========================
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (!['ptinfo', 'progress'].includes(interaction.commandName)) return;

  try {
    await interaction.deferReply({ ephemeral: true });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout after 10s')), TIMEOUT_MS)
    );

    let data;
    if (interaction.commandName === 'ptinfo') {
      const ptNumber = interaction.options.getString('ptnumber');
      data = await Promise.race([
        handlePTInfo(ptNumber),
        timeout,
      ]);
    } else if (interaction.commandName === 'progress') {
      const membername = interaction.options.getString('membername'); // ✅ スペースなし
      data = await Promise.race([
        handleprogress(membername),
        timeout,
      ]);
    }

    await interaction.editReply({ content: '✅ 情報を正常に取得しました。' });

    const { embed, components } = createEmbedComponentsFromData(data);
    await interaction.followUp({ embeds: [embed], components: components, ephemeral: false });

  } catch (err) {
    console.error('--- Interaction state ---');
    console.error('deferred:', interaction.deferred);
    console.error('replied:', interaction.replied);
    console.error('ephemeral:', interaction.ephemeral);
    console.error('isRepliable:', interaction.isRepliable());
    console.error('Error:', err);

    const errorMessage = err.message === 'Timeout after 10s'
      ? '⚠️ 処理がタイムアウトしました。結果は通常チャットに表示します。'
      : '❌ エラーが発生しました。しばらくして再試行してください。';

    const sendError = async () => {
      if (interaction.deferred || interaction.replied) {
        try {
          await interaction.editReply({ content: errorMessage });
        } catch (e) {
          if (e.code === 10062) {
            console.warn('editReply失敗（Unknown interaction, 無視）');
          } else {
            console.error('editReply失敗:', e);
          }
        }
      } else {
        try {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        } catch (e) {
          if (e.code === 10062) {
            console.warn('reply失敗（Unknown interaction, 無視）');
          } else {
            console.error('reply失敗:', e);
          }
        }
      }
    };

    await sendError();

    if (err.message === 'Timeout after 10s') {
      try {
        let data;
        if (interaction.commandName === 'ptinfo') {
          const ptNumber = interaction.options.getString('ptnumber');
          data = await handlePTInfo(ptNumber);
        } else if (interaction.commandName === 'progress') {
          const membername = interaction.options.getString('membername');
          data = await handleprogress(membername);
        }

        const { embed, components } = createEmbedComponentsFromData(data);
        await interaction.followUp({ embeds: [embed], components: components, ephemeral: false });
      } catch (e) {
        if (e.code === 10062) {
          console.warn('followUp失敗（Unknown interaction, 無視）');
        } else {
          console.error('フォローアップ送信失敗:', e);
        }
      }
    }
  }
});

// ==========================
// 起動
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 通知APIサーバー起動中 (ポート: ${PORT})`);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
