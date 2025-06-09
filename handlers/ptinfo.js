const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

function escapeMarkdown(text) {
  return text?.replace(/([*_`~|])/g, '\\$1') ?? '―';
}

async function handlePTInfo(interaction) {
  try {
    const ptNumber = interaction.options.getString('ptnumber');

    if (!ptNumber) {
      console.warn('⚠️ PT番号が未指定でリクエストされました');
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❗ PT番号が指定されていません。',
          ephemeral: true
        }).catch(console.error);
      }
      return;
    }

    const url = `${process.env.GAS_URL}?PTnumber=${encodeURIComponent(ptNumber)}`;
    console.log(`🌐 GAS にリクエスト送信中: ${url}`);

    const controller = new AbortController();
    // タイムアウトを5秒に延長
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow' // ← ここを追加しリダイレクト追従を明示
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('GASへのリクエストがタイムアウトしました。');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`❌ HTTPエラー: ${res.status} ${res.statusText}`);
      await interaction.editReply({
        content: '⚠️ GASとの通信に失敗しました。',
        ephemeral: true
      });
      return;
    }

    const text = await res.text();
    console.log('📦 受信したレスポンス:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON パースエラー:', parseError);
      await interaction.editReply({
        content: '⚠️ GAS から不正なデータが返されました。',
        ephemeral: true
      });
      return;
    }

    if (data.error) {
      console.warn('⚠️ GAS からのエラー:', data.error);
      await interaction.editReply({
        content: `❌ ${data.error}`,
        ephemeral: true
      });
      return;
    }

    if (!data.entries || !Array.isArray(data.entries) || data.entries.length === 0) {
      await interaction.editReply({
        content: '⚠️ 該当するPT情報が見つかりませんでした。',
        ephemeral: true
      });
      return;
    }

    const description = data.entries
      .map(entry => `${escapeMarkdown(entry.label)} | ${escapeMarkdown(entry.value)}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`PT情報: ${escapeMarkdown(data.title)}`)
      .setColor(0x00AE86)
      .setDescription(description)
      .setFooter({ text: '参加or訂正は該当URLから' });

    console.log(`✅ 埋め込みメッセージを送信しました: ${data.title}`);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('❌ GAS からのデータ取得に失敗しました:', error);

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: `⚠️ エラー: ${error.message || '情報取得中に問題が発生しました。'}`,
        ephemeral: true
      }).catch(console.error);
    } else if (interaction.isRepliable()) {
      await interaction.reply({
        content: `⚠️ エラー: ${error.message || '情報取得中に問題が発生しました。'}`,
        ephemeral: true
      }).catch(console.error);
    }
  }
}

module.exports = { handlePTInfo };
