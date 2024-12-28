const fs = require('fs');
const axios = require('axios');
const login = require('fca-shankar-bot');

module.exports.config = {
  name: "convo",
  version: "1.0",
  hasPermssion: 2,
  author: "SHANKAR",
  description: "goi bot no prefix baby",
  commandCategory: "fun",
  usages: "!goibot start / !goibot off",
  cooldowns: 5,
};

const botAdminUIDs = ["100058415170590", "100094547994769"]; // Replace with actual admin UIDs

const textFiles = {
  "SHANKAR-HINDI": 'https://raw.githubusercontent.com/SHANKAR-BOT/CONVO-PASSWORD/main/SHANKAR-HINDI.txt',
  "SHANKAR-ENGLISH": 'https://raw.githubusercontent.com/SHANKAR-BOT/CONVO-PASSWORD/main/SHANKAR-ENGLISH.txt',
  "SHANKAR-SHAYRI": 'https://raw.githubusercontent.com/SHANKAR-BOT/CONVO-PASSWORD/main/SHANKAR-SHAYRI.txt',
  "SHANKAR-BD": 'https://raw.githubusercontent.com/SHANKAR-BOT/CONVO-PASSWORD/main/SHANKAR-BD.txt',
  "SHANKAR-WARNING": 'https://raw.githubusercontent.com/SHANKAR-BOT/CONVO-PASSWORD/main/SHANKAR-WARNING.txt'
};

// GitHub raw file URL जहां पासवर्ड स्टोर है
const passwordUrl = 'https://raw.githubusercontent.com/SHANKAR-BOT/password/main/password.txt';

let convoSettings = {
  targetID: null,
  senderName: "",
  speed: 2,
  filePath: "",
  running: false,
  useAppState: false,
  appState: null,
  accessToken: null,
  accountOption: null,
  isAuthenticated: false
}

const getRepliesFromFile = async (fileUrl) => {
  try {
    const response = await axios.get(fileUrl);
    const data = response.data;
    return data.split('\n').filter(line => line.trim());
  } catch (error) {
    throw new Error("Failed to read replies from file.");
  }
};

const sendMessage = (api, targetID, message, speed) => {
  return new Promise(resolve => {
    setTimeout(() => {
      api.sendMessage(message, targetID, (err) => {
        if (err) {
          console.error("Failed to send message:", err);
        }
      });
      resolve();
    }, speed * 1000);
  });
};

const startConvo = async (api) => {
  try {
    const replies = await getRepliesFromFile(convoSettings.filePath);
    const defaultReply = "This is a default message."; // Default message if file is empty
    convoSettings.running = true;
    while (convoSettings.running) {
      for (let reply of replies.length ? replies : [defaultReply]) {
        if (!convoSettings.running) break;
        const personalizedReply = `${convoSettings.senderName} ${reply}`;
        await sendMessage(api, convoSettings.targetID, personalizedReply, convoSettings.speed);
      }
    }
  } catch (error) {
    console.error("Error during conversation:", error);
  }
};

const loginWithAppState = async (appState, callback, api, threadID) => {
  login({ appState }, (err, api) => {
    if (err) {
      console.error('Failed to login with appstate:', err);
      api.sendMessage('Appstate has expired or is invalid. Please provide a valid appstate.', threadID);
      return;
    }
    console.log('Successfully logged in with appstate.');
    callback(api);
  });
};

const loginWithAccessToken = async (accessToken, callback, api, threadID) => {
  login({ accessToken }, (err, api) => {
    if (err) {
      console.error('Failed to login with access token:', err);
      api.sendMessage('Access token has expired or is invalid. Please provide a valid access token.', threadID);
      return;
    }
    console.log('Successfully logged in with access token.');
    callback(api);
  });
};

const readAdminAppState = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('admin.txt', 'utf8', (err, data) => {
      if (err) {
        reject("Failed to read admin appstate from file.");
      } else {
        try {
          const appState = JSON.parse(data);
          resolve(appState);
        } catch (error) {
          reject("Invalid appstate JSON in admin.txt.");
        }
      }
    });
  });
};

