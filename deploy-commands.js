const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// コマンド定義
const commands = [
  new SlashCommandBuilder()
    .setName('ptinfo')
    .setDescription('指定したPT番号の情報を取得します')
    .addStringOption(option =>
      option.setName('ptnumber')
        .setDescription('取得したいPT番号（例: PT001）')
        .setRequired(true)
    )
    .toJSON()
];

// RESTクライアントを初期化
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// コマンド登録関数
async function registerCommands() {
  try {
    console.log('🔄 スラッシュコマンドを登録中...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ スラッシュコマンドを登録しました！');
  } catch (error) {
    console.error('❌ スラッシュコマンド登録中にエラーが発生しました:', error);
  }
}

module.exports = { registerCommands };
