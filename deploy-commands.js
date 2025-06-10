const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('ptinfo')
    .setDescription('指定したPT番号の情報を取得します')
    .addStringOption(option =>
      option.setName('ptnumber')
        .setDescription('取得したいPT番号（例: PT1）')
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('🔄 既存のスラッシュコマンドを削除中...');

    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    );

    for (const command of existingCommands) {
      console.log(`🗑️ コマンド '${command.name}' を削除中...`);
      await rest.delete(
        Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, command.id)
      );
    }

    console.log('🆕 スラッシュコマンドを登録中...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('✅ スラッシュコマンドを登録しました！');
  } catch (error) {
    if (error.code && error.code === 50001) {
      console.error('❌ アクセス許可が不足しています。Botに適切な権限が付与されているか確認してください。');
    } else {
      console.error('❌ スラッシュコマンド登録中にエラーが発生しました:', error);
    }
  }
}

module.exports = { registerCommands };
