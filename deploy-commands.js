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
    console.log('🔄 スラッシュコマンドを登録中...');

    // 既存のアプリケーションコマンドを取得
    const existingCommands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );

    // 同名のコマンドがあれば削除
    for (const command of existingCommands) {
      if (commands.find(cmd => cmd.name === command.name)) {
        console.log(`🗑️ 既存コマンド '${command.name}' を削除中...`);
        await rest.delete(
          Routes.applicationCommand(process.env.CLIENT_ID, command.id)
        );
      }
    }

    // 新しいコマンドを登録
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
