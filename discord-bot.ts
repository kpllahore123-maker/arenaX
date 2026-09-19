var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActivityType,
  REST,
  Routes,
  PermissionsBitField,
} from "discord.js";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { db } from "./src/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
const afkUsers = new Map();
const activeQuizzes = new Map();
const triviaPool = [
  {
    q: "Which country has won the most FIFA World Cups?",
    a: ["brazil"],
    correctText: "Brazil",
  },
  {
    q: "Who scored the famous 'Hand of God' goal in 1986?",
    a: ["diego maradona", "maradona"],
    correctText: "Diego Maradona",
  },
  {
    q: "Which club has won the most UEFA Champions League titles?",
    a: ["real madrid", "madrid"],
    correctText: "Real Madrid",
  },
  {
    q: "Who is the all-time top scorer in international men's football?",
    a: ["cristiano ronaldo", "ronaldo"],
    correctText: "Cristiano Ronaldo",
  },
  {
    q: "Which country won the FIFA World Cup 2022 in Qatar?",
    a: ["argentina"],
    correctText: "Argentina",
  },
  {
    q: "What is the nickname of Chelsea Football Club?",
    a: ["the blues", "blues"],
    correctText: "The Blues",
  },
  {
    q: "Which player has won the most Ballon d'Or awards in football history?",
    a: ["lionel messi", "messi"],
    correctText: "Lionel Messi",
  },
  {
    q: "Which English club has won the most Premier League titles?",
    a: ["manchester united", "man united", "manutd"],
    correctText: "Manchester United",
  },
  {
    q: "Who is known as the 'King of Football' and won 3 World Cups?",
    a: ["pele"],
    correctText: "Pele",
  },
  {
    q: "Which country hosted the 2014 FIFA World Cup?",
    a: ["brazil"],
    correctText: "Brazil",
  },
];
const CONFIG_FILE = path.join(process.cwd(), "bot-config.json");
const DEFAULT_CONFIG = {
  prefix: "!",
  systemInstruction:
    "You are an intelligent, helpful, and funny AI Discord Bot powered by Gemini. You reply with a casual, engaging tone. Use Discord markdown features (bold, italics, code blocks, lists) to format your replies beautifully.",
  temperature: 0.7,
  allowedChannels: [],
  maintenanceMode: false,
  welcomeChannelId: "",
  guilds: {},
};
const botLogs = [];
function addBotLog(message) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  botLogs.push(logEntry);
  if (botLogs.length > 100) {
    botLogs.shift();
  }
}
__name(addBotLog, "addBotLog");
function getBotConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    addBotLog("Error reading bot config: " + error.message);
  }
  return DEFAULT_CONFIG;
}
__name(getBotConfig, "getBotConfig");
function saveBotConfig(config) {
  const current = getBotConfig();
  const updated = { ...current, ...config };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    addBotLog("Bot configuration updated successfully.");
  } catch (error) {
    addBotLog("Error writing bot config: " + error.message);
  }
  return updated;
}
__name(saveBotConfig, "saveBotConfig");
function getGuildConfig(guildId) {
  const cfg = getBotConfig();
  if (!cfg.guilds) cfg.guilds = {};
  if (!cfg.guilds[guildId]) {
    cfg.guilds[guildId] = {
      welcomeChannelId: cfg.welcomeChannelId || "",
      warningLinkChannels: [],
      notBotChannels: [],
      userWarnings: {},
    };
  }
  if (!Array.isArray(cfg.guilds[guildId].warningLinkChannels)) {
    cfg.guilds[guildId].warningLinkChannels = [];
  }
  if (!Array.isArray(cfg.guilds[guildId].notBotChannels)) {
    cfg.guilds[guildId].notBotChannels = [];
  }
  if (
    !cfg.guilds[guildId].userWarnings ||
    typeof cfg.guilds[guildId].userWarnings !== "object"
  ) {
    cfg.guilds[guildId].userWarnings = {};
  }
  return cfg.guilds[guildId];
}
__name(getGuildConfig, "getGuildConfig");
function saveGuildConfig(guildId, data) {
  const cfg = getBotConfig();
  if (!cfg.guilds) cfg.guilds = {};
  const current = getGuildConfig(guildId);
  cfg.guilds[guildId] = { ...current, ...data };
  saveBotConfig(cfg);
  return cfg.guilds[guildId];
}
__name(saveGuildConfig, "saveGuildConfig");

function getUserWarnings(guildId, userId) {
  const gCfg = getGuildConfig(guildId);
  const uData = gCfg.userWarnings?.[userId];
  return {
    count: uData?.count || 0,
    totalWarnings: uData?.totalWarnings || 0,
    totalTimeouts: uData?.totalTimeouts || 0,
    history: Array.isArray(uData?.history) ? uData.history : [],
    lastTimeoutAt: uData?.lastTimeoutAt,
  };
}
__name(getUserWarnings, "getUserWarnings");

function clearUserWarnings(guildId, userId) {
  const cfg = getBotConfig();
  if (!cfg.guilds) cfg.guilds = {};
  if (!cfg.guilds[guildId]) return false;
  if (!cfg.guilds[guildId].userWarnings) cfg.guilds[guildId].userWarnings = {};
  if (cfg.guilds[guildId].userWarnings[userId]) {
    cfg.guilds[guildId].userWarnings[userId].count = 0;
    saveBotConfig(cfg);
    return true;
  }
  return false;
}
__name(clearUserWarnings, "clearUserWarnings");

