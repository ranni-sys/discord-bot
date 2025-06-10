require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { handlePTInfo, createEmbedFromData } = require('./handlers/ptinfo');
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

// フォーム送信通知APIエンドポイント
app.post('/notify', async (req, res) => {
  try {
    const data = req.body;
    // data例: { ptNumber: '1234', answers: { '質問1': ['回答1'], ... } }
    const channelId = process.env.DISCORD_NOTIFY_CHANNEL_ID;
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).send('通知先チャンネルが見つかりません');
    }

    let content = `📝 **新しいPT募集フォーム回答**\nPT番号: \`${data.ptNumber}\`\n`;
    for (const question in data.answers) {
      const answerText = data.answers[question].join('\n');
      content += `**${question}**: ${answerText}\n`;
    }

    await channel.send(content);
    res.status(200).send('通知を送信しました');
  } catch (error) {
    console.error('通知送信エラー:', error);
    res.status(500).send('通知送信中にエラーが発生しました');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 通知APIサーバー起動中 (ポート: ${PORT})`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'ptinfo') return;

  const ptNumber = interaction.options.getString('ptnumber');

  try {
    await interaction.deferReply({ ephemeral: true });

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10s')), TIMEOUT_MS));

    const data = await Promise.race([
      handlePTInfo(ptNumber),
      timeout,
    ]);

    await interaction.editReply({ content: '✅ PT情報を正常に取得しました。' });

    const embed = createEmbedFromData(data);
    await interaction.followUp({ embeds: [embed], ephemeral: false });

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

    // タイムアウト時に followUp だけ別途実行
    if (err.message === 'Timeout after 10s') {
      try {
        const data = await handlePTInfo(ptNumber);
        const embed = createEmbedFromData(data);
        await interaction.followUp({ embeds: [embed], ephemeral: false });
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

client.login(process.env.DISCORD_TOKEN).catch(console.error);
