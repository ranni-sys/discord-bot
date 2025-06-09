const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');

async function handlePTInfo(interaction) {
  const ptNumber = interaction.options.getString('ptnumber');

  if (!ptNumber) {
    await interaction.reply({
      content: '❗ PT番号が指定されていません。',
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.deferReply();

    const url = `${process.env.GAS_URL}?PTnumber=${encodeURIComponent(ptNumber)}`;
    console.log("🔗 Fetching URL:", url);

    const res = await fetch(url);
    const text = await res.text();
    console.log("📦 Raw response text:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ JSON パースエラー:", parseError);
      await interaction.editReply({
        content: '⚠️ GAS から不正なデータが返されました。',
        ephemeral: true
      });
      return;
    }

    if (data.error) {
      await interaction.editReply({
        content: `❌ ${data.error}`,
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`PT情報: ${data.title}`)
      .setColor(0x00AE86)
      .setDescription(
        data.entries
          .map(entry => `${entry.label} | ${entry.value || '―'}`)
          .join('\n')
      )
      .setFooter({ text: '参加or訂正は該当URLから' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('❌ GAS からのデータ取得に失敗しました:', error);
    await interaction.editReply({
      content: '⚠️ GAS から情報を取得できませんでした。しばらくしてから再度お試しください。',
      ephemeral: true
    });
  }
}

module.exports = { handlePTInfo };
