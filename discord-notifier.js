const Discord = require("discord.js");
const config = require("./config.json");
const commandPrefix = "!";

function loginInBot() {
  const client = new Discord.Client();
  messageListener(client);
  client.login(config.BOT_TOKEN);
}

function messageListener(client) {
  client.on("message", function(message) { 
    if (message.author.bot) return;
    if (!message.content.startsWith(commandPrefix)) return;

    const commandBody = message.content.slice(commandPrefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "ping") {
      const timeTaken = Date.now() - message.createdTimestamp;
      message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
    }
  });
}


loginInBot();
