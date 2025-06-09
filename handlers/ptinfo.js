const fetch = require('node-fetch');
const { EmbedBuilder, InteractionResponseFlags } = require('discord.js');

function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

async function handlePTInfo(interaction, PTnumber, signal = null, useFollowUp = false) {
  try {
    if (!PTnumber) {
      console.warn('⚠️ PT番号が未指定でリクエストされました');
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❗ PT番号が指定されていません。',
          flags: InteractionResponseFlags.Ephemeral,
        }).catch(console.error);
      }
      return;
    }

    const url = `${process.env.GAS_URL}?PTnumber=${encodeURIComponent(PTnumber)}`;
    console.log(`🌐 GAS にリクエスト送信中: ${url}`);

    const controller = signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 10000) : null;

    let res;
    try {
      res = await fetch(url, {
        signal: signal ?? controller.signal,
        redirect: 'follow'
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('GASへのリクエストがタイムアウトしました。');
      }
      throw fetchError;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`❌ HTTPエラー: ${res.status} ${res.statusText}`);
      if (useFollowUp) {
        await interaction.followUp({
          content: '⚠️ GASとの通信に失敗しました。',
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: '⚠️ GASとの通信に失敗しました。',
          flags: InteractionResponseFlags.Ephemeral,
        });
      }
      return;
    }

    const text = await res.text();
    console.log('📦 受信したレスポンス:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ JSON パースエラー:', parseError);
      if (useFollowUp) {
        await interaction.followUp({
          content: '⚠️ GAS から不正なデータが返されました。',
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: '⚠️ GAS から不正なデータが返されました。',
          flags: InteractionResponseFlags.Ephemeral,
        });
      }
      return;
    }

    if (data.error) {
      console.warn('⚠️ GAS からのエラー:', data.error);
      if (useFollowUp) {
        await interaction.followUp({
          content: `❌ ${data.error}`,
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: `❌ ${data.error}`,
          flags: InteractionResponseFlags.Ephemeral,
        });
      }
      return;
    }

    if (!data.entries || !Array.isArray(data.entries) || data.entries.length === 0) {
      if (useFollowUp) {
        await interaction.followUp({
          content: '⚠️ 該当するPT情報が見つかりませんでした。',
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: '⚠️ 該当するPT情報が見つかりませんでした。',
          flags: InteractionResponseFlags.Ephemeral,
        });
      }
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

    if (useFollowUp) {
      await interaction.followUp({ embeds: [embed] });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }

  } catch (error) {
    console.error('❌ GAS からのデータ取得に失敗しました:', error);

    if (useFollowUp) {
      await interaction.followUp({
        content: `⚠️ エラー: ${error.message || '情報取得中に問題が発生しました。'}`,
        ephemeral: true,
      }).catch(console.error);
    } else if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: `⚠️ エラー: ${error.message || '情報取得中に問題が発生しました。'}`,
        flags: InteractionResponseFlags.Ephemeral,
      }).catch(console.error);
    } else if (interaction.isRepliable()) {
      await interaction.reply({
        content: `⚠️ エラー: ${error.message || '情報取得中に問題が発生しました。'}`,
        flags: InteractionResponseFlags.Ephemeral,
      }).catch(console.error);
    }
  }
}

module.exports = { handlePTInfo };
