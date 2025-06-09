const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

// GASからPT情報を取得しJSONで返す関数
async function handlePTInfo(ptNumber) {
  if (!ptNumber) throw new Error('PT番号が指定されていません');

  const url = `${process.env.GAS_URL}?PTnumber=${encodeURIComponent(ptNumber)}`;
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
    throw new Error('該当するPT情報が見つかりませんでした');
  }

  return data;
}

// EmbedBuilderを返す関数
function createEmbedFromData(data) {
  const description = data.entries
    .map(entry => `${escapeMarkdown(entry.label)} | ${escapeMarkdown(entry.value)}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`PT情報: ${escapeMarkdown(data.title)}`)
    .setColor(0x00AE86)
    .setDescription(description)
    .setFooter({ text: '参加or訂正は該当URLから' });

  return embed;
}

module.exports = { handlePTInfo, createEmbedFromData };
