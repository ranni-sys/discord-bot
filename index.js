const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TOKEN = process.env.DISCORD_TOKEN;
const GAS_URL = process.env.GAS_URL;

client.once('ready', () => {
  console.log(`Bot is ready`);
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith('!search') || message.author.bot) return;

  const args = message.content.split(' ');
  const name = args[1];
  if (!name) return message.reply('名前を入力してください。');

  const res = await fetch(`${GAS_URL}?name=${encodeURIComponent(name)}`);
  const text = await res.text();

  message.reply(text);
});

client.login(TOKEN);
