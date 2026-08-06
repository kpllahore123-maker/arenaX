import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActivityType,
  REST,
  Routes
} from 'discord.js';
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { db } from "./src/firebase";
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore";

// AFK and Quiz states tracking
const afkUsers = new Map<string, { reason: string; timestamp: number }>();
const activeQuizzes = new Map<string, {
  question: string;
  answers: string[];
  correctAnswerText: string;
  timeout: NodeJS.Timeout;
}>();

const triviaPool = [
  { q: "Which country has won the most FIFA World Cups?", a: ["brazil"], correctText: "Brazil" },
  { q: "Who scored the famous 'Hand of God' goal in 1986?", a: ["diego maradona", "maradona"], correctText: "Diego Maradona" },
  { q: "Which club has won the most UEFA Champions League titles?", a: ["real madrid", "madrid"], correctText: "Real Madrid" },
  { q: "Who is the all-time top scorer in international men's football?", a: ["cristiano ronaldo", "ronaldo"], correctText: "Cristiano Ronaldo" },
  { q: "Which country won the FIFA World Cup 2022 in Qatar?", a: ["argentina"], correctText: "Argentina" },
  { q: "What is the nickname of Chelsea Football Club?", a: ["the blues", "blues"], correctText: "The Blues" },
  { q: "Which player has won the most Ballon d'Or awards in football history?", a: ["lionel messi", "messi"], correctText: "Lionel Messi" },
  { q: "Which English club has won the most Premier League titles?", a: ["manchester united", "man united", "manutd"], correctText: "Manchester United" },
  { q: "Who is known as the 'King of Football' and won 3 World Cups?", a: ["pele"], correctText: "Pele" },
  { q: "Which country hosted the 2014 FIFA World Cup?", a: ["brazil"], correctText: "Brazil" }
];

// Path to store bot configuration persistent state
const CONFIG_FILE = path.join(process.cwd(), "bot-config.json");

interface BotConfig {
  prefix: string;
  systemInstruction: string;
  temperature: number;
  allowedChannels: string[];
  maintenanceMode?: boolean;
  welcomeChannelId?: string;
}

const DEFAULT_CONFIG: BotConfig = {
  prefix: "!",
  systemInstruction: "You are an intelligent, helpful, and funny AI Discord Bot powered by Gemini. You reply with a casual, engaging tone. Use Discord markdown features (bold, italics, code blocks, lists) to format your replies beautifully.",
  temperature: 0.7,
  allowedChannels: [],
  maintenanceMode: false,
  welcomeChannelId: ""
};

// In-memory log of recent bot events for the dashboard
export const botLogs: string[] = [];
export function addBotLog(message: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  botLogs.push(logEntry);
  if (botLogs.length > 100) {
    botLogs.shift();
  }
}

// Bot configuration helper
export function getBotConfig(): BotConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    addBotLog("Error reading bot config: " + (error as Error).message);
  }
  return DEFAULT_CONFIG;
}

export function saveBotConfig(config: Partial<BotConfig>): BotConfig {
  const current = getBotConfig();
  const updated = { ...current, ...config };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    addBotLog("Bot configuration updated successfully.");
  } catch (error) {
    addBotLog("Error writing bot config: " + (error as Error).message);
  }
  return updated;
}

// Store runtime stats
export const botStats = {
  status: "Offline",
  username: "None",
  tag: "None",
  avatarUrl: "",
  guildsCount: 0,
  usersCount: 0,
  ping: 0,
  commandsExecuted: 0,
  inviteLink: "",
  clientId: ""
};

let client: Client | null = null;