async function addUserWarning(guild, targetUser, moderatorName, reason) {
  const cfg = getBotConfig();
  if (!cfg.guilds) cfg.guilds = {};
  if (!cfg.guilds[guild.id]) {
    cfg.guilds[guild.id] = {
      welcomeChannelId: "",
      warningLinkChannels: [],
      notBotChannels: [],
      userWarnings: {},
    };
  }
  if (!cfg.guilds[guild.id].userWarnings) {
    cfg.guilds[guild.id].userWarnings = {};
  }

  const userWarnings = cfg.guilds[guild.id].userWarnings;
  if (!userWarnings[targetUser.id]) {
    userWarnings[targetUser.id] = {
      count: 0,
      totalWarnings: 0,
      totalTimeouts: 0,
      history: [],
    };
  }

  const userData = userWarnings[targetUser.id];
  userData.count = (userData.count || 0) + 1;
  userData.totalWarnings = (userData.totalWarnings || 0) + 1;
  if (!Array.isArray(userData.history)) userData.history = [];
  userData.history.push({
    reason,
    moderator: moderatorName,
    timestamp: Date.now(),
  });

  const currentCount = userData.count;
  const TIMEOUT_HOURS = 12;
  const TIMEOUT_MS = TIMEOUT_HOURS * 60 * 60 * 1000; // 12 hours = 43,200,000 ms

  if (currentCount >= 3) {
    userData.count = 0; // Reset active counter so subsequent infractions require 3 new warnings
    userData.totalTimeouts = (userData.totalTimeouts || 0) + 1;
    userData.lastTimeoutAt = Date.now();
    saveBotConfig(cfg);

    let timeoutApplied = false;
    try {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (member) {
        if (member.moderatable) {
          await member.timeout(
            TIMEOUT_MS,
            `ArenaX Auto-Moderation: Reached 3 warnings (${reason})`
          );
          timeoutApplied = true;
          addBotLog(
            `Applied 12-hour timeout to ${targetUser.tag} in ${guild.name} (3 warnings reached)`
          );
        } else {
          addBotLog(
            `⚠️ Could not timeout ${targetUser.tag}: Member is not moderatable (higher role or owner).`
          );
        }
      }
    } catch (tErr) {
      addBotLog(
        `⚠️ Error applying timeout to ${targetUser.tag}: ${tErr.message}`
      );
    }

    // Direct Message (DM) to the user - exact requested message:
    // "ArenaX Esports keh server Mai 3 warnings pe apko 12 hour ka timeout Mila hn"
    const dmTimeoutEmbed = new EmbedBuilder()
      .setTitle("⛔ 12-Hour Timeout Notification")
      .setDescription(
        `**ArenaX Esports keh server Mai 3 warnings pe apko 12 hour ka timeout Mila hn.**\n\n` +
          `• **Server:** ${guild.name}\n` +
          `• **Final Infraction / Reason:** ${reason}\n` +
          `• **Moderator / Trigger:** ${moderatorName}\n` +
          `• **Duration:** 12 Hours (12 ghante)\n\n` +
          `*Aapka timeout 12 hours baad automatically expire ho jayega. Please ArenaX server ke rules follow karein taake future me permanent action na ho.*`
      )
      .setColor(15158332)
      .setFooter({ text: "ArenaX Esports Moderation System" })
      .setTimestamp();

    try {
      await targetUser.send({
        content: `⚠️ **ArenaX Esports keh server Mai 3 warnings pe apko 12 hour ka timeout Mila hn.**`,
        embeds: [dmTimeoutEmbed],
      });
      addBotLog(`Sent 12-hour timeout notification DM to ${targetUser.tag}`);
    } catch (dmErr) {
      addBotLog(
        `⚠️ Could not send timeout DM to ${targetUser.tag} (DMs disabled): ${dmErr.message}`
      );
    }

    return {
      count: 3,
      totalWarnings: userData.totalWarnings,
      timedOut: true,
      timeoutDurationMs: TIMEOUT_MS,
      timeoutApplied,
    };
  } else {
    saveBotConfig(cfg);

    // Direct Message (DM) for warning 1 or 2
    const dmWarnEmbed = new EmbedBuilder()
      .setTitle("⚠️ Warning Received")
      .setDescription(
        `Aapko **${guild.name}** me ek warning mili hai.\n\n` +
          `• **Reason:** ${reason}\n` +
          `• **Issued By:** ${moderatorName}\n` +
          `• **Active Warnings:** **${currentCount}/3**\n\n` +
          `🚨 **Dhyan dein:** 3 warnings hone par **12 hours ka timeout** lag jayega!`
      )
      .setColor(15105570)
      .setFooter({ text: "ArenaX Esports Moderation System" })
      .setTimestamp();

    try {
      await targetUser.send({
        content: `⚠️ **Warning ${currentCount}/3** in ${guild.name}: ${reason}`,
        embeds: [dmWarnEmbed],
      });
      addBotLog(`Sent warning DM (${currentCount}/3) to ${targetUser.tag}`);
    } catch (dmErr) {
      addBotLog(
        `⚠️ Could not send warning DM to ${targetUser.tag} (DMs disabled): ${dmErr.message}`
      );
    }

    return {
      count: currentCount,
      totalWarnings: userData.totalWarnings,
      timedOut: false,
      timeoutDurationMs: TIMEOUT_MS,
      timeoutApplied: false,
    };
  }
}
__name(addUserWarning, "addUserWarning");
const botStats = {
  status: "Offline",
  username: "None",
  tag: "None",
  avatarUrl: "",
  guildsCount: 0,
  usersCount: 0,
  ping: 0,
  commandsExecuted: 0,
  inviteLink: "",
  clientId: "",
};
let client = null;
async function initializeDiscordBot() {
  const token = process.env.DISCORD_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!token) {
    addBotLog(
      "\u26A0\uFE0F DISCORD_TOKEN is not configured. The Discord bot will remain offline."
    );
    addBotLog(
      "\u{1F449} Please add 'DISCORD_TOKEN' in Settings > Secrets to connect the bot."
    );
    botStats.status = "Offline (Missing Token)";
    return;
  }
  addBotLog("Initializing Discord Bot...");
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });
  client.once("ready", async (readyClient) => {
    botStats.status = "Online";
    botStats.username = readyClient.user.username;
    botStats.tag = readyClient.user.tag;
    botStats.avatarUrl = readyClient.user.displayAvatarURL();
    botStats.clientId = readyClient.user.id;
    botStats.guildsCount = readyClient.guilds.cache.size;
    botStats.ping = readyClient.ws.ping;
    botStats.usersCount = readyClient.guilds.cache.reduce(
      (acc, guild) => acc + (guild.memberCount || 0),
      0
    );
    botStats.inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${readyClient.user.id}&permissions=1099511753750&scope=bot%20applications.commands`;
    addBotLog(`\u{1F680} Discord Bot logged in as ${readyClient.user.tag}!`);
    addBotLog(
      `\u{1F310} Connected to ${botStats.guildsCount} server(s) with ${botStats.usersCount} total users.`
    );
    addBotLog(`\u{1F517} Invite Link: ${botStats.inviteLink}`);
    readyClient.user.setActivity({
      name: `with Gemini AI | !help`,
      type: ActivityType.Playing,
    });
    await registerSlashCommands(readyClient.user.id, token);
  });
  client.on("guildMemberAdd", async (member) => {
    try {
      const guild = member.guild;
      const guildConfig = getGuildConfig(guild.id);
      const globalConfig = getBotConfig();
      const welcomeChannelId =
        guildConfig.welcomeChannelId || globalConfig.welcomeChannelId;
      if (!welcomeChannelId) return;
      const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
      if (!welcomeChannel || !welcomeChannel.isTextBased()) {
        addBotLog(
          `⚠️ Welcome channel (${welcomeChannelId}) not found or is not a text-based channel in guild ${guild.name}.`
        );
        return;
      }
      const avatarUrl = member.user.displayAvatarURL({
        forceStatic: false,
        size: 512,
      });
      const memberCount = guild.memberCount;
      const rulesCh = guild.channels.cache.find((c) =>
        c.name.toLowerCase().includes("rule")
      );
      const rulesRef = rulesCh ? `<#${rulesCh.id}>` : "#rules";
      const introCh = guild.channels.cache.find(
        (c) =>
          c.name.toLowerCase().includes("intro") ||
          c.name.toLowerCase().includes("chat") ||
          c.name.toLowerCase().includes("general")
      );
      const introRef = introCh ? `<#${introCh.id}>` : "#introductions";
      const channelEmbed = new EmbedBuilder()
        .setTitle("🎮 Welcome to ArenaX Esports!")
        .setDescription(
          `🎮 Welcome to ArenaX Esports, **${member.user.username}**! Glad to have you here. Check out ${rulesRef} and ${introRef} to get started!`
        )
        .setColor("#f0c040")
        .setThumbnail(avatarUrl)
        .addFields(
          {
            name: "👤 New Member",
            value: `${member} (@${member.user.username})`,
            inline: true,
          },
          {
            name: "👥 Total Members",
            value: `Member #${memberCount}`,
            inline: true,
          },
          {
            name: "🏆 Tournaments & Rewards",
            value:
              "Compete in free esports tournaments, earn AX coins, and level up with ArenaX!",
            inline: false,
          }
        )
        .setFooter({
          text: `ArenaX Esports | ${guild.name}`,
          iconURL: guild.iconURL() || void 0,
        })
        .setTimestamp();
      await welcomeChannel.send({
        content: `🎮 Welcome to ArenaX Esports, ${member}!`,
        embeds: [channelEmbed],
      });
      addBotLog(
        `Welcome message posted for ${member.user.tag} in channel #${welcomeChannel.name}`
      );
      const dmEmbed = new EmbedBuilder()
        .setTitle(`🎮 Welcome to ArenaX Esports, ${member.user.username}!`)
        .setDescription(
          `🎮 Welcome to ArenaX Esports, **${member.user.username}**! Glad to have you here. Check out ${rulesRef} and ${introRef} to get started!\n\n• Review ${rulesRef} for server rules\n• Introduce yourself in ${introRef}\n• Join tournaments and earn AX Coins\n\nType \`!help\` in the server to view all commands.`
        )
        .setColor("#f0c040")
        .setThumbnail(avatarUrl)
        .setFooter({
          text: `ArenaX Esports | ${guild.name}`,
          iconURL: guild.iconURL() || void 0,
        })
        .setTimestamp();
      try {
        await member.send({ embeds: [dmEmbed] });
        addBotLog(`Sent welcome direct message to ${member.user.tag}`);
      } catch (dmErr) {
        addBotLog(
          `⚠️ Could not send welcome DM to ${member.user.tag} (DMs disabled): ${dmErr.message}`
        );
      }
    } catch (error) {
      addBotLog("⚠️ Error handling guildMemberAdd: " + error.message);
    }
  });
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.guild) {
      const gCfg = getGuildConfig(message.guild.id);
      const monitored = gCfg.warningLinkChannels || [];
      if (monitored.includes(message.channel.id)) {
        const linkRegex =
          /(https?:\/\/|www\.|\bdiscord\.gg\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/|\b))/i;
        if (linkRegex.test(message.content)) {
          try {
            await message.delete();
            addBotLog(
              `Auto-deleted link from ${message.author.tag} in monitored channel #${message.channel.name}`
            );
            const warnRes = await addUserWarning(
              message.guild,
              message.author,
              "AutoMod (Link Protection)",
              "Sending unauthorized link in monitored channel"
            );

            if (warnRes.timedOut) {
              const timeoutEmbed = new EmbedBuilder()
                .setTitle("⛔ 12-Hour Timeout Applied")
                .setDescription(
                  `🚨 ${message.author} has accumulated **3 warnings** and has been given a **12-hour timeout**!`
                )
                .addFields(
                  {
                    name: "👤 Member",
                    value: `${message.author} (@${message.author.username})`,
                    inline: true,
                  },
                  {
                    name: "⏱️ Duration",
                    value: "`12 Hours (12 ghante)`",
                    inline: true,
                  },
                  {
                    name: "👮 Action By",
                    value: "`AutoMod (Link Protection)`",
                    inline: true,
                  },
                  {
                    name: "📋 Final Infraction",
                    value: "Sending unauthorized link in monitored channel",
                    inline: false,
                  }
                )
                .setColor(15158332)
                .setFooter({ text: "ArenaX Auto-Moderation System" })
                .setTimestamp();

              await message.channel.send({
                content: `⛔ ${message.author} has reached 3 warnings and received a 12-hour timeout.`,
                embeds: [timeoutEmbed],
              });
            } else {
              const warnEmbed = new EmbedBuilder()
                .setTitle("⚠️ Anti-Link Warning")
                .setDescription(
                  `⚠️ ${message.author} has been warned due to sending a link in this channel.`
                )
                .addFields(
                  {
                    name: "Active Warnings",
                    value: `**${warnRes.count} / 3**`,
                    inline: true,
                  },
                  {
                    name: "Penalty Notice",
                    value: "`3 warnings = 12 Hours Timeout`",
                    inline: true,
                  }
                )
                .setColor(15105570)
                .setFooter({ text: "ArenaX Anti-Link Moderation" })
                .setTimestamp();

              await message.channel.send({
                content: `⚠️ ${message.author} has been warned due to sending link (Warning **${warnRes.count}/3**)`,
                embeds: [warnEmbed],
              });
            }
          } catch (err) {
            addBotLog(
              `⚠️ Error handling link violation in #${message.channel.name}: ${err.message}`
            );
          }
          return;
        }
      }
    }
    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      try {
        const welcomeReply = await message.reply(
          `\u{1F44B} Welcome back **${message.author.username}**! I have removed your AFK status.`
        );
        setTimeout(() => welcomeReply.delete().catch(() => {}), 5e3);
      } catch (e) {}
    }
    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach(async (user) => {
        const afk = afkUsers.get(user.id);
        if (afk) {
          try {
            await message.reply(
              `\u{1F4A4} **${user.username}** is currently AFK: *${afk.reason}*`
            );
          } catch (e) {}
        }
      });
    }
    const activeQuiz = activeQuizzes.get(message.channel.id);
    if (activeQuiz) {
      const userAnswer = message.content.trim().toLowerCase();
      if (activeQuiz.answers.includes(userAnswer)) {
        clearTimeout(activeQuiz.timeout);
        activeQuizzes.delete(message.channel.id);
        const winEmbed = new EmbedBuilder()
          .setTitle("\u{1F3C6} QUIZ WINNER!")
          .setDescription(
            `\u{1F389} Congratulations ${message.author}! You guessed the correct answer: **${activeQuiz.correctAnswerText}**!

\u26BD Stay tuned for the next trivia match!`
          )
          .setColor(3066993)
          .setTimestamp();
        try {
          await message.reply({ embeds: [winEmbed] });
        } catch (e) {}
        return;
      }
    }
    const config = getBotConfig();
    const prefix = config.prefix;
    const isMentioned = message.mentions.has(client.user) && !message.reference;
    const isCommand = message.content.startsWith(prefix);
    if (!isCommand && !isMentioned) return;
    if (message.guild) {
      const gCfg = getGuildConfig(message.guild.id);
      const notBotList = gCfg.notBotChannels || [];
      if (notBotList.includes(message.channel.id)) {
        const isModerator = Boolean(
          message.member &&
            (message.member.permissions.has("Administrator") ||
              message.member.permissions.has("ManageGuild") ||
              message.member.permissions.has("ManageChannels") ||
              message.member.permissions.has("ManageMessages"))
        );
        if (!isModerator) {
          return;
        }
      }
    }
    botStats.commandsExecuted++;
    try {
      if (isMentioned && !isCommand) {
        const cleanMessage = message.content.replace(/<@!?\d+>/g, "").trim();
        if (!cleanMessage) {
          await message.reply(
            "Ji? Aapne mujhe mention kiya. Kuch poochiye, main aapki help karne ke liye taiyar hoon! \u{1F60A} (e.g. `!help` check karein)"
          );
          return;
        }
        addBotLog(
          `DM/Mention chat from ${message.author.tag} in #${
            message.channel.name || "DM"
          }: "${cleanMessage}"`
        );
        await handleGeminiChat(message, cleanMessage);
        return;
      }
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;
      if (commandName === "help") {
        const helpEmbed = new EmbedBuilder()
          .setTitle("🎮 ArenaX Esports Bot — Command Directory")
          .setDescription(
            "Welcome to **ArenaX Esports**! Here is the complete list of available bot commands:"
          )
          .setColor("#f0c040")
          .addFields(
            {
              name: "🛡️ Server Moderation (Admin / Mod)",
              value: `\`${prefix}welcome set #channel\` — Configure welcome announcements & DMs\n\`${prefix}setwarninglink #channel\` — Set link-prohibited channel (Auto-delete & warn)\n\`${prefix}notbot #channel\` — Set silent zone (ignores commands from regular users)\n\`${prefix}warn @user <reason>\` — Warn user (3 warnings = 12h timeout)\n\`${prefix}warnings [@user]\` — View active warnings & timeout history\n\`${prefix}clearwarn @user\` — Clear active warnings (back to 0/3)\n\`${prefix}clear <amount>\` — Bulk delete messages (1-100)\n\`${prefix}slowmode <seconds>\` — Set channel message cooldown\n\`${prefix}announce <#channel> <msg>\` — Broadcast server announcement\n\`${prefix}alert <msg>\` — Urgent announcement with @everyone\n\`${prefix}setmaintenance <on/off>\` — Toggle bot maintenance mode`,
            },
            {
              name: "🌐 General & Info",
              value: `\`${prefix}help\` — View this commands help menu\n\`${prefix}ping\` — Bot latency and API connectivity\n\`${prefix}website\` — Official ArenaX gaming website\n\`${prefix}register\` — ArenaX registration portal\n\`${prefix}info\` — ArenaX esports ecosystem overview`,
            },
            {
              name: "🏆 Esports & Rewards",
              value: `\`${prefix}tournaments\` — View active & upcoming esports matches\n\`${prefix}leaderboard\` — Top 10 users AX coin leaderboard\n\`${prefix}prize\` — Weekly Sunday Cup prize distribution\n\`${prefix}dailyrewards\` — Daily streak login rewards table\n\`${prefix}tasks\` — Daily tasks list to earn AX points\n\`${prefix}refer\` — Referral system link and rewards`,
            },
            {
              name: "🎲 Fun & Community",
              value: `\`${prefix}quiz\` — 30-second interactive football trivia\n\`${prefix}8ball <question>\` — Magic 8 Ball predictions\n\`${prefix}coinflip\` — Flip a coin (Heads/Tails)\n\`${prefix}roll\` — Generate random number (1-100)\n\`${prefix}rps <rock|paper|scissors>\` — Play Rock Paper Scissors\n\`${prefix}joke\` — Funny gaming and football jokes\n\`${prefix}tip\` — Pro esports gaming tips\n\`${prefix}avatar [@user]\` — View high-res avatar picture\n\`${prefix}afk <reason>\` — Set AFK status\n\`${prefix}serverinfo\` — Current Discord server stats\n\`${prefix}rules\` — ArenaX server rules and guidelines`,
            }
          )
          .setFooter({
            text: "ArenaX Esports Ecosystem • Gold Edition",
            iconURL: client?.user?.displayAvatarURL(),
          })
          .setTimestamp();
        await message.reply({ embeds: [helpEmbed] });
        addBotLog(`Executed help command for ${message.author.tag}`);
      } else if (commandName === "status") {
        botStats.ping = client.ws.ping;
        const statusEmbed = new EmbedBuilder()
          .setTitle("\u{1F4CA} Bot Operational Status")
          .setColor(3066993)
          .addFields(
            {
              name: "Ping / Latency",
              value: `\u26A1 \`${client.ws.ping}ms\``,
              inline: true,
            },
            {
              name: "Servers",
              value: `\u{1F3E0} \`${client.guilds.cache.size}\` Guilds`,
              inline: true,
            },
            {
              name: "Total Users",
              value: `\u{1F465} \`${botStats.usersCount}\` Members`,
              inline: true,
            },
            {
              name: "AI Engine",
              value: "\u{1F9E0} `Gemini 3.5 Flash` (Active)",
              inline: false,
            }
          )
          .setTimestamp();
        await message.reply({ embeds: [statusEmbed] });
        addBotLog(`Executed status command for ${message.author.tag}`);
      } else if (commandName === "ping") {
        const pingEmbed = new EmbedBuilder()
          .setTitle("\u{1F3D3} Pong!")
          .setColor(3066993)
          .setDescription(
            `\u26A1 **Latency:** \`${client.ws.ping}ms\`
\u{1F9E0} **Gemini API:** \`Online\``
          )
          .setTimestamp();
        await message.reply({ embeds: [pingEmbed] });
        addBotLog(`Executed ping command by ${message.author.tag}`);
      } else if (commandName === "register") {
        const regEmbed = new EmbedBuilder()
          .setTitle("\u{1F3AE} Register for ArenaX!")
          .setDescription(
            "Join the ultimate gaming revolution! Register on ArenaX, complete tasks, play games, and compete in free tournaments to win AX Coins!"
          )
          .addFields({
            name: "\u{1F517} Registration Link",
            value:
              "[Click Here to Register Now!](https://kpllahore123-maker.github.io/arenaX/)",
          })
          .setColor(15220810)
          .setFooter({ text: "ArenaX Ecosystem" })
          .setTimestamp();
        await message.reply({ embeds: [regEmbed] });
        addBotLog(`Executed register command by ${message.author.tag}`);
      } else if (commandName === "website") {
        const webEmbed = new EmbedBuilder()
          .setTitle("\u{1F310} ArenaX Official Website")
          .setDescription(
            "Check out active tournaments, view leaderboards, connect with teammates, and browse the reward store!"
          )
          .addFields({
            name: "\u{1F517} Website Link",
            value:
              "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)",
          })
          .setColor(3447003)
          .setFooter({ text: "ArenaX Esports Platform" })
          .setTimestamp();
        await message.reply({ embeds: [webEmbed] });
        addBotLog(`Executed website command by ${message.author.tag}`);
      } else if (commandName === "info") {
        const infoEmbed = new EmbedBuilder()
          .setTitle("\u2139\uFE0F About ArenaX")
          .setDescription(
            "**ArenaX** is a cutting-edge web3 gaming and esports ecosystem. We bring competitive gaming to your fingertips with exciting features:\n\n\u{1F3C6} **E-Sports Tournaments:** Participate in custom, high-stakes matches and premium tournaments for free.\n\u{1F381} **Daily Mission Hub:** Complete social media and in-app daily tasks to gather AX Coin reward points.\n\u{1F4C5} **Daily Rewards:** Login daily to maintain your active login streak and collect AX bonuses.\n\u{1F465} **Referral System:** Refer gaming friends and claim 20 AX per person!\n\n*Empowering gamers worldwide to level up, build custom communities, and win big!*"
          )
          .setColor(10181046)
          .setFooter({ text: "ArenaX Information" })
          .setTimestamp();
        await message.reply({ embeds: [infoEmbed] });
        addBotLog(`Executed info command by ${message.author.tag}`);
      } else if (commandName === "tournaments") {
        try {
          const q = query(collection(db, "tournaments"));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            await message.reply(
              "\u26A0\uFE0F No tournaments found in ArenaX database at the moment."
            );
            return;
          }
          const tourEmbed = new EmbedBuilder()
            .setTitle("\u{1F3C6} ArenaX Tournaments List")
            .setDescription(
              "Showing all registered tournament matches fetched in real-time from Firestore:"
            )
            .setColor(15220810)
            .setTimestamp();
          let count = 0;
          snapshot.forEach((doc) => {
            if (count >= 10) return;
            const data = doc.data();
            const statusEmoji =
              data.status === "live"
                ? "\u{1F534} LIVE"
                : data.status === "ended"
                ? "\u{1F3C1} Ended"
                : "\u{1F4C5} Upcoming";
            tourEmbed.addFields({
              name: `\u{1F539} ${data.name || "Unnamed Tournament"}`,
              value: `\u{1F3AE} **Game:** ${data.game || "Grand RP"}
\u{1F4B0} **Prize:** \`${data.prize || "TBD"}\` | \u{1F3AB} **Fee:** \`${
                data.entryFee || "Free"
              }\`
\u{1F465} **Slots:** \`${data.registered || 0}/${data.maxPlayers || 32}\`
\u26A1 **Status:** \`${statusEmoji}\` | \u{1F4C5} **Date:** \`${
                data.date || "TBA"
              } - ${data.time || "TBA"}\``,
              inline: false,
            });
            count++;
          });
          await message.reply({ embeds: [tourEmbed] });
          addBotLog(
            `Executed tournaments command by ${message.author.tag} (Found ${snapshot.size} tournaments)`
          );
        } catch (err) {
          addBotLog("Error fetching tournaments: " + err.message);
          await message.reply(
            "\u274C Failed to fetch tournaments from database."
          );
        }
      } else if (commandName === "leaderboard") {
        try {
          const qLeaders = query(
            collection(db, "users"),
            orderBy("balance", "desc"),
            limit(10)
          );
          const snapshot = await getDocs(qLeaders);
          if (snapshot.empty) {
            await message.reply(
              "\u26A0\uFE0F No registered users found in the leaderboard."
            );
            return;
          }
          const leadEmbed = new EmbedBuilder()
            .setTitle("\u{1F451} ArenaX Global Leaderboard")
            .setDescription(
              "Top 10 gamers based on active **AX Coin Balance** (Fetched from Firestore):"
            )
            .setColor(15844367)
            .setTimestamp();
          let descriptionText = "";
          let rank = 1;
          snapshot.forEach((doc) => {
            const data = doc.data();
            const medal =
              rank === 1
                ? "\u{1F947}"
                : rank === 2
                ? "\u{1F948}"
                : rank === 3
                ? "\u{1F949}"
                : `\`#${rank}\``;
            const handleText = data.handle ? ` (@${data.handle})` : "";
            descriptionText += `${medal} **${
              data.name || "Unknown Player"
            }**${handleText}
\u{1F449} Balance: \`${(data.balance || 0).toLocaleString()} AX\`

`;
            rank++;
          });
          leadEmbed.setDescription(
            descriptionText || "No active participants yet."
          );
          await message.reply({ embeds: [leadEmbed] });
          addBotLog(`Executed leaderboard command by ${message.author.tag}`);
        } catch (err) {
          addBotLog("Error fetching leaderboard: " + err.message);
          await message.reply(
            "\u274C Failed to load the leaderboard from database."
          );
        }
      } else if (commandName === "roll") {
        const rolled = Math.floor(Math.random() * 100) + 1;
        await message.reply(
          `\u{1F3B2} **${message.author.username}** rolled a **${rolled}**! (1-100)`
        );
        addBotLog(`Executed roll command by ${message.author.tag}: ${rolled}`);
      } else if (commandName === "coinflip") {
        const side = Math.random() < 0.5 ? "Heads" : "Tails";
        await message.reply(
          `\u{1FA99} **${message.author.username}** flipped a coin and got: **${side}**!`
        );
        addBotLog(
          `Executed coinflip command by ${message.author.tag}: ${side}`
        );
      } else if (commandName === "8ball") {
        const question = args.join(" ");
        if (!question) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}8ball <your question>\``
          );
          return;
        }
        const answers = [
          "Yes, definitely! \u{1F7E2}",
          "It is decidedly so! \u2714\uFE0F",
          "Most likely! \u{1F44D}",
          "Signs point to yes! \u{1F44C}",
          "Reply hazy, try again... \u{1F504}",
          "Ask again later... \u23F3",
          "Better not tell you now... \u{1F92B}",
          "My sources say no. \u274C",
          "Very doubtful. \u26A0\uFE0F",
          "No way! \u{1F6AB}",
        ];
        const choice = answers[Math.floor(Math.random() * answers.length)];
        await message.reply(`\u{1F52E} **Question:** *${question}*
\u{1F3B1} **Magic 8-Ball:** ${choice}`);
        addBotLog(`Executed 8ball command by ${message.author.tag}`);
      } else if (commandName === "rps") {
        const rpsChoices = ["rock", "paper", "scissors"];
        const userChoice = args[0]?.toLowerCase();
        if (!userChoice || !rpsChoices.includes(userChoice)) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}rps <rock|paper|scissors>\``
          );
          return;
        }
        const botChoice =
          rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
        let userEmoji =
          userChoice === "rock"
            ? "\u270A Rock"
            : userChoice === "paper"
            ? "\u270B Paper"
            : "\u270C\uFE0F Scissors";
        let botEmoji =
          botChoice === "rock"
            ? "\u270A Rock"
            : botChoice === "paper"
            ? "\u270B Paper"
            : "\u270C\uFE0F Scissors";
        let rpsResult = "";
        if (userChoice === botChoice) {
          rpsResult = "It's a draw! \u{1F91D}";
        } else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) {
          rpsResult = "You win! \u{1F389}";
        } else {
          rpsResult = "Bot wins! \u{1F916}";
        }
        const rpsEmbed = new EmbedBuilder()
          .setTitle("\u{1F3AE} Rock Paper Scissors Game")
          .setColor(3447003)
          .addFields(
            { name: "\u{1F464} Your Move", value: userEmoji, inline: true },
            { name: "\u{1F916} Bot's Move", value: botEmoji, inline: true },
            {
              name: "\u{1F3C1} Result",
              value: `**${rpsResult}**`,
              inline: false,
            }
          )
          .setTimestamp();
        await message.reply({ embeds: [rpsEmbed] });
        addBotLog(`Executed rps command by ${message.author.tag}`);
      } else if (commandName === "joke") {
        const gamingJokes = [
          "Why do gamers hate nature? Too many bugs! \u{1F41B}\u{1F3AE}",
          "Why are players so bad at football? Because they're always controller-locked! \u{1F3AE}\u26BD",
          "Why did the football player go to the bank? To get his quarter back! \u{1F3E6}\u26BD",
          "What is a gamer's favorite school subject? Console-ing class! \u{1F4BB}",
          "How do football players stay cool? They stand next to the fans! \u{1F9CA}\u26BD",
          "Why was the computer cold? It left its Windows open! \u{1FA9F}\u{1F916}",
          "What is a soccer player's favorite tea? Penal-tea! \u2615\u26BD",
          "Why did the gamer cross the road? To render the other side! \u{1F6E3}\uFE0F",
        ];
        const joke =
          gamingJokes[Math.floor(Math.random() * gamingJokes.length)];
        await message.reply(`\u{1F602} **Joke:** ${joke}`);
        addBotLog(`Executed joke command by ${message.author.tag}`);
      } else if (commandName === "tip") {
        const gamingTips = [
          "\u{1F525} Practice daily to muscle-memorize your aim and button configurations!",
          "\u{1F3A7} A good gaming headset can help you hear enemy footsteps and location cues perfectly.",
          "\u{1F4A7} Stay hydrated! Drinking water improves focus, reaction time, and physical stamina.",
          "\u{1F5FA}\uFE0F Map awareness is key! Always check your minimap to stay ahead of enemy rotations.",
          "\u{1F5E3}\uFE0F Communicate politely with your team. Good coordination wins more matches than solo play!",
          "\u{1F9D8} Take short 5-minute breaks between matches to avoid fatigue and stay tilt-free.",
          "\u26BD In football trivia, team performance stats and key player positions are crucial to analyze.",
          "\u{1F3C6} Review your match replays! Analyzing your own deaths/mistakes is the fastest way to get better.",
        ];
        const tip = gamingTips[Math.floor(Math.random() * gamingTips.length)];
        await message.reply(`\u{1F4A1} **Pro Tip:** ${tip}`);
        addBotLog(`Executed tip command by ${message.author.tag}`);
      } else if (commandName === "quiz") {
        if (activeQuizzes.has(message.channel.id)) {
          await message.reply(
            "\u26A0\uFE0F An active quiz is already running in this channel! Guess the answer first."
          );
          return;
        }
        const triviaIndex = Math.floor(Math.random() * triviaPool.length);
        const trivia = triviaPool[triviaIndex];
        const quizEmbed = new EmbedBuilder()
          .setTitle("\u26BD ArenaX Football Trivia Quiz!")
          .setDescription(
            `**Question:**
${trivia.q}

\u23F1\uFE0F You have **30 seconds** to type the correct answer in the chat!`
          )
          .setColor(15844367)
          .setFooter({
            text: "Type the answer below \u2014 first correct response wins!",
          })
          .setTimestamp();
        const channelId = message.channel.id;
        const qTimeout = setTimeout(async () => {
          if (activeQuizzes.has(channelId)) {
            activeQuizzes.delete(channelId);
            const timeUpEmbed = new EmbedBuilder()
              .setTitle("\u23F0 Time's Up!")
              .setDescription(
                `Nobody guessed the correct answer in time.

\u{1F449} The correct answer was: **${trivia.correctText}**`
              )
              .setColor(15158332)
              .setTimestamp();
            await message.channel.send({ embeds: [timeUpEmbed] });
          }
        }, 3e4);
        activeQuizzes.set(channelId, {
          question: trivia.q,
          answers: trivia.a,
          correctAnswerText: trivia.correctText,
          timeout: qTimeout,
        });
        await message.reply({ embeds: [quizEmbed] });
        addBotLog(
          `Started interactive football quiz in channel ${channelId} by request of ${message.author.tag}`
        );
      } else if (commandName === "avatar") {
        const targetUser = message.mentions.users.first() || message.author;
        const avEmbed = new EmbedBuilder()
          .setTitle(`${targetUser.username}'s Avatar`)
          .setImage(targetUser.displayAvatarURL({ size: 1024 }))
          .setColor(3447003)
          .setTimestamp();
        await message.reply({ embeds: [avEmbed] });
        addBotLog(
          `Executed avatar command by ${message.author.tag} for ${targetUser.tag}`
        );
      } else if (commandName === "afk") {
        const reason = args.join(" ") || "No reason specified";
        afkUsers.set(message.author.id, { reason, timestamp: Date.now() });
        await message.reply(
          `\u{1F4A4} **${message.author.username}** has gone AFK: *${reason}*`
        );
        addBotLog(`User ${message.author.tag} went AFK for: "${reason}"`);
      } else if (commandName === "serverinfo") {
        const guild = message.guild;
        if (!guild) {
          await message.reply(
            "\u274C This command can only be used in a Discord server."
          );
          return;
        }
        const serverEmbed = new EmbedBuilder()
          .setTitle(`\u{1F5A5}\uFE0F Server Information: ${guild.name}`)
          .setThumbnail(guild.iconURL() || "")
          .setColor(3447003)
          .addFields(
            {
              name: "\u{1F451} Owner",
              value: `<@${guild.ownerId}>`,
              inline: true,
            },
            {
              name: "\u{1F465} Members Count",
              value: `\`${guild.memberCount}\``,
              inline: true,
            },
            {
              name: "\u{1F4C5} Created At",
              value: `<t:${Math.floor(guild.createdTimestamp / 1e3)}:R>`,
              inline: true,
            },
            {
              name: "\u26A1 Premium Boosts",
              value: `\`${guild.premiumSubscriptionCount || 0}\` (Tier ${
                guild.premiumTier
              })`,
              inline: true,
            },
            {
              name: "Channels Size",
              value: `\`${guild.channels.cache.size}\` channels`,
              inline: true,
            },
            {
              name: "Emojis Size",
              value: `\`${guild.emojis.cache.size}\` emojis`,
              inline: true,
            }
          )
          .setFooter({ text: `Server Guild ID: ${guild.id}` })
          .setTimestamp();
        await message.reply({ embeds: [serverEmbed] });
        addBotLog(`Executed serverinfo command by ${message.author.tag}`);
      } else if (commandName === "rules") {
        const rulesEmbed = new EmbedBuilder()
          .setTitle("\u{1F4DC} ArenaX Discord Server Rules")
          .setDescription(
            "Welcome to the official **ArenaX Discord Server**! Please read and follow our guidelines to maintain a great atmosphere:"
          )
          .setColor(15220810)
          .addFields(
            {
              name: "1. Respect All Members",
              value:
                "Strictly no toxicity, hate speech, bullying, racism, or spamming.",
            },
            {
              name: "2. Keep Topics Relevant",
              value:
                "Use designated channels appropriately (e.g. general discussion in #general, support in ticket).",
            },
            {
              name: "3. Play Fair",
              value:
                "Any form of hacking, exploiting match flaws, or sharing cheating tools will result in a ban.",
            },
            {
              name: "4. No Direct Advertisement",
              value:
                "Do not promote other servers, unauthorized referral schemes, or outside platforms without approval.",
            },
            {
              name: "5. Follow Moderator Directions",
              value: "Moderator instructions must be respected at all times.",
            }
          )
          .setFooter({ text: "Enjoy competing! Team ArenaX" })
          .setTimestamp();
        await message.reply({ embeds: [rulesEmbed] });
        addBotLog(`Executed rules command by ${message.author.tag}`);
      } else if (commandName === "maintenance") {
        const conf = getBotConfig();
        const activeMaint = !!conf.maintenanceMode;
        const maintEmbed = new EmbedBuilder()
          .setTitle("\u{1F527} ArenaX Maintenance Status")
          .setDescription(
            activeMaint
              ? "\u26A0\uFE0F **ArenaX Services are currently in Maintenance Mode!** Our developers are working hard behind the scenes to upgrade features. Some functionalities may be temporarily offline."
              : "\u{1F7E2} **All systems are operational!** ArenaX servers, matchmaking, rewards shop, and the web client are running perfectly."
          )
          .setColor(activeMaint ? 15158332 : 3066993)
          .setTimestamp();
        await message.reply({ embeds: [maintEmbed] });
        addBotLog(`Executed maintenance command by ${message.author.tag}`);
      } else if (commandName === "setmaintenance") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("Administrator") &&
            !member.permissions.has("ManageGuild"))
        ) {
          await message.reply(
            "\u274C Only server administrators can toggle maintenance status."
          );
          return;
        }
        const option = args[0]?.toLowerCase();
        if (option !== "on" && option !== "off") {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}setmaintenance <on|off>\``
          );
          return;
        }
        const state = option === "on";
        saveBotConfig({ maintenanceMode: state });
        await message.reply(
          `\u2705 Maintenance mode has been successfully turned **${
            state ? "ON" : "OFF"
          }**.`
        );
        addBotLog(
          `Maintenance mode updated to ${state ? "ON" : "OFF"} by ${
            message.author.tag
          }`
        );
      } else if (commandName === "welcome" || commandName === "setwelcome") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("ManageChannels") &&
            !member.permissions.has("Administrator") &&
            !member.permissions.has("ManageGuild"))
        ) {
          await message.reply(
            "❌ Only server administrators or moderators can configure the welcome channel."
          );
          return;
        }
        const subCommand = args[0]?.toLowerCase();
        if (subCommand === "set" || (args[0] && args[0].startsWith("<#"))) {
          const rawTarget = subCommand === "set" ? args[1] : args[0];
          const channelId = rawTarget?.replace(/[<#>]/g, "") || "";
          const targetChannel =
            message.mentions.channels.first() ||
            (channelId ? message.guild?.channels.cache.get(channelId) : null);
          if (!targetChannel || !targetChannel.isTextBased()) {
            await message.reply(
              `⚠️ Please provide a valid text channel mention or ID.\n**Usage:** \`${prefix}welcome set #channel-name\` or \`${prefix}welcome set <channelID>\``
            );
            return;
          }
          saveGuildConfig(message.guild.id, {
            welcomeChannelId: targetChannel.id,
          });
          const confEmbed = new EmbedBuilder()
            .setTitle("🎮 Welcome Channel Configured")
            .setDescription(
              `Successfully saved ${targetChannel} as the **welcome channel** for **${message.guild.name}**!\n\n**Automated Actions on Member Join:**\n• Posts a welcome embed with member avatar & username in ${targetChannel}\n• Sends a personalized welcome Direct Message to the new member.`
            )
            .setColor("#f0c040")
            .setFooter({ text: "ArenaX Esports Bot" })
            .setTimestamp();
          await message.reply({ embeds: [confEmbed] });
          addBotLog(
            `Welcome channel configured to #${targetChannel.name} (${targetChannel.id}) for guild ${message.guild.id} by ${message.author.tag}`
          );
          return;
        }
        if (
          subCommand === "disable" ||
          subCommand === "off" ||
          subCommand === "clear"
        ) {
          saveGuildConfig(message.guild.id, { welcomeChannelId: "" });
          await message.reply(
            "✅ Welcome channel has been disabled. New member joins will no longer trigger welcome announcements."
          );
          addBotLog(
            `Welcome channel disabled for guild ${message.guild.id} by ${message.author.tag}`
          );
          return;
        }
        const currentGuildCfg = getGuildConfig(message.guild.id);
        const currentCh = currentGuildCfg.welcomeChannelId
          ? `<#${currentGuildCfg.welcomeChannelId}>`
          : "None (Disabled)";
        await message.reply(
          `ℹ️ **Current Welcome Channel:** ${currentCh}\n• To configure: \`${prefix}welcome set #channel-name\`\n• To disable: \`${prefix}welcome disable\``
        );
      } else if (commandName === "setwarninglink") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("ManageChannels") &&
            !member.permissions.has("Administrator") &&
            !member.permissions.has("ManageGuild") &&
            !member.permissions.has("ManageMessages"))
        ) {
          await message.reply(
            "❌ Only server administrators or moderators can configure link-monitored channels."
          );
          return;
        }
        let targetChannel = null;
        const rawTarget =
          args[0]?.toLowerCase() === "remove" ||
          args[0]?.toLowerCase() === "del"
            ? args[1]
            : args[0];
        if (rawTarget) {
          const channelId = rawTarget.replace(/[<#>]/g, "");
          targetChannel =
            message.mentions.channels.first() ||
            message.guild?.channels.cache.get(channelId);
        } else {
          targetChannel = message.channel;
        }
        if (!targetChannel || !targetChannel.isTextBased()) {
          await message.reply(
            `⚠️ Please provide a valid text channel mention or ID.\n**Usage:** \`${prefix}setwarninglink #channel-name\` or \`${prefix}setwarninglink <channelID>\``
          );
          return;
        }
        const gCfg = getGuildConfig(message.guild.id);
        const monitored = gCfg.warningLinkChannels || [];
        let updatedChannels = [];
        let responseTitle = "";
        let responseDesc = "";
        if (
          args[0]?.toLowerCase() === "remove" ||
          args[0]?.toLowerCase() === "del" ||
          args[0]?.toLowerCase() === "off"
        ) {
          updatedChannels = monitored.filter((id) => id !== targetChannel.id);
          saveGuildConfig(message.guild.id, {
            warningLinkChannels: updatedChannels,
          });
          responseTitle = "🛡️ Link Monitoring Removed";
          responseDesc = `${targetChannel} has been removed from link monitoring. Links are now permitted in that channel.`;
        } else {
          if (!monitored.includes(targetChannel.id)) {
            updatedChannels = [...monitored, targetChannel.id];
            saveGuildConfig(message.guild.id, {
              warningLinkChannels: updatedChannels,
            });
          } else {
            updatedChannels = monitored;
          }
          responseTitle = "🛡️ Link Protection Monitored Channel Configured";
          responseDesc = `${targetChannel} is now saved as a **no links allowed** monitored channel!\n\n**Automated Protection:**\n1. Automatically **deletes** any message containing links (\`http://\`, \`https://\`, \`www.\`, or \`discord.gg\`).\n2. Posts warning in channel: \`[username] has been warned due to sending link\`\n3. DMs the user: \`You have received a warning in this server for sending links.\``;
        }
        const linkEmbed = new EmbedBuilder()
          .setTitle(responseTitle)
          .setDescription(responseDesc)
          .setColor("#f0c040")
          .addFields({
            name: "📋 Monitored Channels in Server",
            value:
              updatedChannels.length > 0
                ? updatedChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
            inline: false,
          })
          .setFooter({ text: "ArenaX Anti-Link Moderation" })
          .setTimestamp();
        await message.reply({ embeds: [linkEmbed] });
        addBotLog(
          `Monitored link channels updated for guild ${message.guild.id} by ${message.author.tag} (Channel: #${targetChannel.name})`
        );
      } else if (commandName === "notbot") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("ManageChannels") &&
            !member.permissions.has("Administrator") &&
            !member.permissions.has("ManageGuild") &&
            !member.permissions.has("ManageMessages"))
        ) {
          await message.reply(
            "❌ Only server administrators or moderators can configure silent bot channels."
          );
          return;
        }
        let targetChannel = null;
        const rawTarget =
          args[0]?.toLowerCase() === "remove" ||
          args[0]?.toLowerCase() === "del" ||
          args[0]?.toLowerCase() === "off"
            ? args[1]
            : args[0];
        if (rawTarget) {
          const channelId = rawTarget.replace(/[<#>]/g, "");
          targetChannel =
            message.mentions.channels.first() ||
            message.guild?.channels.cache.get(channelId);
        } else {
          targetChannel = message.channel;
        }
        if (!targetChannel || !targetChannel.isTextBased()) {
          await message.reply(
            `⚠️ Please provide a valid text channel mention or ID.\n**Usage:** \`${prefix}notbot #channel-name\` or \`${prefix}notbot <channelID>\`\n• To remove: \`${prefix}notbot remove #channel-name\``
          );
          return;
        }
        const gCfg = getGuildConfig(message.guild.id);
        const notBotList = gCfg.notBotChannels || [];
        let updatedChannels = [];
        let responseTitle = "";
        let responseDesc = "";
        if (
          args[0]?.toLowerCase() === "remove" ||
          args[0]?.toLowerCase() === "del" ||
          args[0]?.toLowerCase() === "off"
        ) {
          updatedChannels = notBotList.filter((id) => id !== targetChannel.id);
          saveGuildConfig(message.guild.id, {
            notBotChannels: updatedChannels,
          });
          responseTitle = "🔊 Silent Zone Removed";
          responseDesc = `${targetChannel} has been removed from silent zones. Normal bot commands are now active for all members in this channel.`;
        } else {
          if (!notBotList.includes(targetChannel.id)) {
            updatedChannels = [...notBotList, targetChannel.id];
            saveGuildConfig(message.guild.id, {
              notBotChannels: updatedChannels,
            });
          } else {
            updatedChannels = notBotList;
          }
          responseTitle = "🤫 Bot Silent Zone Configured";
          responseDesc = `${targetChannel} is now saved as a **Silent Zone** (\`${prefix}notbot\`)!\n\n**Silent Zone Rules:**\n• Regular users typing bot commands (\`${prefix}help\`, \`${prefix}welcome\`, \`${prefix}setwarninglink\`, \`${prefix}notbot\`, etc.) will receive **no response** (completely silent, no error).\n• Server Moderators and Admins are exempt and can still run all commands normally.\n• 🛡️ Anti-link protection (if enabled for this channel via \`${prefix}setwarninglink\`) will continue to automatically delete links and warn users.`;
        }
        const notBotEmbed = new EmbedBuilder()
          .setTitle(responseTitle)
          .setDescription(responseDesc)
          .setColor("#f0c040")
          .addFields({
            name: "📋 Active Silent Channels in Server",
            value:
              updatedChannels.length > 0
                ? updatedChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
            inline: false,
          })
          .setFooter({ text: "ArenaX Silent Zone Moderation" })
          .setTimestamp();
        await message.reply({ embeds: [notBotEmbed] });
        addBotLog(
          `Silent zone channels updated for guild ${message.guild.id} by ${message.author.tag} (Channel: #${targetChannel.name})`
        );
      } else if (commandName === "announce") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("ManageChannels") &&
            !member.permissions.has("Administrator"))
        ) {
          await message.reply(
            "\u274C You do not have permissions (`Manage Channels`) to make announcements."
          );
          return;
        }
        const targetChannel = message.mentions.channels.first();
        const announceMsg = args.slice(1).join(" ");
        if (!targetChannel || !announceMsg) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}announce <#channel> <message>\``
          );
          return;
        }
        const annEmbed = new EmbedBuilder()
          .setTitle("\u{1F4E2} ArenaX Server Announcement")
          .setDescription(announceMsg)
          .setColor(3447003)
          .setFooter({
            text: `Announced by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();
        await targetChannel.send({ embeds: [annEmbed] });
        await message.reply(
          `\u2705 Successfully broadcasted announcement to ${targetChannel}!`
        );
        addBotLog(
          `Executed announce command in channel ${targetChannel.name} by ${message.author.tag}`
        );
      } else if (commandName === "alert") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("MentionEveryone") &&
            !member.permissions.has("Administrator"))
        ) {
          await message.reply(
            "\u274C You need `Mention Everyone` permissions to broadcast alerts."
          );
          return;
        }
        const alertMsg = args.join(" ");
        if (!alertMsg) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}alert <message>\``
          );
          return;
        }
        const alertEmbed = new EmbedBuilder()
          .setTitle("\u{1F6A8} URGENT SERVER BROADCAST")
          .setDescription(alertMsg)
          .setColor(15158332)
          .setFooter({ text: `Broadcasted by ${message.author.username}` })
          .setTimestamp();
        await message.channel.send({
          content: "@everyone",
          embeds: [alertEmbed],
        });
        addBotLog(`Executed alert command in channel by ${message.author.tag}`);
      } else if (commandName === "warn") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("KickMembers") &&
            !member.permissions.has("Administrator"))
        ) {
          await message.reply(
            "\u274C You do not have moderator permission (`Kick Members`) to warn users."
          );
          return;
        }
        const targetUser = message.mentions.users.first();
        const reason = args.slice(1).join(" ");
        if (!targetUser || !reason) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}warn @user <reason>\``
          );
          return;
        }
        if (targetUser.bot) {
          await message.reply("❌ Bots cannot be warned.");
          return;
        }
        addBotLog(
          `User ${targetUser.tag} warned by moderator ${message.author.tag} for: "${reason}"`
        );
        const warnRes = await addUserWarning(
          message.guild,
          targetUser,
          message.author.tag,
          reason
        );

        if (warnRes.timedOut) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⛔ 12-Hour Timeout Applied")
            .setDescription(
              `🚨 ${targetUser} has accumulated **3 warnings** and has been given a **12-hour timeout**!`
            )
            .addFields(
              {
                name: "👤 Member",
                value: `${targetUser} (@${targetUser.username})`,
                inline: true,
              },
              {
                name: "⏱️ Duration",
                value: "`12 Hours (12 ghante)`",
                inline: true,
              },
              {
                name: "👮 Moderator",
                value: `${message.author}`,
                inline: true,
              },
              {
                name: "📋 Final Infraction",
                value: reason,
                inline: false,
              }
            )
            .setColor(15158332)
            .setFooter({ text: "ArenaX Auto-Moderation System" })
            .setTimestamp();

          await message.channel.send({
            content: `⛔ ${targetUser} has reached 3 warnings and received a 12-hour timeout.`,
            embeds: [timeoutEmbed],
          });
        } else {
          const warnEmbed = new EmbedBuilder()
            .setTitle("⚠️ Warning Logged")
            .setDescription(
              `**User:** ${targetUser}\n**Moderator:** ${message.author}\n**Reason:** ${reason}`
            )
            .addFields(
              {
                name: "Active Warnings",
                value: `**${warnRes.count} / 3**`,
                inline: true,
              },
              {
                name: "Penalty at 3 Warnings",
                value: "`12 Hours Timeout`",
                inline: true,
              }
            )
            .setColor(15105570)
            .setFooter({ text: "ArenaX Moderation System" })
            .setTimestamp();

          await message.channel.send({
            content: `⚠️ ${targetUser} has been warned (**${warnRes.count}/3 warnings**).`,
            embeds: [warnEmbed],
          });
        }
      } else if (commandName === "warnings") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("KickMembers") &&
            !member.permissions.has("Administrator") &&
            !member.permissions.has("ManageMessages"))
        ) {
          await message.reply(
            "❌ You do not have moderator permission (`Manage Messages` / `Kick Members`) to check user warnings."
          );
          return;
        }
        const targetUser = message.mentions.users.first() || message.author;
        const wData = getUserWarnings(message.guild.id, targetUser.id);
        const historyText =
          wData.history.length > 0
            ? wData.history
                .slice(-5)
                .map(
                  (h, i) =>
                    `\`${i + 1}.\` **${h.reason}** — By: *${h.moderator}* (<t:${Math.floor(
                      h.timestamp / 1000
                    )}:R>)`
                )
                .join("\n")
            : "No warnings recorded.";

        const warningsEmbed = new EmbedBuilder()
          .setTitle(`📋 Warnings Profile: ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL())
          .setColor(wData.count >= 2 ? 15158332 : 15844367)
          .addFields(
            {
              name: "Active Warnings",
              value: `**${wData.count} / 3**`,
              inline: true,
            },
            {
              name: "Lifetime Warnings",
              value: `\`${wData.totalWarnings}\``,
              inline: true,
            },
            {
              name: "Total 12h Timeouts",
              value: `\`${wData.totalTimeouts}\``,
              inline: true,
            },
            {
              name: "Recent Infractions",
              value: historyText,
              inline: false,
            }
          )
          .setFooter({
            text: "3 active warnings will trigger a 12-hour timeout automatically.",
          })
          .setTimestamp();
        await message.reply({ embeds: [warningsEmbed] });
        addBotLog(
          `Checked warnings for ${targetUser.tag} by ${message.author.tag}`
        );
      } else if (
        commandName === "clearwarn" ||
        commandName === "clearwarnings"
      ) {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("KickMembers") &&
            !member.permissions.has("Administrator"))
        ) {
          await message.reply(
            "❌ You do not have moderator permission (`Kick Members`) to clear warnings."
          );
          return;
        }
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
          await message.reply(`⚠️ Usage: \`${prefix}clearwarn @user\``);
          return;
        }
        clearUserWarnings(message.guild.id, targetUser.id);
        await message.reply(
          `✅ Active warnings for ${targetUser} have been cleared back to **0/3**.`
        );
        addBotLog(
          `Cleared warnings for ${targetUser.tag} by moderator ${message.author.tag}`
        );
      } else if (commandName === "slowmode") {
        const member = message.member;
        if (
          !member ||
          (!member.permissions.has("ManageChannels") &&
            !member.permissions.has("Administrator"))
        ) {
          await message.reply(
            "\u274C You do not have permissions (`Manage Channels`) to set slowmode."
          );
          return;
        }
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}slowmode <seconds>\``
          );
          return;
        }
        await message.channel.setRateLimitPerUser(seconds);
        await message.reply(
          seconds === 0
            ? "\u{1F7E2} Slowmode has been disabled for this channel."
            : `\u23F1\uFE0F Slowmode set to **${seconds} seconds** per message.`
        );
        addBotLog(
          `Executed slowmode command (set to ${seconds}s) by ${message.author.tag}`
        );
      } else if (commandName === "ask") {
        const queryText = args.join(" ");
        if (!queryText) {
          await message.reply(
            `\u26A0\uFE0F Usage: \`${prefix}ask <sawaal / question>\``
          );
          return;
        }
        addBotLog(
          `Executed ask command by ${message.author.tag}: "${queryText}"`
        );
        await handleGeminiChat(message, queryText);
      } else if (commandName === "launchfest") {
        addBotLog(`Executed launchfest command by ${message.author.tag}`);
        await message.reply({ embeds: [createLaunchFestEmbed(client.user)] });
      } else if (commandName === "dailyrewards") {
        addBotLog(`Executed dailyrewards command by ${message.author.tag}`);
        await message.reply({ embeds: [createDailyRewardsEmbed(client.user)] });
      } else if (commandName === "tasks") {
        addBotLog(`Executed tasks command by ${message.author.tag}`);
        await message.reply({ embeds: [createTasksEmbed(client.user)] });
      } else if (commandName === "refer") {
        addBotLog(`Executed refer command by ${message.author.tag}`);
        await message.reply({ embeds: [createReferEmbed(client.user)] });
      } else if (commandName === "prize") {
        addBotLog(`Executed prize command by ${message.author.tag}`);
        await message.reply({ embeds: [createPrizeEmbed(client.user)] });
      } else if (commandName === "clear") {
        const member = message.member;
        if (!member || !member.permissions.has("ManageMessages")) {
          await message.reply(
            "\u274C Aapke paas `Manage Messages` permission nahi hai is command ko use karne ke liye."
          );
          return;
        }
        const deleteCount = parseInt(args[0]);
        if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
          await message.reply(
            "\u26A0\uFE0F Please specify a valid number between 1 and 100."
          );
          return;
        }
        await message.channel.messages
          .fetch({ limit: deleteCount + 1 })
          .then((messages) => {
            message.channel.bulkDelete(messages);
          });
        const reply = await message.channel.send(
          `\u{1F9F9} Cleared **${deleteCount}** messages!`
        );
        setTimeout(() => reply.delete().catch(() => {}), 3e3);
        addBotLog(
          `Cleared ${deleteCount} messages in channel by request of ${message.author.tag}`
        );
      }
    } catch (err) {
      addBotLog(`Error running prefix command: ` + err.message);
      await message.reply("\u274C Kuch error aaya command run karte waqt.");
    }
  });
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.guildId) {
      const gCfg = getGuildConfig(interaction.guildId);
      const notBotList = gCfg.notBotChannels || [];
      if (notBotList.includes(interaction.channelId)) {
        const isModerator = Boolean(
          interaction.memberPermissions?.has("Administrator") ||
            interaction.memberPermissions?.has("ManageGuild") ||
            interaction.memberPermissions?.has("ManageChannels") ||
            interaction.memberPermissions?.has("ManageMessages")
        );
        if (!isModerator) {
          return;
        }
      }
    }
    botStats.commandsExecuted++;
    const { commandName } = interaction;
    try {
      if (commandName === "help") {
        const helpEmbed = new EmbedBuilder()
          .setTitle("\u{1F916} ArenaX Bot - Slash Help Menu")
          .setDescription(
            "Main aapka friendly AI Assistant hoon! Check out all my slash commands organized by category below:"
          )
          .setColor(5793266)
          .addFields(
            {
              name: "\u{1F310} General",
              value:
                "`/help` - Sab commands list\n`/ping` - Bot latency check\n`/register` - ArenaX registration link\n`/website` - ArenaX website link\n`/info` - ArenaX detailed information",
            },
            {
              name: "\u{1F3C6} Tournaments (Real-Time)",
              value:
                "`/tournaments` - View active & upcoming esports matches (Firebase se)\n`/leaderboard` - Top 10 users rank display (Firebase se)",
            },
            {
              name: "\u{1F389} Launch Fest",
              value:
                "`/launchfest` - Launch Fest event banner and info\n`/dailyrewards` - Daily streak rewards table\n`/tasks` - Daily tasks list to earn AX points\n`/refer` - Referral system info and link\n`/prize` - Weekly tournaments prize pool details",
            },
            {
              name: "\u{1F3B2} Fun Games",
              value:
                "`/roll` - Generate random number 1-100\n`/coinflip` - Flip a coin (Heads/Tails)\n`/8ball <question>` - Magic 8 Ball response\n`/rps <rock|paper|scissors>` - Play rock paper scissors with bot\n`/joke` - Get a funny gaming/football joke\n`/tip` - Pro competitive gaming tips\n`/quiz` - Start interactive football trivia quiz (30s)",
            },
            {
              name: "\u{1F464} Profile & Server",
              value:
                "`/avatar <@user>` - High-res avatar picture of a user or yourself\n`/afk <reason>` - Go AFK with a custom status\n`/serverinfo` - Current Discord server information\n`/rules` - Server guidelines and rules\n`/maintenance` - Show system maintenance status",
            },
            {
              name: "🔧 Admin & Moderation",
              value:
                "`/setmaintenance <on/off>` - Toggle maintenance mode\n`/setwelcome <#channel>` - Set welcome channel (`/setwelcome action: Disable` to turn off)\n`/setwarninglink <#channel>` - Set link-prohibited channel (Auto-delete & warn)\n`/notbot <#channel>` - Set silent zone channel\n`/announce <#channel> <message>` - Broadcast server announcement\n`/alert <message>` - Alert broadcast with @everyone ping\n`/warn <@user> <reason>` - Warn user (3 warnings = 12h timeout)\n`/warnings [@user]` - View active warnings & timeout history\n`/clearwarn <@user>` - Clear active warnings (back to 0/3)\n`/clear <amount>` - Delete messages in bulk\n`/slowmode <seconds>` - Manage channel slowmode rate limit",
            }
          )
          .setFooter({
            text: "Mention me (@Bot) directly to chat with Gemini 3.5 AI!",
            iconURL: client?.user?.displayAvatarURL(),
          })
          .setTimestamp();
        await interaction.reply({ embeds: [helpEmbed] });
        addBotLog(`Slash command /help executed by ${interaction.user.tag}`);
      } else if (commandName === "status") {
        botStats.ping = client.ws.ping;
        const statusEmbed = new EmbedBuilder()
          .setTitle("\u{1F4CA} Bot Status & Metrics")
          .setColor(3066993)
          .addFields(
            {
              name: "Bot Latency",
              value: `\u26A1 \`${client.ws.ping}ms\``,
              inline: true,
            },
            {
              name: "Servers Connected",
              value: `\u{1F3E0} \`${client.guilds.cache.size}\` Guilds`,
              inline: true,
            },
            {
              name: "Total Users Served",
              value: `\u{1F465} \`${botStats.usersCount}\` Members`,
              inline: true,
            },
            {
              name: "Engine Version",
              value: "\u{1F9E0} `Gemini 3.5 Flash`",
              inline: false,
            }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [statusEmbed] });
        addBotLog(`Slash command /status executed by ${interaction.user.tag}`);
      } else if (commandName === "ping") {
        const pingEmbed = new EmbedBuilder()
          .setTitle("\u{1F3D3} Pong!")
          .setColor(3066993)
          .setDescription(
            `\u26A1 **Latency:** \`${client.ws.ping}ms\`
\u{1F9E0} **Gemini API:** \`Online\``
          )
          .setTimestamp();
        await interaction.reply({ embeds: [pingEmbed] });
        addBotLog(`Slash command /ping executed by ${interaction.user.tag}`);
      } else if (commandName === "register") {
        const regEmbed = new EmbedBuilder()
          .setTitle("\u{1F3AE} Register for ArenaX!")
          .setDescription(
            "Join the ultimate gaming revolution! Register on ArenaX, complete tasks, play games, and compete in free tournaments to win AX Coins!"
          )
          .addFields({
            name: "\u{1F517} Registration Link",
            value:
              "[Click Here to Register Now!](https://kpllahore123-maker.github.io/arenaX/)",
          })
          .setColor(15220810)
          .setFooter({ text: "ArenaX Ecosystem" })
          .setTimestamp();
        await interaction.reply({ embeds: [regEmbed] });
        addBotLog(
          `Slash command /register executed by ${interaction.user.tag}`
        );
      } else if (commandName === "website") {
        const webEmbed = new EmbedBuilder()
          .setTitle("\u{1F310} ArenaX Official Website")
          .setDescription(
            "Check out active tournaments, view leaderboards, connect with teammates, and browse the reward store!"
          )
          .addFields({
            name: "\u{1F517} Website Link",
            value:
              "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)",
          })
          .setColor(3447003)
          .setFooter({ text: "ArenaX Esports Platform" })
          .setTimestamp();
        await interaction.reply({ embeds: [webEmbed] });
        addBotLog(`Slash command /website executed by ${interaction.user.tag}`);
      } else if (commandName === "info") {
        const infoEmbed = new EmbedBuilder()
          .setTitle("\u2139\uFE0F About ArenaX")
          .setDescription(
            "**ArenaX** is a cutting-edge web3 gaming and esports ecosystem. We bring competitive gaming to your fingertips with exciting features:\n\n\u{1F3C6} **E-Sports Tournaments:** Participate in custom, high-stakes matches and premium tournaments for free.\n\u{1F381} **Daily Mission Hub:** Complete social media and in-app daily tasks to gather AX Coin reward points.\n\u{1F4C5} **Daily Rewards:** Login daily to maintain your active login streak and collect AX bonuses.\n\u{1F465} **Referral System:** Refer gaming friends and claim 20 AX per person!\n\n*Empowering gamers worldwide to level up, build custom communities, and win big!*"
          )
          .setColor(10181046)
          .setFooter({ text: "ArenaX Information" })
          .setTimestamp();
        await interaction.reply({ embeds: [infoEmbed] });
        addBotLog(`Slash command /info executed by ${interaction.user.tag}`);
      } else if (commandName === "tournaments") {
        try {
          const q = query(collection(db, "tournaments"));
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            await interaction.reply({
              content:
                "\u26A0\uFE0F No tournaments found in ArenaX database at the moment.",
              ephemeral: true,
            });
            return;
          }
          const tourEmbed = new EmbedBuilder()
            .setTitle("\u{1F3C6} ArenaX Tournaments List")
            .setDescription(
              "Showing all registered tournament matches fetched in real-time from Firestore:"
            )
            .setColor(15220810)
            .setTimestamp();
          let count = 0;
          snapshot.forEach((doc) => {
            if (count >= 10) return;
            const data = doc.data();
            const statusEmoji =
              data.status === "live"
                ? "\u{1F534} LIVE"
                : data.status === "ended"
                ? "\u{1F3C1} Ended"
                : "\u{1F4C5} Upcoming";
            tourEmbed.addFields({
              name: `\u{1F539} ${data.name || "Unnamed Tournament"}`,
              value: `\u{1F3AE} **Game:** ${data.game || "Grand RP"}
\u{1F4B0} **Prize:** \`${data.prize || "TBD"}\` | \u{1F3AB} **Fee:** \`${
                data.entryFee || "Free"
              }\`
\u{1F465} **Slots:** \`${data.registered || 0}/${data.maxPlayers || 32}\`
\u26A1 **Status:** \`${statusEmoji}\` | \u{1F4C5} **Date:** \`${
                data.date || "TBA"
              } - ${data.time || "TBA"}\``,
              inline: false,
            });
            count++;
          });
          await interaction.reply({ embeds: [tourEmbed] });
          addBotLog(
            `Slash command /tournaments executed by ${interaction.user.tag}`
          );
        } catch (err) {
          addBotLog("Error fetching tournaments (slash): " + err.message);
          await interaction.reply({
            content: "\u274C Failed to fetch tournaments from database.",
            ephemeral: true,
          });
        }
      } else if (commandName === "leaderboard") {
        try {
          const qLeaders = query(
            collection(db, "users"),
            orderBy("balance", "desc"),
            limit(10)
          );
          const snapshot = await getDocs(qLeaders);
          if (snapshot.empty) {
            await interaction.reply({
              content:
                "\u26A0\uFE0F No registered users found in the leaderboard.",
              ephemeral: true,
            });
            return;
          }
          const leadEmbed = new EmbedBuilder()
            .setTitle("\u{1F451} ArenaX Global Leaderboard")
            .setDescription(
              "Top 10 gamers based on active **AX Coin Balance** (Fetched from Firestore):"
            )
            .setColor(15844367)
            .setTimestamp();
          let descriptionText = "";
          let rank = 1;
          snapshot.forEach((doc) => {
            const data = doc.data();
            const medal =
              rank === 1
                ? "\u{1F947}"
                : rank === 2
                ? "\u{1F948}"
                : rank === 3
                ? "\u{1F949}"
                : `\`#${rank}\``;
            const handleText = data.handle ? ` (@${data.handle})` : "";
            descriptionText += `${medal} **${
              data.name || "Unknown Player"
            }**${handleText}
\u{1F449} Balance: \`${(data.balance || 0).toLocaleString()} AX\`

`;
            rank++;
          });
          leadEmbed.setDescription(
            descriptionText || "No active participants yet."
          );
          await interaction.reply({ embeds: [leadEmbed] });
          addBotLog(
            `Slash command /leaderboard executed by ${interaction.user.tag}`
          );
        } catch (err) {
          addBotLog("Error fetching leaderboard (slash): " + err.message);
          await interaction.reply({
            content: "\u274C Failed to load the leaderboard from database.",
            ephemeral: true,
          });
        }
      } else if (commandName === "roll") {
        const rolled = Math.floor(Math.random() * 100) + 1;
        await interaction.reply(
          `\u{1F3B2} **${interaction.user.username}** rolled a **${rolled}**! (1-100)`
        );
        addBotLog(
          `Slash command /roll executed by ${interaction.user.tag}: ${rolled}`
        );
      } else if (commandName === "coinflip") {
        const side = Math.random() < 0.5 ? "Heads" : "Tails";
        await interaction.reply(
          `\u{1FA99} **${interaction.user.username}** flipped a coin and got: **${side}**!`
        );
        addBotLog(
          `Slash command /coinflip executed by ${interaction.user.tag}: ${side}`
        );
      } else if (commandName === "8ball") {
        const question = interaction.options.getString("question", true);
        const answers = [
          "Yes, definitely! \u{1F7E2}",
          "It is decidedly so! \u2714\uFE0F",
          "Most likely! \u{1F44D}",
          "Signs point to yes! \u{1F44C}",
          "Reply hazy, try again... \u{1F504}",
          "Ask again later... \u23F3",
          "Better not tell you now... \u{1F92B}",
          "My sources say no. \u274C",
          "Very doubtful. \u26A0\uFE0F",
          "No way! \u{1F6AB}",
        ];
        const choice = answers[Math.floor(Math.random() * answers.length)];
        await interaction.reply(`\u{1F52E} **Question:** *${question}*
\u{1F3B1} **Magic 8-Ball:** ${choice}`);
        addBotLog(`Slash command /8ball executed by ${interaction.user.tag}`);
      } else if (commandName === "rps") {
        const userChoice = interaction.options
          .getString("choice", true)
          .toLowerCase();
        const rpsChoices = ["rock", "paper", "scissors"];
        const botChoice =
          rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
        let userEmoji =
          userChoice === "rock"
            ? "\u270A Rock"
            : userChoice === "paper"
            ? "\u270B Paper"
            : "\u270C\uFE0F Scissors";
        let botEmoji =
          botChoice === "rock"
            ? "\u270A Rock"
            : botChoice === "paper"
            ? "\u270B Paper"
            : "\u270C\uFE0F Scissors";
        let rpsResult = "";
        if (userChoice === botChoice) {
          rpsResult = "It's a draw! \u{1F91D}";
        } else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) {
          rpsResult = "You win! \u{1F389}";
        } else {
          rpsResult = "Bot wins! \u{1F916}";
        }
        const rpsEmbed = new EmbedBuilder()
          .setTitle("\u{1F3AE} Rock Paper Scissors Game")
          .setColor(3447003)
          .addFields(
            { name: "\u{1F464} Your Move", value: userEmoji, inline: true },
            { name: "\u{1F916} Bot's Move", value: botEmoji, inline: true },
            {
              name: "\u{1F3C1} Result",
              value: `**${rpsResult}**`,
              inline: false,
            }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [rpsEmbed] });
        addBotLog(`Slash command /rps executed by ${interaction.user.tag}`);
      } else if (commandName === "joke") {
        const gamingJokes = [
          "Why do gamers hate nature? Too many bugs! \u{1F41B}\u{1F3AE}",
          "Why are players so bad at football? Because they're always controller-locked! \u{1F3AE}\u26BD",
          "Why did the football player go to the bank? To get his quarter back! \u{1F3E6}\u26BD",
          "What is a gamer's favorite school subject? Console-ing class! \u{1F4BB}",
          "How do football players stay cool? They stand next to the fans! \u{1F9CA}\u26BD",
          "Why was the computer cold? It left its Windows open! \u{1FA9F}\u{1F916}",
          "What is a soccer player's favorite tea? Penal-tea! \u2615\u26BD",
          "Why did the gamer cross the road? To render the other side! \u{1F6E3}\uFE0F",
        ];
        const joke =
          gamingJokes[Math.floor(Math.random() * gamingJokes.length)];
        await interaction.reply(`\u{1F602} **Joke:** ${joke}`);
        addBotLog(`Slash command /joke executed by ${interaction.user.tag}`);
      } else if (commandName === "tip") {
        const gamingTips = [
          "\u{1F525} Practice daily to muscle-memorize your aim and button configurations!",
          "\u{1F3A7} A good gaming headset can help you hear enemy footsteps and location cues perfectly.",
          "\u{1F4A7} Stay hydrated! Drinking water improves focus, reaction time, and physical stamina.",
          "\u{1F5FA}\uFE0F Map awareness is key! Always check your minimap to stay ahead of enemy rotations.",
          "\u{1F5E3}\uFE0F Communicate politely with your team. Good coordination wins more matches than solo play!",
          "\u{1F9D8} Take short 5-minute breaks between matches to avoid fatigue and stay tilt-free.",
          "\u26BD In football trivia, team performance stats and key player positions are crucial to analyze.",
          "\u{1F3C6} Review your match replays! Analyzing your own deaths/mistakes is the fastest way to get better.",
        ];
        const tip = gamingTips[Math.floor(Math.random() * gamingTips.length)];
        await interaction.reply(`\u{1F4A1} **Pro Tip:** ${tip}`);
        addBotLog(`Slash command /tip executed by ${interaction.user.tag}`);
      } else if (commandName === "quiz") {
        if (activeQuizzes.has(interaction.channelId)) {
          await interaction.reply({
            content:
              "\u26A0\uFE0F An active quiz is already running in this channel! Guess the answer first.",
            ephemeral: true,
          });
          return;
        }
        const triviaIndex = Math.floor(Math.random() * triviaPool.length);
        const trivia = triviaPool[triviaIndex];
        const quizEmbed = new EmbedBuilder()
          .setTitle("\u26BD ArenaX Football Trivia Quiz!")
          .setDescription(
            `**Question:**
${trivia.q}

\u23F1\uFE0F You have **30 seconds** to type the correct answer in the chat!`
          )
          .setColor(15844367)
          .setFooter({
            text: "Type the answer below \u2014 first correct response wins!",
          })
          .setTimestamp();
        const channelId = interaction.channelId;
        const qTimeout = setTimeout(async () => {
          if (activeQuizzes.has(channelId)) {
            activeQuizzes.delete(channelId);
            const timeUpEmbed = new EmbedBuilder()
              .setTitle("\u23F0 Time's Up!")
              .setDescription(
                `Nobody guessed the correct answer in time.

\u{1F449} The correct answer was: **${trivia.correctText}**`
              )
              .setColor(15158332)
              .setTimestamp();
            await interaction.channel?.send({ embeds: [timeUpEmbed] });
          }
        }, 3e4);
        activeQuizzes.set(channelId, {
          question: trivia.q,
          answers: trivia.a,
          correctAnswerText: trivia.correctText,
          timeout: qTimeout,
        });
        await interaction.reply({ embeds: [quizEmbed] });
        addBotLog(
          `Started interactive slash quiz in channel ${channelId} by request of ${interaction.user.tag}`
        );
      } else if (commandName === "avatar") {
        const targetUser =
          interaction.options.getUser("user") || interaction.user;
        const avEmbed = new EmbedBuilder()
          .setTitle(`${targetUser.username}'s Avatar`)
          .setImage(targetUser.displayAvatarURL({ size: 1024 }))
          .setColor(3447003)
          .setTimestamp();
        await interaction.reply({ embeds: [avEmbed] });
        addBotLog(
          `Slash command /avatar executed by ${interaction.user.tag} for ${targetUser.tag}`
        );
      } else if (commandName === "afk") {
        const reason = interaction.options.getString("reason", true);
        afkUsers.set(interaction.user.id, { reason, timestamp: Date.now() });
        await interaction.reply(
          `\u{1F4A4} **${interaction.user.username}** has gone AFK: *${reason}*`
        );
        addBotLog(
          `Slash user ${interaction.user.tag} went AFK for: "${reason}"`
        );
      } else if (commandName === "serverinfo") {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({
            content:
              "\u274C This command can only be used in a Discord server.",
            ephemeral: true,
          });
          return;
        }
        const serverEmbed = new EmbedBuilder()
          .setTitle(`\u{1F5A5}\uFE0F Server Information: ${guild.name}`)
          .setThumbnail(guild.iconURL() || "")
          .setColor(3447003)
          .addFields(
            {
              name: "\u{1F451} Owner",
              value: `<@${guild.ownerId}>`,
              inline: true,
            },
            {
              name: "\u{1F465} Members Count",
              value: `\`${guild.memberCount}\``,
              inline: true,
            },
            {
              name: "\u{1F4C5} Created At",
              value: `<t:${Math.floor(guild.createdTimestamp / 1e3)}:R>`,
              inline: true,
            },
            {
              name: "\u26A1 Premium Boosts",
              value: `\`${guild.premiumSubscriptionCount || 0}\` (Tier ${
                guild.premiumTier
              })`,
              inline: true,
            },
            {
              name: "Channels Size",
              value: `\`${guild.channels.cache.size}\` channels`,
              inline: true,
            },
            {
              name: "Emojis Size",
              value: `\`${guild.emojis.cache.size}\` emojis`,
              inline: true,
            }
          )
          .setFooter({ text: `Server Guild ID: ${guild.id}` })
          .setTimestamp();
        await interaction.reply({ embeds: [serverEmbed] });
        addBotLog(
          `Slash command /serverinfo executed by ${interaction.user.tag}`
        );
      } else if (commandName === "rules") {
        const rulesEmbed = new EmbedBuilder()
          .setTitle("\u{1F4DC} ArenaX Discord Server Rules")
          .setDescription(
            "Welcome to the official **ArenaX Discord Server**! Please read and follow our guidelines to maintain a great atmosphere:"
          )
          .setColor(15220810)
          .addFields(
            {
              name: "1. Respect All Members",
              value:
                "Strictly no toxicity, hate speech, bullying, racism, or spamming.",
            },
            {
              name: "2. Keep Topics Relevant",
              value:
                "Use designated channels appropriately (e.g. general discussion in #general, support in ticket).",
            },
            {
              name: "3. Play Fair",
              value:
                "Any form of hacking, exploiting match flaws, or sharing cheating tools will result in a ban.",
            },
            {
              name: "4. No Direct Advertisement",
              value:
                "Do not promote other servers, unauthorized referral schemes, or outside platforms without approval.",
            },
            {
              name: "5. Follow Moderator Directions",
              value: "Moderator instructions must be respected at all times.",
            }
          )
          .setFooter({ text: "Enjoy competing! Team ArenaX" })
          .setTimestamp();
        await interaction.reply({ embeds: [rulesEmbed] });
        addBotLog(`Slash command /rules executed by ${interaction.user.tag}`);
      } else if (commandName === "maintenance") {
        const conf = getBotConfig();
        const activeMaint = !!conf.maintenanceMode;
        const maintEmbed = new EmbedBuilder()
          .setTitle("\u{1F527} ArenaX Maintenance Status")
          .setDescription(
            activeMaint
              ? "\u26A0\uFE0F **ArenaX Services are currently in Maintenance Mode!** Our developers are working hard behind the scenes to upgrade features. Some functionalities may be temporarily offline."
              : "\u{1F7E2} **All systems are operational!** ArenaX servers, matchmaking, rewards shop, and the web client are running perfectly."
          )
          .setColor(activeMaint ? 15158332 : 3066993)
          .setTimestamp();
        await interaction.reply({ embeds: [maintEmbed] });
        addBotLog(
          `Slash command /maintenance executed by ${interaction.user.tag}`
        );
      } else if (commandName === "setmaintenance") {
        if (
          !interaction.memberPermissions?.has("Administrator") &&
          !interaction.memberPermissions?.has("ManageGuild")
        ) {
          await interaction.reply({
            content:
              "\u274C Only server administrators can toggle maintenance status.",
            ephemeral: true,
          });
          return;
        }
        const stateStr = interaction.options.getString("mode", true);
        const state = stateStr === "on";
        saveBotConfig({ maintenanceMode: state });
        await interaction.reply(
          `\u2705 Maintenance mode has been successfully turned **${
            state ? "ON" : "OFF"
          }**.`
        );
        addBotLog(
          `Maintenance mode updated to ${state ? "ON" : "OFF"} via slash by ${
            interaction.user.tag
          }`
        );
      } else if (commandName === "welcome" || commandName === "setwelcome") {
        if (
          !interaction.memberPermissions?.has("ManageChannels") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "\u274C You do not have permissions (`Manage Channels` or `Administrator`) to set the welcome channel.",
            ephemeral: true,
          });
          return;
        }
        const targetChannel = interaction.options.getChannel("channel");
        const action = interaction.options.getString("action");
        if (action === "disable") {
          saveBotConfig({ welcomeChannelId: "" });
          await interaction.reply({
            content:
              "\u2705 Welcome channel has been disabled. New member joins will no longer trigger welcome messages.",
          });
          addBotLog(
            `Welcome channel disabled via slash by ${interaction.user.tag}`
          );
          return;
        }
        if (!targetChannel) {
          const config = getBotConfig();
          if (config.welcomeChannelId) {
            await interaction.reply({
              content: `\u2139\uFE0F Current welcome channel is <#${config.welcomeChannelId}>.
To change it, specify a channel: \`/setwelcome channel: <#channel>\`
To disable: \`/setwelcome action: Disable\``,
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: `\u26A0\uFE0F Please specify a channel option or action! Usage: \`/setwelcome channel: <#channel>\` or disable with action.`,
              ephemeral: true,
            });
          }
          return;
        }
        saveBotConfig({ welcomeChannelId: targetChannel.id });
        await interaction.reply({
          content: `\u2705 Welcome channel has been successfully set to ${targetChannel}! When a new user joins, I will post a welcome card there.`,
        });
        addBotLog(
          `Welcome channel set to #${targetChannel.name} (${targetChannel.id}) via slash by ${interaction.user.tag}`
        );
      } else if (commandName === "setwarninglink") {
        if (
          !interaction.memberPermissions?.has("ManageChannels") &&
          !interaction.memberPermissions?.has("Administrator") &&
          !interaction.memberPermissions?.has("ManageMessages")
        ) {
          await interaction.reply({
            content:
              "❌ You do not have permissions to configure link-monitored channels.",
            ephemeral: true,
          });
          return;
        }
        const targetChannel = interaction.options.getChannel("channel", true);
        const action = interaction.options.getString("action");
        const gCfg = getGuildConfig(interaction.guildId);
        const monitored = gCfg.warningLinkChannels || [];
        let updatedChannels = [];
        let title = "";
        let desc = "";
        if (action === "remove") {
          updatedChannels = monitored.filter((id) => id !== targetChannel.id);
          saveGuildConfig(interaction.guildId, {
            warningLinkChannels: updatedChannels,
          });
          title = "🛡️ Link Monitoring Removed";
          desc = `${targetChannel} is no longer monitored for links.`;
        } else {
          if (!monitored.includes(targetChannel.id)) {
            updatedChannels = [...monitored, targetChannel.id];
            saveGuildConfig(interaction.guildId, {
              warningLinkChannels: updatedChannels,
            });
          } else {
            updatedChannels = monitored;
          }
          title = "🛡️ Link Protection Monitored Channel Configured";
          desc = `${targetChannel} is now monitored for links!\n\n• Any message with links will be auto-deleted.\n• Channel warning posted: \`[username] has been warned due to sending link\`\n• Direct message warning sent to user.`;
        }
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor("#f0c040")
          .addFields({
            name: "📋 Monitored Channels",
            value:
              updatedChannels.length > 0
                ? updatedChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
            inline: false,
          })
          .setFooter({ text: "ArenaX Anti-Link Moderation" })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        addBotLog(
          `Slash /setwarninglink run for #${targetChannel.name} by ${interaction.user.tag}`
        );
      } else if (commandName === "notbot") {
        if (
          !interaction.memberPermissions?.has("ManageChannels") &&
          !interaction.memberPermissions?.has("Administrator") &&
          !interaction.memberPermissions?.has("ManageMessages")
        ) {
          await interaction.reply({
            content:
              "❌ You do not have permissions to configure silent channels.",
            ephemeral: true,
          });
          return;
        }
        const targetChannel = interaction.options.getChannel("channel", true);
        const action = interaction.options.getString("action");
        const gCfg = getGuildConfig(interaction.guildId);
        const notBotList = gCfg.notBotChannels || [];
        let updatedChannels = [];
        let title = "";
        let desc = "";
        if (action === "remove") {
          updatedChannels = notBotList.filter((id) => id !== targetChannel.id);
          saveGuildConfig(interaction.guildId, {
            notBotChannels: updatedChannels,
          });
          title = "🔊 Silent Zone Removed";
          desc = `${targetChannel} is no longer a silent zone. Commands are enabled for all users.`;
        } else {
          if (!notBotList.includes(targetChannel.id)) {
            updatedChannels = [...notBotList, targetChannel.id];
            saveGuildConfig(interaction.guildId, {
              notBotChannels: updatedChannels,
            });
          } else {
            updatedChannels = notBotList;
          }
          title = "🤫 Bot Silent Zone Configured";
          desc = `${targetChannel} is now set as a **Silent Zone**!\n\n• Normal users typing bot commands will receive no response.\n• Moderators & Admins can use commands normally.\n• Anti-link protection remains fully active if configured.`;
        }
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor("#f0c040")
          .addFields({
            name: "📋 Active Silent Channels",
            value:
              updatedChannels.length > 0
                ? updatedChannels.map((id) => `<#${id}>`).join(", ")
                : "None",
            inline: false,
          })
          .setFooter({ text: "ArenaX Silent Zone Moderation" })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        addBotLog(
          `Slash /notbot run for #${targetChannel.name} by ${interaction.user.tag}`
        );
      } else if (commandName === "announce") {
        if (
          !interaction.memberPermissions?.has("ManageChannels") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "\u274C You do not have permissions (`Manage Channels`) to make announcements.",
            ephemeral: true,
          });
          return;
        }
        const targetChannel = interaction.options.getChannel("channel", true);
        const announceMsg = interaction.options.getString("message", true);
        const annEmbed = new EmbedBuilder()
          .setTitle("\u{1F4E2} ArenaX Server Announcement")
          .setDescription(announceMsg)
          .setColor(3447003)
          .setFooter({
            text: `Announced by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();
        await targetChannel.send({ embeds: [annEmbed] });
        await interaction.reply({
          content: `\u2705 Successfully broadcasted announcement to ${targetChannel}!`,
          ephemeral: true,
        });
        addBotLog(
          `Slash /announce run in channel ${targetChannel.name} by ${interaction.user.tag}`
        );
      } else if (commandName === "alert") {
        if (
          !interaction.memberPermissions?.has("MentionEveryone") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "\u274C You need `Mention Everyone` permissions to broadcast alerts.",
            ephemeral: true,
          });
          return;
        }
        const alertMsg = interaction.options.getString("message", true);
        const alertEmbed = new EmbedBuilder()
          .setTitle("\u{1F6A8} URGENT SERVER BROADCAST")
          .setDescription(alertMsg)
          .setColor(15158332)
          .setFooter({ text: `Broadcasted by ${interaction.user.username}` })
          .setTimestamp();
        await interaction.reply({
          content: "Broadcast sending...",
          ephemeral: true,
        });
        await interaction.channel?.send({
          content: "@everyone",
          embeds: [alertEmbed],
        });
        addBotLog(`Slash command /alert executed by ${interaction.user.tag}`);
      } else if (commandName === "warn") {
        if (
          !interaction.memberPermissions?.has("KickMembers") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "\u274C You do not have moderator permission (`Kick Members`) to warn users.",
            ephemeral: true,
          });
          return;
        }
        const targetUser = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason", true);
        if (targetUser.bot) {
          await interaction.reply({
            content: "❌ Bots cannot be warned.",
            ephemeral: true,
          });
          return;
        }
        addBotLog(
          `User ${targetUser.tag} warned via slash by moderator ${interaction.user.tag} for: "${reason}"`
        );
        const warnRes = await addUserWarning(
          interaction.guild,
          targetUser,
          interaction.user.tag,
          reason
        );

        if (warnRes.timedOut) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⛔ 12-Hour Timeout Applied")
            .setDescription(
              `🚨 ${targetUser} has accumulated **3 warnings** and has been given a **12-hour timeout**!`
            )
            .addFields(
              {
                name: "👤 Member",
                value: `${targetUser} (@${targetUser.username})`,
                inline: true,
              },
              {
                name: "⏱️ Duration",
                value: "`12 Hours (12 ghante)`",
                inline: true,
              },
              {
                name: "👮 Moderator",
                value: `${interaction.user}`,
                inline: true,
              },
              {
                name: "📋 Final Infraction",
                value: reason,
                inline: false,
              }
            )
            .setColor(15158332)
            .setFooter({ text: "ArenaX Auto-Moderation System" })
            .setTimestamp();

          await interaction.reply({
            content: `⛔ ${targetUser} has reached 3 warnings and received a 12-hour timeout.`,
            embeds: [timeoutEmbed],
          });
        } else {
          const warnEmbed = new EmbedBuilder()
            .setTitle("⚠️ Warning Logged")
            .setDescription(
              `**User:** ${targetUser}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`
            )
            .addFields(
              {
                name: "Active Warnings",
                value: `**${warnRes.count} / 3**`,
                inline: true,
              },
              {
                name: "Penalty at 3 Warnings",
                value: "`12 Hours Timeout`",
                inline: true,
              }
            )
            .setColor(15105570)
            .setFooter({ text: "ArenaX Moderation System" })
            .setTimestamp();

          await interaction.reply({
            content: `⚠️ ${targetUser} has been warned (**${warnRes.count}/3 warnings**).`,
            embeds: [warnEmbed],
          });
        }
      } else if (commandName === "warnings") {
        if (
          !interaction.memberPermissions?.has("KickMembers") &&
          !interaction.memberPermissions?.has("Administrator") &&
          !interaction.memberPermissions?.has("ManageMessages")
        ) {
          await interaction.reply({
            content:
              "❌ You do not have moderator permission (`Manage Messages` / `Kick Members`) to check user warnings.",
            ephemeral: true,
          });
          return;
        }
        const targetUser =
          interaction.options.getUser("user") || interaction.user;
        const wData = getUserWarnings(interaction.guildId || "", targetUser.id);
        const historyText =
          wData.history.length > 0
            ? wData.history
                .slice(-5)
                .map(
                  (h, i) =>
                    `\`${i + 1}.\` **${h.reason}** — By: *${h.moderator}* (<t:${Math.floor(
                      h.timestamp / 1000
                    )}:R>)`
                )
                .join("\n")
            : "No warnings recorded.";

        const warningsEmbed = new EmbedBuilder()
          .setTitle(`📋 Warnings Profile: ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL())
          .setColor(wData.count >= 2 ? 15158332 : 15844367)
          .addFields(
            {
              name: "Active Warnings",
              value: `**${wData.count} / 3**`,
              inline: true,
            },
            {
              name: "Lifetime Warnings",
              value: `\`${wData.totalWarnings}\``,
              inline: true,
            },
            {
              name: "Total 12h Timeouts",
              value: `\`${wData.totalTimeouts}\``,
              inline: true,
            },
            {
              name: "Recent Infractions",
              value: historyText,
              inline: false,
            }
          )
          .setFooter({
            text: "3 active warnings will trigger a 12-hour timeout automatically.",
          })
          .setTimestamp();

        await interaction.reply({ embeds: [warningsEmbed] });
        addBotLog(
          `Checked warnings for ${targetUser.tag} by ${interaction.user.tag}`
        );
      } else if (commandName === "clearwarn") {
        if (
          !interaction.memberPermissions?.has("KickMembers") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "❌ You do not have moderator permission (`Kick Members`) to clear warnings.",
            ephemeral: true,
          });
          return;
        }
        const targetUser = interaction.options.getUser("user", true);
        clearUserWarnings(interaction.guildId || "", targetUser.id);
        await interaction.reply({
          content: `✅ Active warnings for ${targetUser} have been cleared back to **0/3**.`,
        });
        addBotLog(
          `Cleared warnings for ${targetUser.tag} by moderator ${interaction.user.tag}`
        );
      } else if (commandName === "slowmode") {
        if (
          !interaction.memberPermissions?.has("ManageChannels") &&
          !interaction.memberPermissions?.has("Administrator")
        ) {
          await interaction.reply({
            content:
              "\u274C You do not have permissions (`Manage Channels`) to set slowmode.",
            ephemeral: true,
          });
          return;
        }
        const seconds = interaction.options.getInteger("seconds", true);
        await interaction.channel.setRateLimitPerUser(seconds);
        await interaction.reply(
          seconds === 0
            ? "\u{1F7E2} Slowmode has been disabled for this channel."
            : `\u23F1\uFE0F Slowmode set to **${seconds} seconds** per message.`
        );
        addBotLog(
          `Slash command /slowmode executed (set to ${seconds}s) by ${interaction.user.tag}`
        );
      } else if (commandName === "ask") {
        const queryText = interaction.options.getString("prompt", true);
        await interaction.deferReply();
        addBotLog(
          `Slash command /ask executed by ${interaction.user.tag}: "${queryText}"`
        );
        const config = getBotConfig();
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          await interaction.editReply(
            "\u274C AI configuration is incomplete. GEMINI_API_KEY environment variable is missing."
          );
          return;
        }
        const replyText = await fetchGeminiReply(
          queryText,
          config.systemInstruction,
          config.temperature
        );
        if (replyText.length > 2e3) {
          await interaction.editReply(replyText.substring(0, 1990) + "...");
        } else {
          await interaction.editReply(replyText);
        }
      } else if (commandName === "clear") {
        if (!interaction.memberPermissions?.has("ManageMessages")) {
          await interaction.reply({
            content: "\u274C You don't have the `Manage Messages` permission.",
            ephemeral: true,
          });
          return;
        }
        const amount = interaction.options.getInteger("amount", true);
        if (amount < 1 || amount > 100) {
          await interaction.reply({
            content: "\u26A0\uFE0F Please specify an amount between 1 and 100.",
            ephemeral: true,
          });
          return;
        }
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        if (channel) {
          const messages = await channel.messages.fetch({ limit: amount });
          await channel.bulkDelete(messages);
          await interaction.editReply(
            `\u{1F9F9} Successfully deleted **${amount}** messages!`
          );
          addBotLog(
            `Cleared ${amount} messages in channel by request of ${interaction.user.tag}`
          );
        } else {
          await interaction.editReply(
            "\u274C Unable to clear messages in this channel."
          );
        }
      } else if (commandName === "embed") {
        const title = interaction.options.getString("title", true);
        const description = interaction.options.getString("description", true);
        const colorInput = interaction.options.getString("color") || "BLUE";
        let hexColor = 3447003;
        if (colorInput.toLowerCase() === "red") hexColor = 15158332;
        else if (colorInput.toLowerCase() === "green") hexColor = 3066993;
        else if (colorInput.toLowerCase() === "yellow") hexColor = 15844367;
        else if (colorInput.toLowerCase() === "purple") hexColor = 10181046;
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(hexColor)
          .setTimestamp()
          .setFooter({
            text: `Broadcasted by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });
        await interaction.reply({ embeds: [embed] });
        addBotLog(`Embed message sent by ${interaction.user.tag}`);
      } else if (commandName === "launchfest") {
        await interaction.reply({
          embeds: [createLaunchFestEmbed(client?.user)],
        });
        addBotLog(
          `Slash command /launchfest executed by ${interaction.user.tag}`
        );
      } else if (commandName === "dailyrewards") {
        await interaction.reply({
          embeds: [createDailyRewardsEmbed(client?.user)],
        });
        addBotLog(
          `Slash command /dailyrewards executed by ${interaction.user.tag}`
        );
      } else if (commandName === "tasks") {
        await interaction.reply({ embeds: [createTasksEmbed(client?.user)] });
        addBotLog(`Slash command /tasks executed by ${interaction.user.tag}`);
      } else if (commandName === "refer") {
        await interaction.reply({ embeds: [createReferEmbed(client?.user)] });
        addBotLog(`Slash command /refer executed by ${interaction.user.tag}`);
      } else if (commandName === "prize") {
        await interaction.reply({ embeds: [createPrizeEmbed(client?.user)] });
        addBotLog(`Slash command /prize executed by ${interaction.user.tag}`);
      }
    } catch (err) {
      addBotLog(`Error running slash command /${commandName}: ` + err.message);
      if (interaction.deferred || interaction.replied) {
        await interaction
          .followUp({
            content: "\u274C An error occurred while executing this command.",
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        await interaction
          .reply({
            content: "\u274C An error occurred while executing this command.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  });
  try {
    await client.login(token);
  } catch (error) {
    addBotLog("\u274C Failed to login to Discord: " + error.message);
    addBotLog(
      "\u{1F4A1} Please verify that your DISCORD_TOKEN is valid and has proper gateway intents enabled."
    );
    botStats.status = "Failed to Login";
  }
}
__name(initializeDiscordBot, "initializeDiscordBot");
async function registerSlashCommands(clientId, token) {
  const commands = [
    {
      name: "help",
      description: "List all available bot commands and utilities",
    },
    {
      name: "status",
      description: "Display bot status, latency, and system analytics",
    },
    { name: "ping", description: "Test the bot latency" },
    { name: "register", description: "Get ArenaX registration link" },
    { name: "website", description: "Get ArenaX official website link" },
    { name: "info", description: "Get detailed information about ArenaX" },
    {
      name: "tournaments",
      description: "Fetch real-time esports tournaments from database",
    },
    {
      name: "leaderboard",
      description: "View the top 10 players by balance from database",
    },
    { name: "roll", description: "Roll a random number from 1 to 100" },
    { name: "coinflip", description: "Flip a coin (Heads/Tails)" },
    {
      name: "8ball",
      description: "Ask the Magic 8 Ball a question",
      options: [
        {
          name: "question",
          description: "The question to ask 8ball",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "rps",
      description: "Play Rock Paper Scissors with the bot",
      options: [
        {
          name: "choice",
          description: "Your move",
          type: 3,
          required: true,
          choices: [
            { name: "Rock", value: "rock" },
            { name: "Paper", value: "paper" },
            { name: "Scissors", value: "scissors" },
          ],
        },
      ],
    },
    { name: "joke", description: "Get a funny gaming or soccer joke" },
    { name: "tip", description: "Get a professional competitive gaming tip" },
    {
      name: "quiz",
      description: "Start a 30-second interactive football trivia quiz",
    },
    {
      name: "avatar",
      description: "Get high-resolution avatar image of a user or yourself",
      options: [
        {
          name: "user",
          description: "The user whose avatar you want to fetch",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "afk",
      description: "Go AFK with a custom status reason",
      options: [
        {
          name: "reason",
          description: "The reason why you are going AFK",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "serverinfo",
      description: "Display details of the current Discord server",
    },
    { name: "rules", description: "Display the server rules and guidelines" },
    {
      name: "maintenance",
      description: "Show current ArenaX systems operational status",
    },
    {
      name: "setmaintenance",
      description: "Enable or disable maintenance mode (Admin only)",
      options: [
        {
          name: "mode",
          description: "Turn maintenance mode on or off",
          type: 3,
          required: true,
          choices: [
            { name: "On", value: "on" },
            { name: "Off", value: "off" },
          ],
        },
      ],
    },
    {
      name: "welcome",
      description:
        "Set the channel where the bot welcomes new members (Admin only)",
      options: [
        {
          name: "channel",
          description: "The channel to send welcome messages in",
          type: 7,
          required: true,
        },
      ],
    },
    {
      name: "setwarninglink",
      description:
        "Set a channel where sending links is prohibited and warned (Admin only)",
      options: [
        {
          name: "channel",
          description: "The channel to monitor or unmonitor",
          type: 7,
          required: true,
        },
        {
          name: "action",
          description: "Action to perform",
          type: 3,
          required: false,
          choices: [
            { name: "Add / Monitor", value: "add" },
            { name: "Remove / Unmonitor", value: "remove" },
          ],
        },
      ],
    },
    {
      name: "notbot",
      description:
        "Set a channel as a silent zone where regular users cannot run bot commands (Admin only)",
      options: [
        {
          name: "channel",
          description: "The channel to mark or unmark as silent zone",
          type: 7,
          required: true,
        },
        {
          name: "action",
          description: "Action to perform",
          type: 3,
          required: false,
          choices: [
            { name: "Add / Enable Silent Zone", value: "add" },
            { name: "Remove / Disable Silent Zone", value: "remove" },
          ],
        },
      ],
    },
    {
      name: "announce",
      description: "Broadcast an announcement embed to a channel (Admin only)",
      options: [
        {
          name: "channel",
          description: "The channel to send the announcement to",
          type: 7,
          required: true,
        },
        {
          name: "message",
          description: "The announcement message body content",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "alert",
      description: "Broadcast an alert embed with @everyone ping (Admin only)",
      options: [
        {
          name: "message",
          description: "The alert message content",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "warn",
      description:
        "Warn a member (3 warnings trigger automatic 12-hour timeout)",
      options: [
        {
          name: "user",
          description: "The user to warn",
          type: 6,
          required: true,
        },
        {
          name: "reason",
          description: "The reason for warning this user",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "warnings",
      description: "View warning count and infraction history for a member",
      options: [
        {
          name: "user",
          description: "The user to check warnings for (defaults to yourself)",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "clearwarn",
      description:
        "Clear active warnings back to 0/3 for a member (Moderator only)",
      options: [
        {
          name: "user",
          description: "The user whose active warnings will be cleared",
          type: 6,
          required: true,
        },
      ],
    },
    {
      name: "slowmode",
      description:
        "Manage slowmode rate limit for the channel (Moderator only)",
      options: [
        {
          name: "seconds",
          description: "Slowmode delay in seconds (0 to disable)",
          type: 4,
          required: true,
        },
      ],
    },
    {
      name: "ask",
      description: "Ask the Google Gemini AI any question or prompt",
      options: [
        {
          name: "prompt",
          description: "The prompt or question to ask Gemini AI",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "clear",
      description: "Bulk delete messages from this channel (Admin only)",
      options: [
        {
          name: "amount",
          description: "The number of messages to delete (1-100)",
          type: 4,
          required: true,
        },
      ],
    },
    {
      name: "embed",
      description: "Create and send a beautiful custom rich embed message",
      options: [
        {
          name: "title",
          description: "The title of your embed",
          type: 3,
          required: true,
        },
        {
          name: "description",
          description: "The main body content of your embed",
          type: 3,
          required: true,
        },
        {
          name: "color",
          description: "Select embed accent color",
          type: 3,
          required: false,
          choices: [
            { name: "Blue", value: "blue" },
            { name: "Red", value: "red" },
            { name: "Green", value: "green" },
            { name: "Yellow", value: "yellow" },
            { name: "Purple", value: "purple" },
          ],
        },
      ],
    },
    {
      name: "launchfest",
      description: "Show ArenaX Launch Fest event info & event banner",
    },
    {
      name: "dailyrewards",
      description: "Show daily login streak rewards on ArenaX",
    },
    { name: "tasks", description: "List ArenaX daily tasks to earn AX points" },
    { name: "refer", description: "Show Referral Program details and links" },
    {
      name: "prize",
      description: "Show Weekly Free Tournament prize distribution",
    },
  ];
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    addBotLog("Refreshing bot slash commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    addBotLog("Successfully registered all application (/) commands globally!");
  } catch (error) {
    addBotLog(
      "\u26A0\uFE0F Failed to register slash commands: " + error.message
    );
  }
}
__name(registerSlashCommands, "registerSlashCommands");
async function handleGeminiChat(message, text) {
  const typingUnsub = message.channel.sendTyping().catch(() => {});
  const config = getBotConfig();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await message.reply(
      "\u274C Gemini AI client is unconfigured. Pls set your `GEMINI_API_KEY` in Settings."
    );
    return;
  }
  try {
    const reply = await fetchGeminiReply(
      text,
      config.systemInstruction,
      config.temperature
    );
    if (reply.length > 2e3) {
      let remaining = reply;
      while (remaining.length > 0) {
        const chunk = remaining.substring(0, 1990);
        remaining = remaining.substring(1990);
        await message.reply(chunk);
      }
    } else {
      await message.reply(reply);
    }
  } catch (error) {
    addBotLog("Gemini error in Discord Chat: " + error.message);
    await message.reply(
      "\u274C Sorrry, I encountered an error while processing that query with Gemini."
    );
  }
}
__name(handleGeminiChat, "handleGeminiChat");
async function fetchGeminiReply(promptText, sysPrompt, temperature) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    config: { systemInstruction: sysPrompt, temperature },
  });
  return response.text || "No reply generated.";
}
__name(fetchGeminiReply, "fetchGeminiReply");
function createLaunchFestEmbed(clientUser) {
  return new EmbedBuilder()
    .setTitle("\u{1F389} ArenaX Launch Fest")
    .setDescription("*Join the Revolution \u2014 Play Free, Win Big!*")
    .setColor(15220810)
    .addFields(
      { name: "\u{1F4C5} End Date", value: "August 1, 2026", inline: true },
      {
        name: "\u{1F381} Daily Rewards",
        value: "10-50 AX per day",
        inline: true,
      },
      {
        name: "\u{1F4DD} Daily Tasks",
        value: "Complete tasks daily to accumulate AX points!",
        inline: false,
      },
      {
        name: "\u{1F517} Join Link",
        value:
          "[Click here to join ArenaX!](https://kpllahore123-maker.github.io/arenaX/)",
      }
    )
    .setImage(
      "https://raw.githubusercontent.com/kpllahore123-maker/arenaX/main/event_banner_1783187383925.jpg"
    )
    .setFooter({
      text: "ArenaX Events",
      iconURL: clientUser?.displayAvatarURL(),
    })
    .setTimestamp();
}
__name(createLaunchFestEmbed, "createLaunchFestEmbed");
function createDailyRewardsEmbed(clientUser) {
  return new EmbedBuilder()
    .setTitle("\u{1F4C5} Daily Login Streak Rewards")
    .setDescription(
      "Login daily on ArenaX to claim!\n\n**Day 1:** 10 AX\n**Day 2:** 15 AX\n**Day 3:** 20 AX\n**Day 4:** 25 AX\n**Day 5:** 30 AX\n**Day 6:** 35 AX\n**Day 7:** 50 AX + Launch Fest Badge\n\n*Login daily on ArenaX to claim!*"
    )
    .setColor(3066993)
    .addFields({
      name: "\u{1F517} Claim Link",
      value: "[Go to ArenaX](https://kpllahore123-maker.github.io/arenaX/)",
    })
    .setFooter({
      text: "ArenaX Daily Rewards",
      iconURL: clientUser?.displayAvatarURL(),
    })
    .setTimestamp();
}
__name(createDailyRewardsEmbed, "createDailyRewardsEmbed");
function createTasksEmbed(clientUser) {
  return new EmbedBuilder()
    .setTitle("\u{1F4DD} ArenaX Daily Tasks")
    .setDescription(
      "Complete tasks daily on ArenaX!\n\n\u{1F4AC} **Chat message** \u2192 10 AX\n\u{1F3C6} **Visit tournaments** \u2192 10 AX\n\u{1F3AE} **Play mini game** \u2192 20 AX\n\u{1F525} **Login** \u2192 10 AX\n\n*Complete tasks daily on ArenaX!*"
    )
    .setColor(15105570)
    .setFooter({
      text: "ArenaX Daily Tasks",
      iconURL: clientUser?.displayAvatarURL(),
    })
    .setTimestamp();
}
__name(createTasksEmbed, "createTasksEmbed");
function createReferEmbed(clientUser) {
  return new EmbedBuilder()
    .setTitle("\u{1F465} ArenaX Referral Program")
    .setDescription(
      "\u{1F465} **Refer friends and earn 20 AX per referral!**\n\nVisit ArenaX \u2192 Events \u2192 Referral section"
    )
    .setColor(10181046)
    .addFields({
      name: "\u{1F517} Join ArenaX",
      value:
        "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)",
    })
    .setFooter({
      text: "ArenaX Referral System",
      iconURL: clientUser?.displayAvatarURL(),
    })
    .setTimestamp();
}
__name(createReferEmbed, "createReferEmbed");
function createPrizeEmbed(clientUser) {
  return new EmbedBuilder()
    .setTitle("\u{1F3C6} Weekly Tournament Prizes")
    .setDescription(
      "Every Sunday 8:00 PM PKT \u2014 **FREE ENTRY!**\n\n\u{1F947} **1st:** 200 AX + Champion Badge\n\u{1F948} **2nd:** 100 AX + Runner Up Badge\n\u{1F949} **3rd:** 50 AX\n\u{1F3AE} **All participants:** 20 AX\n\n*Every Sunday 8:00 PM PKT \u2014 FREE ENTRY!*"
    )
    .setColor(15844367)
    .setFooter({
      text: "ArenaX Tournament League",
      iconURL: clientUser?.displayAvatarURL(),
    })
    .setTimestamp();
}
__name(createPrizeEmbed, "createPrizeEmbed");
export {
  addBotLog,
  addUserWarning,
  botLogs,
  botStats,
  clearUserWarnings,
  createDailyRewardsEmbed,
  createLaunchFestEmbed,
  createPrizeEmbed,
  createReferEmbed,
  createTasksEmbed,
  getBotConfig,
  getGuildConfig,
  getUserWarnings,
  initializeDiscordBot,
  saveBotConfig,
  saveGuildConfig,
};
