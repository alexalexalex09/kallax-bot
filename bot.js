require("dotenv").config();
const axios = require("axios").default;
const eris = require("eris");
require("./mongo.js"); //Start the mongo connection
const User = require("./models/users.js");

/*
const { Client, GatewayIntentBits } = require("discord.js");
const token = process.env.bot_token;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
	} else if (commandName === 'user') {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
	}
});

client.login(token);

*/

/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

const PREFIX = "kb!";
const API_KEY_LENGTH = 64;
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

let commandFunctions = {};
commandFunctions["help"] = (msg, args) => {
  msg.channel.createMessage(
    `The commands for this bot are: \n
    \t**kb! register**
    \tThis command will register your username and send a DM with instructions on how to connect your Kallax account.

    \t**kb! game** ***Board Game Name***
    \tThis command will retrieve your stats for the specified board game.

    \t**kb! bgg** ***Board Game Geek ID***
    \tThis command will retrieve your stats for a board game identified by "Board Game Geek ID" if you are registered.
    
    \t**kb! bga** ***Board Game Atlas ID***
    \tThis command will retrieve your stats for a board game identified by "Board Game Geek ID" if you are registered.
    
    \t**kb! help**
    \tDisplays this help text
    `
  );
};
commandFunctions["bgg"] = (msg, args) => {
  const boardGame = args.join(" ");
  User.findOne({ id: msg.author.id }).then(function (curUser) {
    retrieveBoardGame(
      msg,
      curUser,
      `https://api.kallax.io/api/owns/${boardGame}?source=bgg`,
      `https://boardgamegeek.com/boardgame/${boardGame}`
    );
  });
  return;
};

commandFunctions["bga"] = (msg, args) => {
  const boardGame = args.join(" ");
  User.findOne({ id: msg.author.id }).then(function (curUser) {
    retrieveBoardGame(
      msg,
      curUser,
      `https://api.kallax.io/api/owns/${boardGame}?source=bga`,
      `https://boardgameatlas.com/game/${boardGame}`
    );
  });
  return;
};

commandFunctions["game"] = (msg, args) => {
  const boardGame = args.join(" ");
  User.findOne({ id: msg.author.id }).then(function (curUser) {
    endpoint = `https://api.boardgameatlas.com/api/search?client_id=${
      process.env.BGAID
    }&name=${boardGame.replace(/[^0-9a-zA-Z' ]/g, "")}`;
    const options = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    console.log({ boardGame });
    axios.get(endpoint, options).then(
      function (response) {
        console.log(response.data.games);
        retrieveBoardGame(
          msg,
          curUser,
          "https://api.kallax.io/api/owns/" +
            response.data.games[0].id +
            "?source=bga",
          `https://boardgameatlas.com/game/${response.data.games[0].id}`
        );
      },
      function (error) {
        console.log({ error });
      }
    );
  });
  return;
};

commandFunctions["register"] = (msg, args) => {
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
  //If this is a DM, it's a user sending an API key
  if (!msg.channel.guild) {
    const sanitizedContent = msg.content.replace(/[^0-9a-zA-Z]/g, "");
    if (sanitizedContent.length != API_KEY_LENGTH) return;

    User.findOne({ id: msg.author.id })
      .exec()
      .then(function (curUser) {
        curUser.apiKey = sanitizedContent;
        curUser.save();
      });
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
  let commandName = parts[1];
  let beginSlice = 2;
  //If the user included the command without a space after the prefix, compensate
  if (parts[0].length > PREFIX.length) {
    commandName = parts[0].substring(PREFIX.length);
    beginSlice = 1;
  }

  // Get the appropriate handler for the command, if there is one.
  const commandHandler = commandFunctions[commandName];
  if (!commandHandler) {
    return;
  }

  // Separate the command arguments from the command prefix and command name.
  const args = parts.slice(beginSlice);
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

function getBoardGameArgs(msg, args) {
  const boardGame = args.join(" ");
  const mention = "<@" + msg.author.id + ">";
  console.log(boardGame);
  console.log(mention);
  return { boardGame: boardGame, mention: mention };
}

function retrieveBoardGame(msg, curUser, endpoint, link) {
  const mention = "<@" + msg.author.id + ">";
  const options = {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": curUser.apiKey,
    },
  };
  axios
    .get(endpoint, options)
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
        bgaString = `https://api.boardgameatlas.com/api/search?client_id=${process.env.BGAID}&name=${data.game.title}`;
        const bgaOptions = {
          headers: {
            "Content-Type": "application/json",
          },
        };
        axios.get(bgaString, bgaOptions).then(function (imageResponse) {
          console.log(imageResponse.data.games[0].images.thumb);
          msg.channel.createMessage({
            content: `${mention}, here are your results:`,
            embed: {
              title: `${data.game.title}`,
              url: link,
              thumbnail: { url: imageResponse.data.games[0].images.thumb },
              description: `You ${data.owned ? "" : "don't"} own this game
              ${data.friends.length} of your friends own this game`,
            },
          });
        });
      }
    })
    .catch((res) => {
      var caughtError = res.toString();
      msg.channel.createMessage(JSON.stringify(caughtError, null, 4));
    });
}
