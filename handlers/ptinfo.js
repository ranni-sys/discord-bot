const fetch = require('node-fetch');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// Markdownの特殊文字をエスケープ
function escapeMarkdown(text) {
  return (typeof text === 'string' ? text : String(text ?? '―')).replace(/([*_`~|])/g, '\\$1');
}

// GASからPT情報を取得
async function handlePTInfo(ptnumber) {
  if (!ptnumber) throw new Error('PT番号が指定されていません');

  const url = `${process.env.GAS_URL}?ptnumber=${encodeURIComponent(ptnumber)}`;
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

// EmbedBuilderを生成する内部関数
function createEmbedFromData(data) {
  const separator = '　'; // 全角スペース1文字
  const descriptionLines = data.entries.map(entry =>
    entry.type === 'separator'
      ? separator
      : `${escapeMarkdown(entry.label)} | ${escapeMarkdown(entry.value)}`
  );

  return new EmbedBuilder()
    .setTitle(`PT情報: ${escapeMarkdown(data.title)}`)
    .setColor(0x00AE86)
    .setDescription(descriptionLines.join('\n'))
    .setFooter({ text: '参加or訂正は該当URLから' });
}

// Embedとボタンコンポーネントを返す関数
function createEmbedComponentsFromData(data) {
  const embed = createEmbedFromData(data);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('参加')
      .setStyle(ButtonStyle.Link)
      .setURL(data.joinUrl || 'https://forms.gle/HYkr84wHRwyinsxB9'),

    new ButtonBuilder()
      .setLabel('削除')
      .setStyle(ButtonStyle.Link)
      .setURL(data.deleteUrl || 'https://forms.gle/RkfGGH2NGBD2CwTK8')
  );

  return { embed, components: [buttons] };
}

module.exports = {
  handlePTInfo,
  createEmbedComponentsFromData,
};
