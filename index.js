async function main() {
  const name = "PT001"; // 例：仮のPT番号、実際はユーザー入力など
  const res = await fetch(`${process.env.GAS_URL}?PTnumber=${encodeURIComponent(name)}`);
  const data = await res.json();
  console.log(data);
}

main();

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
