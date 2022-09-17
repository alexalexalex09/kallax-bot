require("dotenv").config();
const eris = require("eris");
require("./mongo.js"); //Start the mongo connection
const User = require("./models/users.js");

const PREFIX = "kb!";
const BOT_PUBLIC_ID =
  "da7a27d9a52d2a1eacc4561eaeaa2eb4a7ce9e6b5f22b7acab6fb0267ffbe059";
const API_URL = "https://kallax.io/security_credentials/" + BOT_PUBLIC_ID;

const bot = new eris.Client(process.env.bot_token);

const commandHandlerForCommandName = {};
commandHandlerForCommandName["getBoardGame"] = (msg, args) => {
  const boardGame = args.join(" ");
  const mention = "<@" + msg.author.id + ">";
  User.findOne({ mention: mention })
    .exec()
    .then(function (curUser) {
      console.log({ curUser });
      if (!curUser) {
        const newUser = new User({
          mention: mention,
          username: msg.author.username,
        });
        newUser.save();
      }
    });
  // TODO: Handle invalid command arguments, such as:
  // 1. No mention or invalid mention.
  // 2. No amount or invalid amount.

  return msg.channel.createMessage(`${mention} asked for ${boardGame}`);
};

commandHandlerForCommandName["register"] = (msg, args) => {
  const mention = "<@" + msg.author.id + ">";
  return msg.channel.createMessage(
    `Hi ${mention}! Please use this link and click "Authenticate Extension" while logged in:\n ${API_URL}`
  );
};

bot.on("messageCreate", async (msg) => {
  const content = msg.content;
  console.log({ content });
  // Ignore any messages sent as direct messages.
  // The bot will only accept commands issued in
  // a guild.
  if (!msg.channel.guild) {
    return;
  }

  // Ignore any message that doesn't start with the correct prefix.
  if (!content.startsWith(PREFIX)) {
    return;
  }

  // Extract the parts of the command and the command name
  const parts = content
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s);
  const commandName = parts[0].substring(PREFIX.length);

  // Get the appropriate handler for the command, if there is one.
  const commandHandler = commandHandlerForCommandName[commandName];
  if (!commandHandler) {
    return;
  }

  // Separate the command arguments from the command prefix and command name.
  const args = parts.slice(1);
  console.log({ parts });
  console.log({ commandName });
  console.log({ commandHandler });

  try {
    // Execute the command.
    await commandHandler(msg, args);
  } catch (err) {
    console.warn("Error handling command");
    console.warn(err);
  }
});

bot.on("error", (err) => {
  console.warn(err);
});

bot.connect();
