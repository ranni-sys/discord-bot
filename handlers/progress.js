const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

// GASから進捗データを取得
async function handleProgress(targetName) {
  const url = `${process.env.GAS_PROGRESS_URL}?targetName=${encodeURIComponent(targetName || '')}`;
  console.log(`🌐 GAS に進捗リクエスト送信中: ${url}`);

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
    throw new Error('該当する進捗情報が見つかりませんでした');
  }

  return data;
}

// EmbedBuilderで進捗情報を整形
function createProgressEmbed(data) {
  const lines = data.entries.map(entry => {
    const left = escapeMarkdown(entry.label).padEnd(10, ' ');
    const right = escapeMarkdown(entry.value);
    return `\`${left}\` | \`${right}\``;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${escapeMarkdown(data.title || '進捗情報')}`)
    .setColor(0x4CAF50)
    .setDescription(lines.join('\n'))
    .setFooter({ text: '※最新情報はGAS連携より取得' });

  return embed;
}

module.exports = {
  handleProgress,
  createProgressEmbed,
};

