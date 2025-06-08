const { Client, GatewayIntentBits } = require('discord.js');

// ✅ client を定義
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// ✅ client の準備ができたらログ出力
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ✅ interaction への対応
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ptinfo') {
    await handlePTInfo(interaction); // 自作の関数を呼び出す
  }
});

// ✅ 自作関数（例）
async function handlePTInfo(interaction) {
  const name = "PT001";
  const res = await fetch(`${process.env.GAS_URL}?PTnumber=${encodeURIComponent(name)}`);
  const data = await res.json();

  if (data.error) {
    await interaction.reply({ content: data.error, ephemeral: true });
    return;
  }

  const { EmbedBuilder } = require('discord.js');
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

// ✅ 最後にログインする
client.login(process.env.DISCORD_TOKEN);
