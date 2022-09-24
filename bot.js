require("dotenv").config();
const axios = require("axios").default;
const eris = require("eris");
require("./mongo.js"); //Start the mongo connection
const User = require("./models/users.js");

const PREFIX = "kb!";
const API_MSG = `Hello, please respond to this message with your API key. Remember, never share your API key with others.`;

const bot = new eris.Client(process.env.bot_token, {
  intents: [
    eris.Constants.Intents.guilds,
    eris.Constants.Intents.guildMessages,
    eris.Constants.Intents.guildMessageReactions,
    eris.Constants.Intents.directMessages,
    eris.Constants.Intents.directMessageReactions,
  ],
});
/*
bot.createCommand({
  name: "getBoardGame",
  description: "input a board game from BGG",
  options: [],
  type: eris.Constants.ApplicationCommandTypes.CHAT_INPUT,
});*/

const commandHandlerForCommandName = {};
commandHandlerForCommandName["getBoardGame"] = (msg, args) => {
  const boardGame = args.join(" ");
  const mention = "<@" + msg.author.id + ">";
  User.findOne({ id: msg.author.id }).then(function (curUser) {
    const options = {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": curUser.apiKey,
      },
    };
    axios
      .get(
        "https://api.kallax.io/api/owns/" + boardGame + "?source=bgg",
        options
      )
      .then(function (response) {
        if (response.status < 200 || response.status > 299) {
          var ret = { error: true, code: response.status };
          var httpError = ret;
          console.log(JSON.stringify(httpError, null, 4));
          switch (response.status) {
            case 500:
              ret.message =
                "Sorry, this game could not be found. We're working on adding it to our database!";
              return ret;
              break;
            case 401:
              ret.message =
                "The previous login attempt failed. Please try to log in again.";
              return ret;
              break;
            default:
              ret.message = "Error " + response.status;
              return ret;
          }
        } else {
          console.log({ response });
          return response;
        }
      })
      .then(function (res) {
        const data = res.data;
        if (data.error) {
          var error = data;
          msg.channel.createMessage(JSON.stringify(error, null, 4));
        } else {
          msg.channel.createMessage(`
          ${mention}, here are your results for ${data.game.title}:
          You ${data.owned ? "" : "don't"} own this game
          ${data.friends.length} of your friends own this game
          `);
        }
      })
      .catch((res) => {
        var caughtError = res.toString();
        msg.channel.createMessage(JSON.stringify(caughtError, null, 4));
      });
  });
  return;
};

commandHandlerForCommandName["register"] = (msg, args) => {
  const mention = "<@" + msg.author.id + ">";
  msg.author.getDMChannel().then(function (channel) {
    User.findOne({ mention: mention })
      .exec()
      .then(function (curUser) {
        if (!curUser) {
          msg.author.getDMChannel().then(function (channel) {
            const newUser = new User({
              mention: mention,
              username: msg.author.username,
              dmChannel: channel.id,
              apiKey: null,
              id: msg.author.id,
            });
            newUser.save();
          });
        }
      });
    channel.createMessage(API_MSG);
  });

  return msg.channel.createMessage(
    `Hi ${mention}! I've sent you a direct message. 
    
    REMEMBER: NEVER SHARE YOUR API KEY WITH OTHERS.`
  );
};

bot.on("messageCreate", async (msg) => {
  const content = msg.content;
  console.log({ content });
  // Ignore any messages sent as direct messages.
  // The bot will only accept commands issued in
  // a guild.
  if (!msg.channel.guild) {
    const sanitizedContent = msg.content.replace(/[^0-9a-zA-Z]/g, "");
    if (sanitizedContent.length != 64) return;
    User.findOne({ id: msg.author.id })
      .exec()
      .then(function (curUser) {
        curUser.apiKey = sanitizedContent;
        curUser.save();
      });
  }
  /*
  bot.on("interactionCreate", async (i) => {
    if (!(interaction instanceof CommandInteraction)) return;
    if (commandHandlerForCommandName.indexOf(interaction.data.name) === -1) {
      return i.createFollowup("Error");
    }
    commandHandlerForCommandName[interaction.data.name]();
  });
*/
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