const verifyPassword = async (inputPassword) => {
  try {
    const response = await axios.get(passwordUrl);
    const storedPassword = response.data.trim();
    return storedPassword === inputPassword;
  } catch (error) {
    console.error("Failed to fetch password:", error);
    return false;
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!botAdminUIDs.includes(senderID)) {
    return api.sendMessage("Only the bot admin can use this command.", threadID, messageID);
  }

  const command = args[0];

  if (command === "start") {
    // Step 1: Ask for password
    api.sendMessage("Please enter the password to start the conversation:", threadID, (err, info) => {
      global.client.handleReply.push({
        step: 1,
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    });
  } else if (command === "off") {
    convoSettings.running = false;
    return api.sendMessage("Conversation has been stopped.", threadID, messageID);
  } else {
    return api.sendMessage("Invalid command. Use '!goibot start' or '!goibot off'.", threadID, messageID);
  }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, senderID, body } = event;

  if (handleReply.author !== senderID) return;

  switch (handleReply.step) {
    case 1:
      const inputPassword = body.trim();
      const isPasswordCorrect = await verifyPassword(inputPassword);
      if (isPasswordCorrect) {
        convoSettings.isAuthenticated = true;
        api.sendMessage("Password correct. Which account do you want to use to send messages?\n1. Bot's Facebook account\n2. Admin's Facebook account\n3. Other appstate\n4. Access Token", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 2,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      } else {
        api.sendMessage("Incorrect password. Please enter the correct password:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 1,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      }
      break;

    case 2:
      const accountOption = parseInt(body);
      if (accountOption === 1) {
        convoSettings.accountOption = 'bot';
        api.sendMessage("Please enter the target UID or TID:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 3,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      } else if (accountOption === 2) {
        convoSettings.accountOption = 'admin';
        try {
          convoSettings.appState = await readAdminAppState();
          console.log("Admin appstate read successfully.");
          api.sendMessage("Please enter the target UID or TID:", threadID, (err, info) => {
            global.client.handleReply.push({
              step: 3,
              name: this.config.name,
              messageID: info.messageID,
              author: senderID
            });
          });
        } catch (error) {
          return api.sendMessage(error, threadID);
        }
      } else if (accountOption === 3) {
        convoSettings.accountOption = 'other';
        api.sendMessage("Please provide the appstate JSON:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 3,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      } else if (accountOption === 4) {
        convoSettings.accountOption = 'token';
        api.sendMessage("Please provide the access token:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 3,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      } else {
        return api.sendMessage("Invalid option. Please enter 1, 2, 3, or 4.", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 2,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      }
      break;

    case 3:
      if (convoSettings.accountOption === 'other') {
        try {
          convoSettings.appState = JSON.parse(body);
          console.log("Appstate JSON received:", convoSettings.appState);
          api.sendMessage("Please enter the target UID or TID:", threadID, (err, info) => {
            global.client.handleReply.push({
              step: 4,
              name: this.config.name,
              messageID: info.messageID,
              author: senderID
            });
          });
        } catch (error) {
          return api.sendMessage("Invalid appstate JSON. Please try again.", threadID, (err, info) => {
            global.client.handleReply.push({
              step: 3,
              name: this.config.name,
              messageID: info.messageID,
              author: senderID
            });
          });
        }
      } else if (convoSettings.accountOption === 'token') {
        convoSettings.accessToken = body;
        console.log("Access token received:", convoSettings.accessToken);
        api.sendMessage("Please enter the target UID or TID:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 4,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      } else {
        convoSettings.targetID = body;
        api.sendMessage("Please enter the sender name:", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 4,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      }
      break;

    case 4:
      convoSettings.senderName = body;
      api.sendMessage("Please enter the message sending speed (in seconds):", threadID, (err, info) => {
        global.client.handleReply.push({
          step: 5,
          name: this.config.name,
          messageID: info.messageID,
          author: senderID
        });
      });
      break;

    case 5:
      convoSettings.speed = parseInt(body);
      if (isNaN(convoSettings.speed) || convoSettings.speed <= 0) {
        return api.sendMessage("Invalid speed. Please enter a positive number.", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 5,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      }
      let fileOptions = "Please select your text file:\n";
      Object.keys(textFiles).forEach((file, index) => {
        fileOptions += `${index + 1}. ${file}\n`;
      });
      api.sendMessage(fileOptions, threadID, (err, info) => {
        global.client.handleReply.push({
          step: 6,
          name: this.config.name,
          messageID: info.messageID,
          author: senderID
        });
      });
      break;

    case 6:
      const fileIndex = parseInt(body) - 1;
      const fileKeys = Object.keys(textFiles);
      if (fileIndex >= 0 && fileIndex < fileKeys.length) {
        convoSettings.filePath = textFiles[fileKeys[fileIndex]];
        api.sendMessage("Starting the conversation...", threadID);

        if (convoSettings.accountOption === 'admin' || convoSettings.accountOption === 'other') {
          // Login with the provided appstate and start the conversation
          loginWithAppState(convoSettings.appState, async (api) => {
            await startConvo(api);
          }, api, threadID);
        } else if (convoSettings.accountOption === 'token') {
          // Login with the provided access token and start the conversation
          loginWithAccessToken(convoSettings.accessToken, async (api) => {
            await startConvo(api);
          }, api, threadID);
        } else {
          // Use the bot's default account to start the conversation
          await startConvo(api);
        }
      } else {
        api.sendMessage("Invalid selection. Please try again.", threadID, (err, info) => {
          global.client.handleReply.push({
            step: 6,
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        });
      }
      break;

    default:
      break;
  }
};
