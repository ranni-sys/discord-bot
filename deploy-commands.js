const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('ptinfo')
    .setDescription('指定したPT番号の情報を取得します')
    .addStringOption(option =>
      option.setName('ptNumber')
        .setDescription('取得したいPT番号（例: PT1）')
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('🔄 スラッシュコマンドを登録中...');

    // 既存のアプリケーションコマンドを取得
const existingCommands = await rest.get(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
);

for (const command of existingCommands) {
  if (commands.find(cmd => cmd.name === command.name)) {
    console.log(`🗑️ 既存コマンド '${command.name}' を削除中...`);
    await rest.delete(
      Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, command.id)
    );
  }
}

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);


    console.log('✅ スラッシュコマンドを登録しました！');
  } catch (error) {
    console.error('❌ スラッシュコマンド登録中にエラーが発生しました:', error);
  }
}

module.exports = { registerCommands };