export async function initializeDiscordBot() {
  const token = process.env.DISCORD_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!token) {
    addBotLog("⚠️ DISCORD_TOKEN is not configured. The Discord bot will remain offline.");
    addBotLog("👉 Please add 'DISCORD_TOKEN' in Settings > Secrets to connect the bot.");
    botStats.status = "Offline (Missing Token)";
    return;
  }

  addBotLog("Initializing Discord Bot...");
  
  // Create client instance
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  // Client ready event
  client.once('ready', async (readyClient) => {
    botStats.status = "Online";
    botStats.username = readyClient.user.username;
    botStats.tag = readyClient.user.tag;
    botStats.avatarUrl = readyClient.user.displayAvatarURL();
    botStats.clientId = readyClient.user.id;
    botStats.guildsCount = readyClient.guilds.cache.size;
    botStats.ping = readyClient.ws.ping;
    
    // Estimate total members across all servers
    botStats.usersCount = readyClient.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    
    // Create an invite link with moderate permissions
    botStats.inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${readyClient.user.id}&permissions=274877911040&scope=bot%20applications.commands`;

    addBotLog(`🚀 Discord Bot logged in as ${readyClient.user.tag}!`);
    addBotLog(`🌐 Connected to ${botStats.guildsCount} server(s) with ${botStats.usersCount} total users.`);
    addBotLog(`🔗 Invite Link: ${botStats.inviteLink}`);

    // Set custom activity
    readyClient.user.setActivity({
      name: `with Gemini AI | !help`,
      type: ActivityType.Playing
    });

    // Register Slash Commands
    await registerSlashCommands(readyClient.user.id, token);
  });

  // Guild Member Add event (Welcome messages)
  client.on('guildMemberAdd', async (member) => {
    try {
      const config = getBotConfig();
      if (!config.welcomeChannelId) return;

      const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (!welcomeChannel || !welcomeChannel.isTextBased()) {
        addBotLog(`⚠️ Welcome channel (${config.welcomeChannelId}) not found or is not a text-based channel.`);
        return;
      }

      const guild = member.guild;
      const memberCount = guild.memberCount;

      const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎮 Naya Player Aaya! | Welcome to ArenaX")
        .setDescription(`Aao sab welcome karein **${member}** (Handle: @${member.user.username}) ko server mein! 🎉\n\nHum bohot khush hain ke aapne **${guild.name}** join kiya. ArenaX par free tournaments khel kar raw cash or AX coins secure karein! 🏆`)
        .setColor(0xE8404A)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .addFields(
          { 
            name: "📝 Registration", 
            value: "Sabh se pehle register karein: [ArenaX Website](https://kpllahore123-maker.github.io/arenaX/) ya bot ka `/register` command use karein.", 
            inline: false 
          },
          { 
            name: "🏆 Weekly Sunday Cup", 
            value: "Har Sunday 8:00 PM PKT par free entry tournament hota hai! `/prize` check karein.", 
            inline: false 
          },
          { 
            name: "🤖 AI Support & Chat", 
            value: "Aap kisi bhi channel mein bot ko directly mention kar ke Gemini AI se urdu/english mein baat kar sakte hain!", 
            inline: false 
          }
        )
        .setFooter({ text: `Member #${memberCount} | Team ArenaX`, iconURL: guild.iconURL() || undefined })
        .setTimestamp();

      await (welcomeChannel as any).send({ content: `👋 Welcome ${member}!`, embeds: [welcomeEmbed] });
      addBotLog(`Welcome message sent for ${member.user.tag} in channel #${(welcomeChannel as any).name}`);
    } catch (error) {
      addBotLog("⚠️ Error handling guildMemberAdd: " + (error as Error).message);
    }
  });

  // Message event (prefix-based commands & mentions)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bots

    // ─── AFK CHECK ───
    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      try {
        const welcomeReply = await message.reply(`👋 Welcome back **${message.author.username}**! I have removed your AFK status.`);
        setTimeout(() => welcomeReply.delete().catch(() => {}), 5000);
      } catch (e) {}
    }

    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach(async (user) => {
        const afk = afkUsers.get(user.id);
        if (afk) {
          try {
            await message.reply(`💤 **${user.username}** is currently AFK: *${afk.reason}*`);
          } catch (e) {}
        }
      });
    }

    // ─── QUIZ ANSWER CHECK ───
    const activeQuiz = activeQuizzes.get(message.channel.id);
    if (activeQuiz) {
      const userAnswer = message.content.trim().toLowerCase();
      if (activeQuiz.answers.includes(userAnswer)) {
        clearTimeout(activeQuiz.timeout);
        activeQuizzes.delete(message.channel.id);
        const winEmbed = new EmbedBuilder()
          .setTitle("🏆 QUIZ WINNER!")
          .setDescription(`🎉 Congratulations ${message.author}! You guessed the correct answer: **${activeQuiz.correctAnswerText}**!\n\n⚽ Stay tuned for the next trivia match!`)
          .setColor(0x2ECC71)
          .setTimestamp();
        try {
          await message.reply({ embeds: [winEmbed] });
        } catch (e) {}
        return; // Stop processing further commands for this message
      }
    }

    const config = getBotConfig();
    const prefix = config.prefix;
    
    // Check if the message is a command or mention
    const isMentioned = message.mentions.has(client!.user!) && !message.reference;
    const isCommand = message.content.startsWith(prefix);
    
    if (!isCommand && !isMentioned) return;

    botStats.commandsExecuted++;
    
    try {
      // 1. Handle Mentions / Direct AI Chat
      if (isMentioned && !isCommand) {
        // Strip out the mention tag
        const cleanMessage = message.content.replace(/<@!?\d+>/g, '').trim();
        if (!cleanMessage) {
          await message.reply("Ji? Aapne mujhe mention kiya. Kuch poochiye, main aapki help karne ke liye taiyar hoon! 😊 (e.g. `!help` check karein)");
          return;
        }

        addBotLog(`DM/Mention chat from ${message.author.tag} in #${(message.channel as any).name || 'DM'}: "${cleanMessage}"`);
        await handleGeminiChat(message, cleanMessage);
        return;
      }

      // 2. Handle Prefix Commands
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setTitle("🤖 ArenaX Bot - Help Menu")
          .setDescription("Main aapka friendly AI Assistant hoon! Check out all my commands organized by category below:")
          .setColor(0x5865F2)
          .addFields(
            { name: "🌐 General", value: `\`${prefix}help\` - Sab commands list\n\`${prefix}ping\` - Bot latency check karein\n\`${prefix}register\` - ArenaX registration link\n\`${prefix}website\` - ArenaX website link\n\`${prefix}info\` - ArenaX ke baare mein detailed info` },
            { name: "🏆 Tournaments (Real-Time)", value: `\`${prefix}tournaments\` - View active & upcoming esports matches (Firebase se)\n\`${prefix}leaderboard\` - Top 10 users rank display (Firebase se)` },
            { name: "🎉 Launch Fest", value: `\`${prefix}launchfest\` - Launch Fest event banner and info\n\`${prefix}dailyrewards\` - Daily streak login rewards table\n\`${prefix}tasks\` - Daily tasks list to earn AX points\n\`${prefix}refer\` - Referral system link and rewards\n\`${prefix}prize\` - Weekly tournaments prize pool details` },
            { name: "🎲 Fun Games", value: `\`${prefix}roll\` - Generate random number 1-100\n\`${prefix}coinflip\` - Flip a coin (Heads/Tails)\n\`${prefix}8ball <question>\` - Magic 8 Ball response\n\`${prefix}rps <rock|paper|scissors>\` - Play with bot\n\`${prefix}joke\` - Get a funny gaming/football joke\n\`${prefix}tip\` - Pro competitive gaming tips\n\`${prefix}quiz\` - Start interactive football trivia quiz (30s)` },
            { name: "👤 Profile & Server", value: `\`${prefix}avatar\` or \`${prefix}avatar @user\` - High-res avatar picture\n\`${prefix}afk <reason>\` - Go AFK with a status\n\`${prefix}serverinfo\` - Current Discord server info\n\`${prefix}rules\` - Server rules list\n\`${prefix}maintenance\` - Show maintenance status` },
            { name: "🔧 Admin Only", value: `\`${prefix}setmaintenance <on/off>\` - Toggle maintenance mode\n\`${prefix}setwelcome <#channel>\` - Set welcome channel (\`${prefix}welcome\` alias, \`disable\` to turn off)\n\`${prefix}announce <#channel> <message>\` - Broadcast announcement\n\`${prefix}alert <message>\` - Alert broadcast with @everyone ping\n\`${prefix}warn @user <reason>\` - Send warning to a user\n\`${prefix}clear <count>\` - Delete messages in bulk\n\`${prefix}slowmode <seconds>\` - Manage channel slowmode` }
          )
          .setFooter({ text: "Mention me (@Bot) directly to chat with Gemini 3.5 AI!", iconURL: client?.user?.displayAvatarURL() })
          .setTimestamp();

        await message.reply({ embeds: [helpEmbed] });
        addBotLog(`Executed help command for ${message.author.tag}`);
      } 
      else if (commandName === 'status') {
        botStats.ping = client.ws.ping;
        const statusEmbed = new EmbedBuilder()
          .setTitle("📊 Bot Operational Status")
          .setColor(0x2ECC71)
          .addFields(
            { name: "Ping / Latency", value: `⚡ \`${client.ws.ping}ms\``, inline: true },
            { name: "Servers", value: `🏠 \`${client.guilds.cache.size}\` Guilds`, inline: true },
            { name: "Total Users", value: `👥 \`${botStats.usersCount}\` Members`, inline: true },
            { name: "AI Engine", value: "🧠 `Gemini 3.5 Flash` (Active)", inline: false }
          )
          .setTimestamp();
        await message.reply({ embeds: [statusEmbed] });
        addBotLog(`Executed status command for ${message.author.tag}`);
      } 
      else if (commandName === 'ping') {
        const pingEmbed = new EmbedBuilder()
          .setTitle("🏓 Pong!")
          .setColor(0x2ECC71)
          .setDescription(`⚡ **Latency:** \`${client.ws.ping}ms\`\n🧠 **Gemini API:** \`Online\``)
          .setTimestamp();
        await message.reply({ embeds: [pingEmbed] });
        addBotLog(`Executed ping command by ${message.author.tag}`);
      }
      else if (commandName === 'register') {
        const regEmbed = new EmbedBuilder()
          .setTitle("🎮 Register for ArenaX!")
          .setDescription("Join the ultimate gaming revolution! Register on ArenaX, complete tasks, play games, and compete in free tournaments to win AX Coins!")
          .addFields(
            { name: "🔗 Registration Link", value: "[Click Here to Register Now!](https://kpllahore123-maker.github.io/arenaX/)" }
          )
          .setColor(0xE8404A)
          .setFooter({ text: "ArenaX Ecosystem" })
          .setTimestamp();
        await message.reply({ embeds: [regEmbed] });
        addBotLog(`Executed register command by ${message.author.tag}`);
      }
      else if (commandName === 'website') {
        const webEmbed = new EmbedBuilder()
          .setTitle("🌐 ArenaX Official Website")
          .setDescription("Check out active tournaments, view leaderboards, connect with teammates, and browse the reward store!")
          .addFields(
            { name: "🔗 Website Link", value: "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)" }
          )
          .setColor(0x3498DB)
          .setFooter({ text: "ArenaX Esports Platform" })
          .setTimestamp();
        await message.reply({ embeds: [webEmbed] });
        addBotLog(`Executed website command by ${message.author.tag}`);
      }
      else if (commandName === 'info') {
        const infoEmbed = new EmbedBuilder()
          .setTitle("ℹ️ About ArenaX")
          .setDescription("**ArenaX** is a cutting-edge web3 gaming and esports ecosystem. We bring competitive gaming to your fingertips with exciting features:\n\n" +
            "🏆 **E-Sports Tournaments:** Participate in custom, high-stakes matches and premium tournaments for free.\n" +
            "🎁 **Daily Mission Hub:** Complete social media and in-app daily tasks to gather AX Coin reward points.\n" +
            "📅 **Daily Rewards:** Login daily to maintain your active login streak and collect AX bonuses.\n" +
            "👥 **Referral System:** Refer gaming friends and claim 20 AX per person!\n\n" +
            "*Empowering gamers worldwide to level up, build custom communities, and win big!*")
          .setColor(0x9B59B6)
          .setFooter({ text: "ArenaX Information" })
          .setTimestamp();
        await message.reply({ embeds: [infoEmbed] });
        addBotLog(`Executed info command by ${message.author.tag}`);
      }
      else if (commandName === 'tournaments') {
        try {
          const q = query(collection(db, 'tournaments'));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            await message.reply("⚠️ No tournaments found in ArenaX database at the moment.");
            return;
          }

          const tourEmbed = new EmbedBuilder()
            .setTitle("🏆 ArenaX Tournaments List")
            .setDescription("Showing all registered tournament matches fetched in real-time from Firestore:")
            .setColor(0xE8404A)
            .setTimestamp();

          let count = 0;
          snapshot.forEach(doc => {
            if (count >= 10) return;
            const data = doc.data();
            const statusEmoji = data.status === 'live' ? '🔴 LIVE' : data.status === 'ended' ? '🏁 Ended' : '📅 Upcoming';
            tourEmbed.addFields({
              name: `🔹 ${data.name || 'Unnamed Tournament'}`,
              value: `🎮 **Game:** ${data.game || 'Grand RP'}\n💰 **Prize:** \`${data.prize || 'TBD'}\` | 🎫 **Fee:** \`${data.entryFee || 'Free'}\`\n👥 **Slots:** \`${data.registered || 0}/${data.maxPlayers || 32}\`\n⚡ **Status:** \`${statusEmoji}\` | 📅 **Date:** \`${data.date || 'TBA'} - ${data.time || 'TBA'}\``,
              inline: false
            });
            count++;
          });

          await message.reply({ embeds: [tourEmbed] });
          addBotLog(`Executed tournaments command by ${message.author.tag} (Found ${snapshot.size} tournaments)`);
        } catch (err) {
          addBotLog("Error fetching tournaments: " + (err as Error).message);
          await message.reply("❌ Failed to fetch tournaments from database.");
        }
      }
      else if (commandName === 'leaderboard') {
        try {
          const qLeaders = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(10));
          const snapshot = await getDocs(qLeaders);

          if (snapshot.empty) {
            await message.reply("⚠️ No registered users found in the leaderboard.");
            return;
          }

          const leadEmbed = new EmbedBuilder()
            .setTitle("👑 ArenaX Global Leaderboard")
            .setDescription("Top 10 gamers based on active **AX Coin Balance** (Fetched from Firestore):")
            .setColor(0xF1C40F)
            .setTimestamp();

          let descriptionText = "";
          let rank = 1;
          snapshot.forEach(doc => {
            const data = doc.data();
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `\`#${rank}\``;
            const handleText = data.handle ? ` (@${data.handle})` : "";
            descriptionText += `${medal} **${data.name || 'Unknown Player'}**${handleText}\n👉 Balance: \`${(data.balance || 0).toLocaleString()} AX\`\n\n`;
            rank++;
          });

          leadEmbed.setDescription(descriptionText || "No active participants yet.");
          await message.reply({ embeds: [leadEmbed] });
          addBotLog(`Executed leaderboard command by ${message.author.tag}`);
        } catch (err) {
          addBotLog("Error fetching leaderboard: " + (err as Error).message);
          await message.reply("❌ Failed to load the leaderboard from database.");
        }
      }
      else if (commandName === 'roll') {
        const rolled = Math.floor(Math.random() * 100) + 1;
        await message.reply(`🎲 **${message.author.username}** rolled a **${rolled}**! (1-100)`);
        addBotLog(`Executed roll command by ${message.author.tag}: ${rolled}`);
      }
      else if (commandName === 'coinflip') {
        const side = Math.random() < 0.5 ? "Heads" : "Tails";
        await message.reply(`🪙 **${message.author.username}** flipped a coin and got: **${side}**!`);
        addBotLog(`Executed coinflip command by ${message.author.tag}: ${side}`);
      }
      else if (commandName === '8ball') {
        const question = args.join(' ');
        if (!question) {
          await message.reply(`⚠️ Usage: \`${prefix}8ball <your question>\``);
          return;
        }
        const answers = [
          "Yes, definitely! 🟢",
          "It is decidedly so! ✔️",
          "Most likely! 👍",
          "Signs point to yes! 👌",
          "Reply hazy, try again... 🔄",
          "Ask again later... ⏳",
          "Better not tell you now... 🤫",
          "My sources say no. ❌",
          "Very doubtful. ⚠️",
          "No way! 🚫"
        ];
        const choice = answers[Math.floor(Math.random() * answers.length)];
        await message.reply(`🔮 **Question:** *${question}*\n🎱 **Magic 8-Ball:** ${choice}`);
        addBotLog(`Executed 8ball command by ${message.author.tag}`);
      }
      else if (commandName === 'rps') {
        const rpsChoices = ["rock", "paper", "scissors"];
        const userChoice = args[0]?.toLowerCase();
        if (!userChoice || !rpsChoices.includes(userChoice)) {
          await message.reply(`⚠️ Usage: \`${prefix}rps <rock|paper|scissors>\``);
          return;
        }
        const botChoice = rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
        
        let userEmoji = userChoice === 'rock' ? '✊ Rock' : userChoice === 'paper' ? '✋ Paper' : '✌️ Scissors';
        let botEmoji = botChoice === 'rock' ? '✊ Rock' : botChoice === 'paper' ? '✋ Paper' : '✌️ Scissors';

        let rpsResult = "";
        if (userChoice === botChoice) {
          rpsResult = "It's a draw! 🤝";
        } else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) {
          rpsResult = "You win! 🎉";
        } else {
          rpsResult = "Bot wins! 🤖";
        }

        const rpsEmbed = new EmbedBuilder()
          .setTitle("🎮 Rock Paper Scissors Game")
          .setColor(0x3498DB)
          .addFields(
            { name: "👤 Your Move", value: userEmoji, inline: true },
            { name: "🤖 Bot's Move", value: botEmoji, inline: true },
            { name: "🏁 Result", value: `**${rpsResult}**`, inline: false }
          )
          .setTimestamp();
        await message.reply({ embeds: [rpsEmbed] });
        addBotLog(`Executed rps command by ${message.author.tag}`);
      }
      else if (commandName === 'joke') {
        const gamingJokes = [
          "Why do gamers hate nature? Too many bugs! 🐛🎮",
          "Why are players so bad at football? Because they're always controller-locked! 🎮⚽",
          "Why did the football player go to the bank? To get his quarter back! 🏦⚽",
          "What is a gamer's favorite school subject? Console-ing class! 💻",
          "How do football players stay cool? They stand next to the fans! 🧊⚽",
          "Why was the computer cold? It left its Windows open! 🪟🤖",
          "What is a soccer player's favorite tea? Penal-tea! ☕⚽",
          "Why did the gamer cross the road? To render the other side! 🛣️"
        ];
        const joke = gamingJokes[Math.floor(Math.random() * gamingJokes.length)];
        await message.reply(`😂 **Joke:** ${joke}`);
        addBotLog(`Executed joke command by ${message.author.tag}`);
      }
      else if (commandName === 'tip') {
        const gamingTips = [
          "🔥 Practice daily to muscle-memorize your aim and button configurations!",
          "🎧 A good gaming headset can help you hear enemy footsteps and location cues perfectly.",
          "💧 Stay hydrated! Drinking water improves focus, reaction time, and physical stamina.",
          "🗺️ Map awareness is key! Always check your minimap to stay ahead of enemy rotations.",
          "🗣️ Communicate politely with your team. Good coordination wins more matches than solo play!",
          "🧘 Take short 5-minute breaks between matches to avoid fatigue and stay tilt-free.",
          "⚽ In football trivia, team performance stats and key player positions are crucial to analyze.",
          "🏆 Review your match replays! Analyzing your own deaths/mistakes is the fastest way to get better."
        ];
        const tip = gamingTips[Math.floor(Math.random() * gamingTips.length)];
        await message.reply(`💡 **Pro Tip:** ${tip}`);
        addBotLog(`Executed tip command by ${message.author.tag}`);
      }
      else if (commandName === 'quiz') {
        if (activeQuizzes.has(message.channel.id)) {
          await message.reply("⚠️ An active quiz is already running in this channel! Guess the answer first.");
          return;
        }

        const triviaIndex = Math.floor(Math.random() * triviaPool.length);
        const trivia = triviaPool[triviaIndex];

        const quizEmbed = new EmbedBuilder()
          .setTitle("⚽ ArenaX Football Trivia Quiz!")
          .setDescription(`**Question:**\n${trivia.q}\n\n⏱️ You have **30 seconds** to type the correct answer in the chat!`)
          .setColor(0xF1C40F)
          .setFooter({ text: "Type the answer below — first correct response wins!" })
          .setTimestamp();

        const channelId = message.channel.id;
        const qTimeout = setTimeout(async () => {
          if (activeQuizzes.has(channelId)) {
            activeQuizzes.delete(channelId);
            const timeUpEmbed = new EmbedBuilder()
              .setTitle("⏰ Time's Up!")
              .setDescription(`Nobody guessed the correct answer in time.\n\n👉 The correct answer was: **${trivia.correctText}**`)
              .setColor(0xE74C3C)
              .setTimestamp();
            await message.channel.send({ embeds: [timeUpEmbed] });
          }
        }, 30000);

        activeQuizzes.set(channelId, {
          question: trivia.q,
          answers: trivia.a,
          correctAnswerText: trivia.correctText,
          timeout: qTimeout
        });

        await message.reply({ embeds: [quizEmbed] });
        addBotLog(`Started interactive football quiz in channel ${channelId} by request of ${message.author.tag}`);
      }
      else if (commandName === 'avatar') {
        const targetUser = message.mentions.users.first() || message.author;
        const avEmbed = new EmbedBuilder()
          .setTitle(`${targetUser.username}'s Avatar`)
          .setImage(targetUser.displayAvatarURL({ size: 1024 }))
          .setColor(0x3498DB)
          .setTimestamp();
        await message.reply({ embeds: [avEmbed] });
        addBotLog(`Executed avatar command by ${message.author.tag} for ${targetUser.tag}`);
      }
      else if (commandName === 'afk') {
        const reason = args.join(' ') || "No reason specified";
        afkUsers.set(message.author.id, {
          reason: reason,
          timestamp: Date.now()
        });
        await message.reply(`💤 **${message.author.username}** has gone AFK: *${reason}*`);
        addBotLog(`User ${message.author.tag} went AFK for: "${reason}"`);
      }
      else if (commandName === 'serverinfo') {
        const guild = message.guild;
        if (!guild) {
          await message.reply("❌ This command can only be used in a Discord server.");
          return;
        }
        const serverEmbed = new EmbedBuilder()
          .setTitle(`🖥️ Server Information: ${guild.name}`)
          .setThumbnail(guild.iconURL() || '')
          .setColor(0x3498DB)
          .addFields(
            { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
            { name: "👥 Members Count", value: `\`${guild.memberCount}\``, inline: true },
            { name: "📅 Created At", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "⚡ Premium Boosts", value: `\`${guild.premiumSubscriptionCount || 0}\` (Tier ${guild.premiumTier})`, inline: true },
            { name: "Channels Size", value: `\`${guild.channels.cache.size}\` channels`, inline: true },
            { name: "Emojis Size", value: `\`${guild.emojis.cache.size}\` emojis`, inline: true }
          )
          .setFooter({ text: `Server Guild ID: ${guild.id}` })
          .setTimestamp();
        await message.reply({ embeds: [serverEmbed] });
        addBotLog(`Executed serverinfo command by ${message.author.tag}`);
      }
      else if (commandName === 'rules') {
        const rulesEmbed = new EmbedBuilder()
          .setTitle("📜 ArenaX Discord Server Rules")
          .setDescription("Welcome to the official **ArenaX Discord Server**! Please read and follow our guidelines to maintain a great atmosphere:")
          .setColor(0xE8404A)
          .addFields(
            { name: "1. Respect All Members", value: "Strictly no toxicity, hate speech, bullying, racism, or spamming." },
            { name: "2. Keep Topics Relevant", value: "Use designated channels appropriately (e.g. general discussion in #general, support in ticket)." },
            { name: "3. Play Fair", value: "Any form of hacking, exploiting match flaws, or sharing cheating tools will result in a ban." },
            { name: "4. No Direct Advertisement", value: "Do not promote other servers, unauthorized referral schemes, or outside platforms without approval." },
            { name: "5. Follow Moderator Directions", value: "Moderator instructions must be respected at all times." }
          )
          .setFooter({ text: "Enjoy competing! Team ArenaX" })
          .setTimestamp();
        await message.reply({ embeds: [rulesEmbed] });
        addBotLog(`Executed rules command by ${message.author.tag}`);
      }
      else if (commandName === 'maintenance') {
        const conf = getBotConfig();
        const activeMaint = !!conf.maintenanceMode;
        const maintEmbed = new EmbedBuilder()
          .setTitle("🔧 ArenaX Maintenance Status")
          .setDescription(activeMaint 
            ? "⚠️ **ArenaX Services are currently in Maintenance Mode!** Our developers are working hard behind the scenes to upgrade features. Some functionalities may be temporarily offline."
            : "🟢 **All systems are operational!** ArenaX servers, matchmaking, rewards shop, and the web client are running perfectly."
          )
          .setColor(activeMaint ? 0xE74C3C : 0x2ECC71)
          .setTimestamp();
        await message.reply({ embeds: [maintEmbed] });
        addBotLog(`Executed maintenance command by ${message.author.tag}`);
      }
      else if (commandName === 'setmaintenance') {
        const member = message.member;
        if (!member || (!member.permissions.has('Administrator') && !member.permissions.has('ManageGuild'))) {
          await message.reply("❌ Only server administrators can toggle maintenance status.");
          return;
        }
        const option = args[0]?.toLowerCase();
        if (option !== 'on' && option !== 'off') {
          await message.reply(`⚠️ Usage: \`${prefix}setmaintenance <on|off>\``);
          return;
        }
        const state = option === 'on';
        saveBotConfig({ maintenanceMode: state });
        await message.reply(`✅ Maintenance mode has been successfully turned **${state ? 'ON' : 'OFF'}**.`);
        addBotLog(`Maintenance mode updated to ${state ? 'ON' : 'OFF'} by ${message.author.tag}`);
      }
      else if (commandName === 'setwelcome' || commandName === 'welcome') {
        const member = message.member;
        if (!member || (!member.permissions.has('ManageChannels') && !member.permissions.has('Administrator'))) {
          await message.reply("❌ You do not have permissions (`Manage Channels` or `Administrator`) to set the welcome channel.");
          return;
        }
        
        const targetChannel = message.mentions.channels.first();
        const option = args[0]?.toLowerCase();
        
        if (option === 'disable' || option === 'clear' || option === 'off') {
          saveBotConfig({ welcomeChannelId: "" });
          await message.reply("✅ Welcome channel has been disabled. New member joins will no longer trigger welcome messages.");
          addBotLog(`Welcome channel disabled by ${message.author.tag}`);
          return;
        }

        if (!targetChannel) {
          const config = getBotConfig();
          if (config.welcomeChannelId) {
            await message.reply(`ℹ️ Current welcome channel is <#${config.welcomeChannelId}>.\nTo change it, mention another channel: \`${prefix}setwelcome <#channel>\`\nTo disable: \`${prefix}setwelcome disable\``);
          } else {
            await message.reply(`⚠️ Please mention a channel to set as welcome channel! Usage: \`${prefix}setwelcome <#channel>\` or \`${prefix}setwelcome disable\``);
          }
          return;
        }

        saveBotConfig({ welcomeChannelId: targetChannel.id });
        await message.reply(`✅ Welcome channel has been successfully set to ${targetChannel}! When a new user joins, I will post a welcome card there.`);
        addBotLog(`Welcome channel set to #${(targetChannel as any).name} (${targetChannel.id}) by ${message.author.tag}`);
      }
      else if (commandName === 'announce') {
        const member = message.member;
        if (!member || (!member.permissions.has('ManageChannels') && !member.permissions.has('Administrator'))) {
          await message.reply("❌ You do not have permissions (`Manage Channels`) to make announcements.");
          return;
        }
        const targetChannel = message.mentions.channels.first();
        const announceMsg = args.slice(1).join(' ');
        if (!targetChannel || !announceMsg) {
          await message.reply(`⚠️ Usage: \`${prefix}announce <#channel> <message>\``);
          return;
        }
        const annEmbed = new EmbedBuilder()
          .setTitle("📢 ArenaX Server Announcement")
          .setDescription(announceMsg)
          .setColor(0x3498DB)
          .setFooter({ text: `Announced by ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
          .setTimestamp();
        await (targetChannel as any).send({ embeds: [annEmbed] });
        await message.reply(`✅ Successfully broadcasted announcement to ${targetChannel}!`);
        addBotLog(`Executed announce command in channel ${(targetChannel as any).name} by ${message.author.tag}`);
      }
      else if (commandName === 'alert') {
        const member = message.member;
        if (!member || (!member.permissions.has('MentionEveryone') && !member.permissions.has('Administrator'))) {
          await message.reply("❌ You need `Mention Everyone` permissions to broadcast alerts.");
          return;
        }
        const alertMsg = args.join(' ');
        if (!alertMsg) {
          await message.reply(`⚠️ Usage: \`${prefix}alert <message>\``);
          return;
        }
        const alertEmbed = new EmbedBuilder()
          .setTitle("🚨 URGENT SERVER BROADCAST")
          .setDescription(alertMsg)
          .setColor(0xE74C3C)
          .setFooter({ text: `Broadcasted by ${message.author.username}` })
          .setTimestamp();
        await message.channel.send({ content: "@everyone", embeds: [alertEmbed] });
        addBotLog(`Executed alert command in channel by ${message.author.tag}`);
      }
      else if (commandName === 'warn') {
        const member = message.member;
        if (!member || (!member.permissions.has('KickMembers') && !member.permissions.has('Administrator'))) {
          await message.reply("❌ You do not have moderator permission (`Kick Members`) to warn users.");
          return;
        }
        const targetUser = message.mentions.users.first();
        const reason = args.slice(1).join(' ');
        if (!targetUser || !reason) {
          await message.reply(`⚠️ Usage: \`${prefix}warn @user <reason>\``);
          return;
        }
        addBotLog(`User ${targetUser.tag} warned by moderator ${message.author.tag} for: "${reason}"`);
        const warnEmbed = new EmbedBuilder()
          .setTitle("⚠️ Warning Logged")
          .setDescription(`**User:** ${targetUser}\n**Moderator:** ${message.author}\n**Reason:** ${reason}`)
          .setColor(0xE67E22)
          .setTimestamp();
        await message.channel.send({ embeds: [warnEmbed] });
        try {
          await targetUser.send(`⚠️ You have been warned in **${message.guild?.name}** by moderator ${message.author.username} for: **${reason}**`);
        } catch (e) {
          // DM blocked
        }
      }
      else if (commandName === 'slowmode') {
        const member = message.member;
        if (!member || (!member.permissions.has('ManageChannels') && !member.permissions.has('Administrator'))) {
          await message.reply("❌ You do not have permissions (`Manage Channels`) to set slowmode.");
          return;
        }
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0) {
          await message.reply(`⚠️ Usage: \`${prefix}slowmode <seconds>\``);
          return;
        }
        await (message.channel as any).setRateLimitPerUser(seconds);
        await message.reply(seconds === 0 
          ? "🟢 Slowmode has been disabled for this channel." 
          : `⏱️ Slowmode set to **${seconds} seconds** per message.`
        );
        addBotLog(`Executed slowmode command (set to ${seconds}s) by ${message.author.tag}`);
      }
      else if (commandName === 'ask') {
        const queryText = args.join(' ');
        if (!queryText) {
          await message.reply(`⚠️ Usage: \`${prefix}ask <sawaal / question>\``);
          return;
        }
        addBotLog(`Executed ask command by ${message.author.tag}: "${queryText}"`);
        await handleGeminiChat(message, queryText);
      } 
      else if (commandName === 'launchfest') {
        addBotLog(`Executed launchfest command by ${message.author.tag}`);
        await message.reply({ embeds: [createLaunchFestEmbed(client.user)] });
      }
      else if (commandName === 'dailyrewards') {
        addBotLog(`Executed dailyrewards command by ${message.author.tag}`);
        await message.reply({ embeds: [createDailyRewardsEmbed(client.user)] });
      }
      else if (commandName === 'tasks') {
        addBotLog(`Executed tasks command by ${message.author.tag}`);
        await message.reply({ embeds: [createTasksEmbed(client.user)] });
      }
      else if (commandName === 'refer') {
        addBotLog(`Executed refer command by ${message.author.tag}`);
        await message.reply({ embeds: [createReferEmbed(client.user)] });
      }
      else if (commandName === 'prize') {
        addBotLog(`Executed prize command by ${message.author.tag}`);
        await message.reply({ embeds: [createPrizeEmbed(client.user)] });
      }
      else if (commandName === 'clear') {
        // Simple mod check
        const member = message.member;
        if (!member || !member.permissions.has('ManageMessages')) {
          await message.reply("❌ Aapke paas `Manage Messages` permission nahi hai is command ko use karne ke liye.");
          return;
        }

        const deleteCount = parseInt(args[0]);
        if (isNaN(deleteCount) || deleteCount < 1 || deleteCount > 100) {
          await message.reply("⚠️ Please specify a valid number between 1 and 100.");
          return;
        }

        await message.channel.messages.fetch({ limit: deleteCount + 1 })
          .then(messages => {
            (message.channel as any).bulkDelete(messages);
          });

        const reply = await message.channel.send(`🧹 Cleared **${deleteCount}** messages!`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        addBotLog(`Cleared ${deleteCount} messages in channel by request of ${message.author.tag}`);
      }
    } catch (err) {
      addBotLog(`Error running prefix command: ` + (err as Error).message);
      await message.reply("❌ Kuch error aaya command run karte waqt.");
    }
  });

  // Slash Commands Interaction
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    botStats.commandsExecuted++;
    const { commandName } = interaction;

    try {
      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setTitle("🤖 ArenaX Bot - Slash Help Menu")
          .setDescription("Main aapka friendly AI Assistant hoon! Check out all my slash commands organized by category below:")
          .setColor(0x5865F2)
          .addFields(
            { name: "🌐 General", value: "`/help` - Sab commands list\n`/ping` - Bot latency check\n`/register` - ArenaX registration link\n`/website` - ArenaX website link\n`/info` - ArenaX detailed information" },
            { name: "🏆 Tournaments (Real-Time)", value: "`/tournaments` - View active & upcoming esports matches (Firebase se)\n`/leaderboard` - Top 10 users rank display (Firebase se)" },
            { name: "🎉 Launch Fest", value: "`/launchfest` - Launch Fest event banner and info\n`/dailyrewards` - Daily streak rewards table\n`/tasks` - Daily tasks list to earn AX points\n`/refer` - Referral system info and link\n`/prize` - Weekly tournaments prize pool details" },
            { name: "🎲 Fun Games", value: "`/roll` - Generate random number 1-100\n`/coinflip` - Flip a coin (Heads/Tails)\n`/8ball <question>` - Magic 8 Ball response\n`/rps <rock|paper|scissors>` - Play rock paper scissors with bot\n`/joke` - Get a funny gaming/football joke\n`/tip` - Pro competitive gaming tips\n`/quiz` - Start interactive football trivia quiz (30s)" },
            { name: "👤 Profile & Server", value: "`/avatar <@user>` - High-res avatar picture of a user or yourself\n`/afk <reason>` - Go AFK with a custom status\n`/serverinfo` - Current Discord server information\n`/rules` - Server guidelines and rules\n`/maintenance` - Show system maintenance status" },
            { name: "🔧 Admin Only", value: "`/setmaintenance <on/off>` - Toggle maintenance mode\n`/setwelcome <#channel>` - Set welcome channel (`/setwelcome action: Disable` to turn off)\n`/announce <#channel> <message>` - Broadcast server announcement\n`/alert <message>` - Alert broadcast with @everyone ping\n`/warn <@user> <reason>` - Log and DM a warning to a user\n`/clear <amount>` - Delete messages in bulk\n`/slowmode <seconds>` - Manage channel slowmode rate limit" }
          )
          .setFooter({ text: "Mention me (@Bot) directly to chat with Gemini 3.5 AI!", iconURL: client?.user?.displayAvatarURL() })
          .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
        addBotLog(`Slash command /help executed by ${interaction.user.tag}`);
      } 
      else if (commandName === 'status') {
        botStats.ping = client!.ws.ping;
        const statusEmbed = new EmbedBuilder()
          .setTitle("📊 Bot Status & Metrics")
          .setColor(0x2ECC71)
          .addFields(
            { name: "Bot Latency", value: `⚡ \`${client!.ws.ping}ms\``, inline: true },
            { name: "Servers Connected", value: `🏠 \`${client!.guilds.cache.size}\` Guilds`, inline: true },
            { name: "Total Users Served", value: `👥 \`${botStats.usersCount}\` Members`, inline: true },
            { name: "Engine Version", value: "🧠 `Gemini 3.5 Flash`", inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [statusEmbed] });
        addBotLog(`Slash command /status executed by ${interaction.user.tag}`);
      } 
      else if (commandName === 'ping') {
        const pingEmbed = new EmbedBuilder()
          .setTitle("🏓 Pong!")
          .setColor(0x2ECC71)
          .setDescription(`⚡ **Latency:** \`${client!.ws.ping}ms\`\n🧠 **Gemini API:** \`Online\``)
          .setTimestamp();
        await interaction.reply({ embeds: [pingEmbed] });
        addBotLog(`Slash command /ping executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'register') {
        const regEmbed = new EmbedBuilder()
          .setTitle("🎮 Register for ArenaX!")
          .setDescription("Join the ultimate gaming revolution! Register on ArenaX, complete tasks, play games, and compete in free tournaments to win AX Coins!")
          .addFields(
            { name: "🔗 Registration Link", value: "[Click Here to Register Now!](https://kpllahore123-maker.github.io/arenaX/)" }
          )
          .setColor(0xE8404A)
          .setFooter({ text: "ArenaX Ecosystem" })
          .setTimestamp();
        await interaction.reply({ embeds: [regEmbed] });
        addBotLog(`Slash command /register executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'website') {
        const webEmbed = new EmbedBuilder()
          .setTitle("🌐 ArenaX Official Website")
          .setDescription("Check out active tournaments, view leaderboards, connect with teammates, and browse the reward store!")
          .addFields(
            { name: "🔗 Website Link", value: "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)" }
          )
          .setColor(0x3498DB)
          .setFooter({ text: "ArenaX Esports Platform" })
          .setTimestamp();
        await interaction.reply({ embeds: [webEmbed] });
        addBotLog(`Slash command /website executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'info') {
        const infoEmbed = new EmbedBuilder()
          .setTitle("ℹ️ About ArenaX")
          .setDescription("**ArenaX** is a cutting-edge web3 gaming and esports ecosystem. We bring competitive gaming to your fingertips with exciting features:\n\n" +
            "🏆 **E-Sports Tournaments:** Participate in custom, high-stakes matches and premium tournaments for free.\n" +
            "🎁 **Daily Mission Hub:** Complete social media and in-app daily tasks to gather AX Coin reward points.\n" +
            "📅 **Daily Rewards:** Login daily to maintain your active login streak and collect AX bonuses.\n" +
            "👥 **Referral System:** Refer gaming friends and claim 20 AX per person!\n\n" +
            "*Empowering gamers worldwide to level up, build custom communities, and win big!*")
          .setColor(0x9B59B6)
          .setFooter({ text: "ArenaX Information" })
          .setTimestamp();
        await interaction.reply({ embeds: [infoEmbed] });
        addBotLog(`Slash command /info executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'tournaments') {
        try {
          const q = query(collection(db, 'tournaments'));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            await interaction.reply({ content: "⚠️ No tournaments found in ArenaX database at the moment.", ephemeral: true });
            return;
          }

          const tourEmbed = new EmbedBuilder()
            .setTitle("🏆 ArenaX Tournaments List")
            .setDescription("Showing all registered tournament matches fetched in real-time from Firestore:")
            .setColor(0xE8404A)
            .setTimestamp();

          let count = 0;
          snapshot.forEach(doc => {
            if (count >= 10) return;
            const data = doc.data();
            const statusEmoji = data.status === 'live' ? '🔴 LIVE' : data.status === 'ended' ? '🏁 Ended' : '📅 Upcoming';
            tourEmbed.addFields({
              name: `🔹 ${data.name || 'Unnamed Tournament'}`,
              value: `🎮 **Game:** ${data.game || 'Grand RP'}\n💰 **Prize:** \`${data.prize || 'TBD'}\` | 🎫 **Fee:** \`${data.entryFee || 'Free'}\`\n👥 **Slots:** \`${data.registered || 0}/${data.maxPlayers || 32}\`\n⚡ **Status:** \`${statusEmoji}\` | 📅 **Date:** \`${data.date || 'TBA'} - ${data.time || 'TBA'}\``,
              inline: false
            });
            count++;
          });

          await interaction.reply({ embeds: [tourEmbed] });
          addBotLog(`Slash command /tournaments executed by ${interaction.user.tag}`);
        } catch (err) {
          addBotLog("Error fetching tournaments (slash): " + (err as Error).message);
          await interaction.reply({ content: "❌ Failed to fetch tournaments from database.", ephemeral: true });
        }
      }
      else if (commandName === 'leaderboard') {
        try {
          const qLeaders = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(10));
          const snapshot = await getDocs(qLeaders);

          if (snapshot.empty) {
            await interaction.reply({ content: "⚠️ No registered users found in the leaderboard.", ephemeral: true });
            return;
          }

          const leadEmbed = new EmbedBuilder()
            .setTitle("👑 ArenaX Global Leaderboard")
            .setDescription("Top 10 gamers based on active **AX Coin Balance** (Fetched from Firestore):")
            .setColor(0xF1C40F)
            .setTimestamp();

          let descriptionText = "";
          let rank = 1;
          snapshot.forEach(doc => {
            const data = doc.data();
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `\`#${rank}\``;
            const handleText = data.handle ? ` (@${data.handle})` : "";
            descriptionText += `${medal} **${data.name || 'Unknown Player'}**${handleText}\n👉 Balance: \`${(data.balance || 0).toLocaleString()} AX\`\n\n`;
            rank++;
          });

          leadEmbed.setDescription(descriptionText || "No active participants yet.");
          await interaction.reply({ embeds: [leadEmbed] });
          addBotLog(`Slash command /leaderboard executed by ${interaction.user.tag}`);
        } catch (err) {
          addBotLog("Error fetching leaderboard (slash): " + (err as Error).message);
          await interaction.reply({ content: "❌ Failed to load the leaderboard from database.", ephemeral: true });
        }
      }
      else if (commandName === 'roll') {
        const rolled = Math.floor(Math.random() * 100) + 1;
        await interaction.reply(`🎲 **${interaction.user.username}** rolled a **${rolled}**! (1-100)`);
        addBotLog(`Slash command /roll executed by ${interaction.user.tag}: ${rolled}`);
      }
      else if (commandName === 'coinflip') {
        const side = Math.random() < 0.5 ? "Heads" : "Tails";
        await interaction.reply(`🪙 **${interaction.user.username}** flipped a coin and got: **${side}**!`);
        addBotLog(`Slash command /coinflip executed by ${interaction.user.tag}: ${side}`);
      }
      else if (commandName === '8ball') {
        const question = interaction.options.getString('question', true);
        const answers = [
          "Yes, definitely! 🟢",
          "It is decidedly so! ✔️",
          "Most likely! 👍",
          "Signs point to yes! 👌",
          "Reply hazy, try again... 🔄",
          "Ask again later... ⏳",
          "Better not tell you now... 🤫",
          "My sources say no. ❌",
          "Very doubtful. ⚠️",
          "No way! 🚫"
        ];
        const choice = answers[Math.floor(Math.random() * answers.length)];
        await interaction.reply(`🔮 **Question:** *${question}*\n🎱 **Magic 8-Ball:** ${choice}`);
        addBotLog(`Slash command /8ball executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'rps') {
        const userChoice = interaction.options.getString('choice', true).toLowerCase();
        const rpsChoices = ["rock", "paper", "scissors"];
        const botChoice = rpsChoices[Math.floor(Math.random() * rpsChoices.length)];

        let userEmoji = userChoice === 'rock' ? '✊ Rock' : userChoice === 'paper' ? '✋ Paper' : '✌️ Scissors';
        let botEmoji = botChoice === 'rock' ? '✊ Rock' : botChoice === 'paper' ? '✋ Paper' : '✌️ Scissors';

        let rpsResult = "";
        if (userChoice === botChoice) {
          rpsResult = "It's a draw! 🤝";
        } else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) {
          rpsResult = "You win! 🎉";
        } else {
          rpsResult = "Bot wins! 🤖";
        }

        const rpsEmbed = new EmbedBuilder()
          .setTitle("🎮 Rock Paper Scissors Game")
          .setColor(0x3498DB)
          .addFields(
            { name: "👤 Your Move", value: userEmoji, inline: true },
            { name: "🤖 Bot's Move", value: botEmoji, inline: true },
            { name: "🏁 Result", value: `**${rpsResult}**`, inline: false }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [rpsEmbed] });
        addBotLog(`Slash command /rps executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'joke') {
        const gamingJokes = [
          "Why do gamers hate nature? Too many bugs! 🐛🎮",
          "Why are players so bad at football? Because they're always controller-locked! 🎮⚽",
          "Why did the football player go to the bank? To get his quarter back! 🏦⚽",
          "What is a gamer's favorite school subject? Console-ing class! 💻",
          "How do football players stay cool? They stand next to the fans! 🧊⚽",
          "Why was the computer cold? It left its Windows open! 🪟🤖",
          "What is a soccer player's favorite tea? Penal-tea! ☕⚽",
          "Why did the gamer cross the road? To render the other side! 🛣️"
        ];
        const joke = gamingJokes[Math.floor(Math.random() * gamingJokes.length)];
        await interaction.reply(`😂 **Joke:** ${joke}`);
        addBotLog(`Slash command /joke executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'tip') {
        const gamingTips = [
          "🔥 Practice daily to muscle-memorize your aim and button configurations!",
          "🎧 A good gaming headset can help you hear enemy footsteps and location cues perfectly.",
          "💧 Stay hydrated! Drinking water improves focus, reaction time, and physical stamina.",
          "🗺️ Map awareness is key! Always check your minimap to stay ahead of enemy rotations.",
          "🗣️ Communicate politely with your team. Good coordination wins more matches than solo play!",
          "🧘 Take short 5-minute breaks between matches to avoid fatigue and stay tilt-free.",
          "⚽ In football trivia, team performance stats and key player positions are crucial to analyze.",
          "🏆 Review your match replays! Analyzing your own deaths/mistakes is the fastest way to get better."
        ];
        const tip = gamingTips[Math.floor(Math.random() * gamingTips.length)];
        await interaction.reply(`💡 **Pro Tip:** ${tip}`);
        addBotLog(`Slash command /tip executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'quiz') {
        if (activeQuizzes.has(interaction.channelId!)) {
          await interaction.reply({ content: "⚠️ An active quiz is already running in this channel! Guess the answer first.", ephemeral: true });
          return;
        }

        const triviaIndex = Math.floor(Math.random() * triviaPool.length);
        const trivia = triviaPool[triviaIndex];

        const quizEmbed = new EmbedBuilder()
          .setTitle("⚽ ArenaX Football Trivia Quiz!")
          .setDescription(`**Question:**\n${trivia.q}\n\n⏱️ You have **30 seconds** to type the correct answer in the chat!`)
          .setColor(0xF1C40F)
          .setFooter({ text: "Type the answer below — first correct response wins!" })
          .setTimestamp();

        const channelId = interaction.channelId!;
        const qTimeout = setTimeout(async () => {
          if (activeQuizzes.has(channelId)) {
            activeQuizzes.delete(channelId);
            const timeUpEmbed = new EmbedBuilder()
              .setTitle("⏰ Time's Up!")
              .setDescription(`Nobody guessed the correct answer in time.\n\n👉 The correct answer was: **${trivia.correctText}**`)
              .setColor(0xE74C3C)
              .setTimestamp();
            await interaction.channel?.send({ embeds: [timeUpEmbed] });
          }
        }, 30000);

        activeQuizzes.set(channelId, {
          question: trivia.q,
          answers: trivia.a,
          correctAnswerText: trivia.correctText,
          timeout: qTimeout
        });

        await interaction.reply({ embeds: [quizEmbed] });
        addBotLog(`Started interactive slash quiz in channel ${channelId} by request of ${interaction.user.tag}`);
      }
      else if (commandName === 'avatar') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const avEmbed = new EmbedBuilder()
          .setTitle(`${targetUser.username}'s Avatar`)
          .setImage(targetUser.displayAvatarURL({ size: 1024 }))
          .setColor(0x3498DB)
          .setTimestamp();
        await interaction.reply({ embeds: [avEmbed] });
        addBotLog(`Slash command /avatar executed by ${interaction.user.tag} for ${targetUser.tag}`);
      }
      else if (commandName === 'afk') {
        const reason = interaction.options.getString('reason', true);
        afkUsers.set(interaction.user.id, {
          reason: reason,
          timestamp: Date.now()
        });
        await interaction.reply(`💤 **${interaction.user.username}** has gone AFK: *${reason}*`);
        addBotLog(`Slash user ${interaction.user.tag} went AFK for: "${reason}"`);
      }
      else if (commandName === 'serverinfo') {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: "❌ This command can only be used in a Discord server.", ephemeral: true });
          return;
        }
        const serverEmbed = new EmbedBuilder()
          .setTitle(`🖥️ Server Information: ${guild.name}`)
          .setThumbnail(guild.iconURL() || '')
          .setColor(0x3498DB)
          .addFields(
            { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
            { name: "👥 Members Count", value: `\`${guild.memberCount}\``, inline: true },
            { name: "📅 Created At", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "⚡ Premium Boosts", value: `\`${guild.premiumSubscriptionCount || 0}\` (Tier ${guild.premiumTier})`, inline: true },
            { name: "Channels Size", value: `\`${guild.channels.cache.size}\` channels`, inline: true },
            { name: "Emojis Size", value: `\`${guild.emojis.cache.size}\` emojis`, inline: true }
          )
          .setFooter({ text: `Server Guild ID: ${guild.id}` })
          .setTimestamp();
        await interaction.reply({ embeds: [serverEmbed] });
        addBotLog(`Slash command /serverinfo executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'rules') {
        const rulesEmbed = new EmbedBuilder()
          .setTitle("📜 ArenaX Discord Server Rules")
          .setDescription("Welcome to the official **ArenaX Discord Server**! Please read and follow our guidelines to maintain a great atmosphere:")
          .setColor(0xE8404A)
          .addFields(
            { name: "1. Respect All Members", value: "Strictly no toxicity, hate speech, bullying, racism, or spamming." },
            { name: "2. Keep Topics Relevant", value: "Use designated channels appropriately (e.g. general discussion in #general, support in ticket)." },
            { name: "3. Play Fair", value: "Any form of hacking, exploiting match flaws, or sharing cheating tools will result in a ban." },
            { name: "4. No Direct Advertisement", value: "Do not promote other servers, unauthorized referral schemes, or outside platforms without approval." },
            { name: "5. Follow Moderator Directions", value: "Moderator instructions must be respected at all times." }
          )
          .setFooter({ text: "Enjoy competing! Team ArenaX" })
          .setTimestamp();
        await interaction.reply({ embeds: [rulesEmbed] });
        addBotLog(`Slash command /rules executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'maintenance') {
        const conf = getBotConfig();
        const activeMaint = !!conf.maintenanceMode;
        const maintEmbed = new EmbedBuilder()
          .setTitle("🔧 ArenaX Maintenance Status")
          .setDescription(activeMaint 
            ? "⚠️ **ArenaX Services are currently in Maintenance Mode!** Our developers are working hard behind the scenes to upgrade features. Some functionalities may be temporarily offline."
            : "🟢 **All systems are operational!** ArenaX servers, matchmaking, rewards shop, and the web client are running perfectly."
          )
          .setColor(activeMaint ? 0xE74C3C : 0x2ECC71)
          .setTimestamp();
        await interaction.reply({ embeds: [maintEmbed] });
        addBotLog(`Slash command /maintenance executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'setmaintenance') {
        if (!interaction.memberPermissions?.has('Administrator') && !interaction.memberPermissions?.has('ManageGuild')) {
          await interaction.reply({ content: "❌ Only server administrators can toggle maintenance status.", ephemeral: true });
          return;
        }
        const stateStr = interaction.options.getString('mode', true);
        const state = stateStr === 'on';
        saveBotConfig({ maintenanceMode: state });
        await interaction.reply(`✅ Maintenance mode has been successfully turned **${state ? 'ON' : 'OFF'}**.`);
        addBotLog(`Maintenance mode updated to ${state ? 'ON' : 'OFF'} via slash by ${interaction.user.tag}`);
      }
      else if (commandName === 'setwelcome') {
        if (!interaction.memberPermissions?.has('ManageChannels') && !interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({ content: "❌ You do not have permissions (`Manage Channels` or `Administrator`) to set the welcome channel.", ephemeral: true });
          return;
        }

        const targetChannel = interaction.options.getChannel('channel');
        const action = interaction.options.getString('action');

        if (action === 'disable') {
          saveBotConfig({ welcomeChannelId: "" });
          await interaction.reply({ content: "✅ Welcome channel has been disabled. New member joins will no longer trigger welcome messages." });
          addBotLog(`Welcome channel disabled via slash by ${interaction.user.tag}`);
          return;
        }

        if (!targetChannel) {
          const config = getBotConfig();
          if (config.welcomeChannelId) {
            await interaction.reply({ content: `ℹ️ Current welcome channel is <#${config.welcomeChannelId}>.\nTo change it, specify a channel: \`/setwelcome channel: <#channel>\`\nTo disable: \`/setwelcome action: Disable\``, ephemeral: true });
          } else {
            await interaction.reply({ content: `⚠️ Please specify a channel option or action! Usage: \`/setwelcome channel: <#channel>\` or disable with action.`, ephemeral: true });
          }
          return;
        }

        saveBotConfig({ welcomeChannelId: targetChannel.id });
        await interaction.reply({ content: `✅ Welcome channel has been successfully set to ${targetChannel}! When a new user joins, I will post a welcome card there.` });
        addBotLog(`Welcome channel set to #${(targetChannel as any).name} (${targetChannel.id}) via slash by ${interaction.user.tag}`);
      }
      else if (commandName === 'announce') {
        if (!interaction.memberPermissions?.has('ManageChannels') && !interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({ content: "❌ You do not have permissions (`Manage Channels`) to make announcements.", ephemeral: true });
          return;
        }
        const targetChannel = interaction.options.getChannel('channel', true);
        const announceMsg = interaction.options.getString('message', true);

        const annEmbed = new EmbedBuilder()
          .setTitle("📢 ArenaX Server Announcement")
          .setDescription(announceMsg)
          .setColor(0x3498DB)
          .setFooter({ text: `Announced by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        await (targetChannel as any).send({ embeds: [annEmbed] });
        await interaction.reply({ content: `✅ Successfully broadcasted announcement to ${targetChannel}!`, ephemeral: true });
        addBotLog(`Slash /announce run in channel ${(targetChannel as any).name} by ${interaction.user.tag}`);
      }
      else if (commandName === 'alert') {
        if (!interaction.memberPermissions?.has('MentionEveryone') && !interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({ content: "❌ You need `Mention Everyone` permissions to broadcast alerts.", ephemeral: true });
          return;
        }
        const alertMsg = interaction.options.getString('message', true);
        const alertEmbed = new EmbedBuilder()
          .setTitle("🚨 URGENT SERVER BROADCAST")
          .setDescription(alertMsg)
          .setColor(0xE74C3C)
          .setFooter({ text: `Broadcasted by ${interaction.user.username}` })
          .setTimestamp();
        
        await interaction.reply({ content: "Broadcast sending...", ephemeral: true });
        await interaction.channel?.send({ content: "@everyone", embeds: [alertEmbed] });
        addBotLog(`Slash command /alert executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'warn') {
        if (!interaction.memberPermissions?.has('KickMembers') && !interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({ content: "❌ You do not have moderator permission (`Kick Members`) to warn users.", ephemeral: true });
          return;
        }
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        addBotLog(`User ${targetUser.tag} warned via slash by moderator ${interaction.user.tag} for: "${reason}"`);
        const warnEmbed = new EmbedBuilder()
          .setTitle("⚠️ Warning Logged")
          .setDescription(`**User:** ${targetUser}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`)
          .setColor(0xE67E22)
          .setTimestamp();
        
        await interaction.reply({ embeds: [warnEmbed] });
        try {
          await targetUser.send(`⚠️ You have been warned in **${interaction.guild?.name}** by moderator ${interaction.user.username} for: **${reason}**`);
        } catch (e) {
          // DM blocked
        }
      }
      else if (commandName === 'slowmode') {
        if (!interaction.memberPermissions?.has('ManageChannels') && !interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({ content: "❌ You do not have permissions (`Manage Channels`) to set slowmode.", ephemeral: true });
          return;
        }
        const seconds = interaction.options.getInteger('seconds', true);
        await (interaction.channel as any).setRateLimitPerUser(seconds);
        await interaction.reply(seconds === 0 
          ? "🟢 Slowmode has been disabled for this channel." 
          : `⏱️ Slowmode set to **${seconds} seconds** per message.`
        );
        addBotLog(`Slash command /slowmode executed (set to ${seconds}s) by ${interaction.user.tag}`);
      }
      else if (commandName === 'ask') {
        const queryText = interaction.options.getString('prompt', true);
        
        // Defer response since AI takes a brief second
        await interaction.deferReply();
        addBotLog(`Slash command /ask executed by ${interaction.user.tag}: "${queryText}"`);

        const config = getBotConfig();
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          await interaction.editReply("❌ AI configuration is incomplete. GEMINI_API_KEY environment variable is missing.");
          return;
        }

        const replyText = await fetchGeminiReply(queryText, config.systemInstruction, config.temperature);
        
        // Format reply nicely
        if (replyText.length > 2000) {
          // Split into multiple parts if over Discord's limit
          await interaction.editReply(replyText.substring(0, 1990) + "...");
        } else {
          await interaction.editReply(replyText);
        }
      } 
      else if (commandName === 'clear') {
        // Permission check
        if (!interaction.memberPermissions?.has('ManageMessages')) {
          await interaction.reply({ content: "❌ You don't have the `Manage Messages` permission.", ephemeral: true });
          return;
        }

        const amount = interaction.options.getInteger('amount', true);
        if (amount < 1 || amount > 100) {
          await interaction.reply({ content: "⚠️ Please specify an amount between 1 and 100.", ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        if (channel) {
          const messages = await channel.messages.fetch({ limit: amount });
          await (channel as any).bulkDelete(messages);
          await interaction.editReply(`🧹 Successfully deleted **${amount}** messages!`);
          addBotLog(`Cleared ${amount} messages in channel by request of ${interaction.user.tag}`);
        } else {
          await interaction.editReply("❌ Unable to clear messages in this channel.");
        }
      } 
      else if (commandName === 'embed') {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const colorInput = interaction.options.getString('color') || 'BLUE';
        
        let hexColor = 0x3498DB; // Default blue
        if (colorInput.toLowerCase() === 'red') hexColor = 0xE74C3C;
        else if (colorInput.toLowerCase() === 'green') hexColor = 0x2ECC71;
        else if (colorInput.toLowerCase() === 'yellow') hexColor = 0xF1C40F;
        else if (colorInput.toLowerCase() === 'purple') hexColor = 0x9B59B6;

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(hexColor)
          .setTimestamp()
          .setFooter({ text: `Broadcasted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
        addBotLog(`Embed message sent by ${interaction.user.tag}`);
      }
      else if (commandName === 'launchfest') {
        await interaction.reply({ embeds: [createLaunchFestEmbed(client?.user)] });
        addBotLog(`Slash command /launchfest executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'dailyrewards') {
        await interaction.reply({ embeds: [createDailyRewardsEmbed(client?.user)] });
        addBotLog(`Slash command /dailyrewards executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'tasks') {
        await interaction.reply({ embeds: [createTasksEmbed(client?.user)] });
        addBotLog(`Slash command /tasks executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'refer') {
        await interaction.reply({ embeds: [createReferEmbed(client?.user)] });
        addBotLog(`Slash command /refer executed by ${interaction.user.tag}`);
      }
      else if (commandName === 'prize') {
        await interaction.reply({ embeds: [createPrizeEmbed(client?.user)] });
        addBotLog(`Slash command /prize executed by ${interaction.user.tag}`);
      }
    } catch (err) {
      addBotLog(`Error running slash command /${commandName}: ` + (err as Error).message);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ An error occurred while executing this command.", ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ An error occurred while executing this command.", ephemeral: true }).catch(() => {});
      }
    }
  });

  try {
    // Attempt bot login
    await client.login(token);
  } catch (error) {
    addBotLog("❌ Failed to login to Discord: " + (error as Error).message);
    addBotLog("💡 Please verify that your DISCORD_TOKEN is valid and has proper gateway intents enabled.");
    botStats.status = "Failed to Login";
  }
}

