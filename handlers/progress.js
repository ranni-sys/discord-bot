const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

async function handleprogress(membername) {
  if (!membername) throw new Error('家名が指定されていません');

  const url = `${process.env.GAS_URL}?membername=${encodeURIComponent(membername)}`;
  console.log(`🌐 GAS にリクエスト送信中: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('GASへのリクエストがタイムアウトしました。');
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`GAS通信エラー: ${res.status} ${res.statusText}`);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('GASから不正なJSONが返されました');
  }

  if (data.error) throw new Error(data.error);
  if (!data.entries || !Array.isArray(data.entries) || data.entries.length === 0) {
    throw new Error('該当する家名のクリア状況が見つかりませんでした');
  }

  return data;
}

// EmbedBuilderを返す関数
function createEmbedFromData(data) {
  const separator = '　'; // 全角スペース1文字
  const descriptionLines = data.entries.map(entry => {
    if (entry.type === 'separator') {
      return separator; // 空行として全角スペース1文字
    }
    return `${escapeMarkdown(entry.label)} | ${escapeMarkdown(entry.value)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`クリア状況: ${escapeMarkdown(data.title)}`)
    .setColor(0x00AE86)
    .setDescription(descriptionLines.join('\n'))
    .setFooter({ text: '情報は古い可能性があります' });

  return embed;
}

module.exports = { handleprogress, createEmbedFromData };
