const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// 🔹 スラッシュコマンドの定義
const commands = [
  new SlashCommandBuilder()
    .setName('ptinfo')
    .setDescription('PT情報を取得します')
    // ここで将来的にオプションを追加することもできます
    // 例: .addStringOption(option => option.setName('pt').setDescription('PT番号').setRequired(true))
    .toJSON()
];

// 🔹 コマンド登録関数
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  console.log('⏳ スラッシュコマンドを登録中...');

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('✅ スラッシュコマンドの登録が完了しました！');
}

// 🔹 他のファイルから使えるようにエクスポート
module.exports = { registerCommands };