// Register Slash Commands dynamically with Discord API
async function registerSlashCommands(clientId: string, token: string) {
  const commands = [
    {
      name: 'help',
      description: 'List all available bot commands and utilities'
    },
    {
      name: 'status',
      description: 'Display bot status, latency, and system analytics'
    },
    {
      name: 'ping',
      description: 'Test the bot latency'
    },
    {
      name: 'register',
      description: 'Get ArenaX registration link'
    },
    {
      name: 'website',
      description: 'Get ArenaX official website link'
    },
    {
      name: 'info',
      description: 'Get detailed information about ArenaX'
    },
    {
      name: 'tournaments',
      description: 'Fetch real-time esports tournaments from database'
    },
    {
      name: 'leaderboard',
      description: 'View the top 10 players by balance from database'
    },
    {
      name: 'roll',
      description: 'Roll a random number from 1 to 100'
    },
    {
      name: 'coinflip',
      description: 'Flip a coin (Heads/Tails)'
    },
    {
      name: '8ball',
      description: 'Ask the Magic 8 Ball a question',
      options: [
        {
          name: 'question',
          description: 'The question to ask 8ball',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'rps',
      description: 'Play Rock Paper Scissors with the bot',
      options: [
        {
          name: 'choice',
          description: 'Your move',
          type: 3,
          required: true,
          choices: [
            { name: 'Rock', value: 'rock' },
            { name: 'Paper', value: 'paper' },
            { name: 'Scissors', value: 'scissors' }
          ]
        }
      ]
    },
    {
      name: 'joke',
      description: 'Get a funny gaming or soccer joke'
    },
    {
      name: 'tip',
      description: 'Get a professional competitive gaming tip'
    },
    {
      name: 'quiz',
      description: 'Start a 30-second interactive football trivia quiz'
    },
    {
      name: 'avatar',
      description: 'Get high-resolution avatar image of a user or yourself',
      options: [
        {
          name: 'user',
          description: 'The user whose avatar you want to fetch',
          type: 6,
          required: false
        }
      ]
    },
    {
      name: 'afk',
      description: 'Go AFK with a custom status reason',
      options: [
        {
          name: 'reason',
          description: 'The reason why you are going AFK',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'serverinfo',
      description: 'Display details of the current Discord server'
    },
    {
      name: 'rules',
      description: 'Display the server rules and guidelines'
    },
    {
      name: 'maintenance',
      description: 'Show current ArenaX systems operational status'
    },
    {
      name: 'setmaintenance',
      description: 'Enable or disable maintenance mode (Admin only)',
      options: [
        {
          name: 'mode',
          description: 'Turn maintenance mode on or off',
          type: 3,
          required: true,
          choices: [
            { name: 'On', value: 'on' },
            { name: 'Off', value: 'off' }
          ]
        }
      ]
    },
    {
      name: 'setwelcome',
      description: 'Set the channel where the bot welcomes new members (Admin only)',
      options: [
        {
          name: 'channel',
          description: 'The channel to send welcome messages in',
          type: 7,
          required: false
        },
        {
          name: 'action',
          description: 'Choose to disable welcome messages',
          type: 3,
          required: false,
          choices: [
            { name: 'Disable / Clear Welcome Channel', value: 'disable' }
          ]
        }
      ]
    },
    {
      name: 'announce',
      description: 'Broadcast an announcement embed to a channel (Admin only)',
      options: [
        {
          name: 'channel',
          description: 'The channel to send the announcement to',
          type: 7,
          required: true
        },
        {
          name: 'message',
          description: 'The announcement message body content',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'alert',
      description: 'Broadcast an alert embed with @everyone ping (Admin only)',
      options: [
        {
          name: 'message',
          description: 'The alert message content',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'warn',
      description: 'Log and DM a warning to a server member (Moderator only)',
      options: [
        {
          name: 'user',
          description: 'The user to warn',
          type: 6,
          required: true
        },
        {
          name: 'reason',
          description: 'The reason for warning this user',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'slowmode',
      description: 'Manage slowmode rate limit for the channel (Moderator only)',
      options: [
        {
          name: 'seconds',
          description: 'Slowmode delay in seconds (0 to disable)',
          type: 4,
          required: true
        }
      ]
    },
    {
      name: 'ask',
      description: 'Ask the Google Gemini AI any question or prompt',
      options: [
        {
          name: 'prompt',
          description: 'The prompt or question to ask Gemini AI',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'clear',
      description: 'Bulk delete messages from this channel (Admin only)',
      options: [
        {
          name: 'amount',
          description: 'The number of messages to delete (1-100)',
          type: 4,
          required: true
        }
      ]
    },
    {
      name: 'embed',
      description: 'Create and send a beautiful custom rich embed message',
      options: [
        {
          name: 'title',
          description: 'The title of your embed',
          type: 3,
          required: true
        },
        {
          name: 'description',
          description: 'The main body content of your embed',
          type: 3,
          required: true
        },
        {
          name: 'color',
          description: 'Select embed accent color',
          type: 3,
          required: false,
          choices: [
            { name: 'Blue', value: 'blue' },
            { name: 'Red', value: 'red' },
            { name: 'Green', value: 'green' },
            { name: 'Yellow', value: 'yellow' },
            { name: 'Purple', value: 'purple' }
          ]
        }
      ]
    },
    {
      name: 'launchfest',
      description: 'Show ArenaX Launch Fest event info & event banner'
    },
    {
      name: 'dailyrewards',
      description: 'Show daily login streak rewards on ArenaX'
    },
    {
      name: 'tasks',
      description: 'List ArenaX daily tasks to earn AX points'
    },
    {
      name: 'refer',
      description: 'Show Referral Program details and links'
    },
    {
      name: 'prize',
      description: 'Show Weekly Free Tournament prize distribution'
    }
  ];

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    addBotLog("Refreshing bot slash commands...");
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    addBotLog("Successfully registered all application (/) commands globally!");
  } catch (error) {
    addBotLog("⚠️ Failed to register slash commands: " + (error as Error).message);
  }
}

// Query Gemini API
async function handleGeminiChat(message: any, text: string) {
  const typingUnsub = message.channel.sendTyping().catch(() => {});
  
  const config = getBotConfig();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    await message.reply("❌ Gemini AI client is unconfigured. Pls set your `GEMINI_API_KEY` in Settings.");
    return;
  }

  try {
    const reply = await fetchGeminiReply(text, config.systemInstruction, config.temperature);
    
    // Chunk reply into pieces if longer than Discord limit of 2000 chars
    if (reply.length > 2000) {
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
    addBotLog("Gemini error in Discord Chat: " + (error as Error).message);
    await message.reply("❌ Sorrry, I encountered an error while processing that query with Gemini.");
  }
}

async function fetchGeminiReply(promptText: string, sysPrompt: string, temperature: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    config: {
      systemInstruction: sysPrompt,
      temperature: temperature
    }
  });

  return response.text || "No reply generated.";
}

// ==================== ARENAX CUSTOM COMMAND HELPERS ====================
export function createLaunchFestEmbed(clientUser: any) {
  return new EmbedBuilder()
    .setTitle("🎉 ArenaX Launch Fest")
    .setDescription("*Join the Revolution — Play Free, Win Big!*")
    .setColor(0xE8404A)
    .addFields(
      { name: "📅 End Date", value: "August 1, 2026", inline: true },
      { name: "🎁 Daily Rewards", value: "10-50 AX per day", inline: true },
      { name: "📝 Daily Tasks", value: "Complete tasks daily to accumulate AX points!", inline: false },
      { name: "🔗 Join Link", value: "[Click here to join ArenaX!](https://kpllahore123-maker.github.io/arenaX/)" }
    )
    .setImage("https://raw.githubusercontent.com/kpllahore123-maker/arenaX/main/event_banner_1783187383925.jpg")
    .setFooter({ text: "ArenaX Events", iconURL: clientUser?.displayAvatarURL() })
    .setTimestamp();
}

export function createDailyRewardsEmbed(clientUser: any) {
  return new EmbedBuilder()
    .setTitle("📅 Daily Login Streak Rewards")
    .setDescription("Login daily on ArenaX to claim!\n\n" +
      "**Day 1:** 10 AX\n" +
      "**Day 2:** 15 AX\n" +
      "**Day 3:** 20 AX\n" +
      "**Day 4:** 25 AX\n" +
      "**Day 5:** 30 AX\n" +
      "**Day 6:** 35 AX\n" +
      "**Day 7:** 50 AX + Launch Fest Badge\n\n" +
      "*Login daily on ArenaX to claim!*")
    .setColor(0x2ECC71)
    .addFields(
      { name: "🔗 Claim Link", value: "[Go to ArenaX](https://kpllahore123-maker.github.io/arenaX/)" }
    )
    .setFooter({ text: "ArenaX Daily Rewards", iconURL: clientUser?.displayAvatarURL() })
    .setTimestamp();
}

export function createTasksEmbed(clientUser: any) {
  return new EmbedBuilder()
    .setTitle("📝 ArenaX Daily Tasks")
    .setDescription("Complete tasks daily on ArenaX!\n\n" +
      "💬 **Chat message** → 10 AX\n" +
      "🏆 **Visit tournaments** → 10 AX\n" +
      "🎮 **Play mini game** → 20 AX\n" +
      "🔥 **Login** → 10 AX\n\n" +
      "*Complete tasks daily on ArenaX!*")
    .setColor(0xE67E22)
    .setFooter({ text: "ArenaX Daily Tasks", iconURL: clientUser?.displayAvatarURL() })
    .setTimestamp();
}

export function createReferEmbed(clientUser: any) {
  return new EmbedBuilder()
    .setTitle("👥 ArenaX Referral Program")
    .setDescription("👥 **Refer friends and earn 20 AX per referral!**\n\n" +
      "Visit ArenaX → Events → Referral section")
    .setColor(0x9B59B6)
    .addFields(
      { name: "🔗 Join ArenaX", value: "[Visit ArenaX Website](https://kpllahore123-maker.github.io/arenaX/)" }
    )
    .setFooter({ text: "ArenaX Referral System", iconURL: clientUser?.displayAvatarURL() })
    .setTimestamp();
}

export function createPrizeEmbed(clientUser: any) {
  return new EmbedBuilder()
    .setTitle("🏆 Weekly Tournament Prizes")
    .setDescription("Every Sunday 8:00 PM PKT — **FREE ENTRY!**\n\n" +
      "🥇 **1st:** 200 AX + Champion Badge\n" +
      "🥈 **2nd:** 100 AX + Runner Up Badge\n" +
      "🥉 **3rd:** 50 AX\n" +
      "🎮 **All participants:** 20 AX\n\n" +
      "*Every Sunday 8:00 PM PKT — FREE ENTRY!*")
    .setColor(0xF1C40F)
    .setFooter({ text: "ArenaX Tournament League", iconURL: clientUser?.displayAvatarURL() })
    .setTimestamp();
}
