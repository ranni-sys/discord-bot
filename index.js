const { EmbedBuilder } = require('discord.js'); // 必要に応じて追加

async function main(interaction) {
  const name = "PT001"; // 実際は interaction から取得するなど
  const res = await fetch(`${process.env.GAS_URL}?PTnumber=${encodeURIComponent(name)}`);
  const data = await res.json();

  if (data.error) {
    await interaction.reply({ content: data.error, ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`PT情報: ${data.title}`)
    .setColor(0x00AE86)
    .addFields(
      data.entries.map(entry => ({
        name: entry.label,
        value: entry.value || '―',
        inline: true
      }))
    )
    .setFooter({ text: 'PT祠募集（GAS連携）' });

  await interaction.reply({ embeds: [embed] });
}

// 例：Discordのイベントなどで interaction を受け取ったときに呼び出す
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ptinfo') {
    await main(interaction);
  }
});
