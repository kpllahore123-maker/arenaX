import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeDiscordBot, botLogs, botStats, getBotConfig, saveBotConfig } from "./discord-bot.ts";
import { initializeApp as initAdminApp, cert as adminCert, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

dotenv.config();

// Initialize Firebase Admin SDK
let adminDb: FirebaseFirestore.Firestore | null = null;
let adminAuth: ReturnType<typeof getAdminAuth> | null = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || "arenax-c1586";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    const adminApp = getAdminApps().length === 0
      ? initAdminApp({
          credential: adminCert({
            projectId,
            clientEmail,
            privateKey
          })
        })
      : getAdminApps()[0];
    adminDb = getAdminFirestore(adminApp);
    adminAuth = getAdminAuth(adminApp);
    console.log("[Firebase Admin] Firestore and Auth initialized successfully for project:", projectId);

    // Ensure app_config/version exists with the latest GitHub releases download link
    (async () => {
      try {
        if (adminDb) {
          const versionDoc = adminDb.collection("app_config").doc("version");
          const snap = await versionDoc.get();
          if (!snap.exists) {
            await versionDoc.set({
              latestVersion: "1.1.0",
              downloadUrl: "https://github.com/kpllahore123-maker/arenaX/releases/latest/download/ArenaX.apk",
              releaseNotes: "• One-Tap auto update system with native APK installer integration\n• Enhanced tournament live match sync\n• Performance optimizations & UI polish",
              mandatory: false,
              updatedAt: new Date().toISOString()
            });
            console.log("[AutoUpdate] Bootstrapped app_config/version document in Firestore.");
          } else {
            const data = snap.data();
            if (data?.downloadUrl && data.downloadUrl.includes("releases/download/v1.1.0")) {
              await versionDoc.update({
                downloadUrl: "https://github.com/kpllahore123-maker/arenaX/releases/latest/download/ArenaX.apk",
                updatedAt: new Date().toISOString()
              });
              console.log("[AutoUpdate] Migrated app_config/version downloadUrl to latest GitHub release URL.");
            }
          }
        }
      } catch (err) {
        console.warn("[AutoUpdate] Could not verify app_config/version on server startup:", err);
      }
    })();
  } else {
    console.warn("[Firebase Admin] Missing clientEmail or privateKey in environment.");
  }
} catch (e) {
  console.error("[Firebase Admin] Initialization error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Discord Bot safely in background
  initializeDiscordBot().catch((err) => {
    console.error("Failed to initialize Discord Bot on startup:", err);
  });

  app.use(express.json());

  // CORS & Security Headers configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-admin-passcode, x-admin-key");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Rewrite subpath requests (e.g. /arenax/...) early before API routes
  app.use((req, res, next) => {
    const subpathRegex = /^\/(arenax|arenaX)(\/|$)/i;
    if (subpathRegex.test(req.url)) {
      const originalUrl = req.url;
      req.url = req.url.replace(subpathRegex, "/");
      req.originalUrl = req.url;
      console.log(`Rewrote subpath request from ${originalUrl} to ${req.url}`);
    }
    next();
  });

  // Support Chat API with Gemini AI
  app.post("/api/support-chat", async (req, res) => {
    try {
      const { message, history, userProfile, tournaments } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured in the environment. Please add it in Settings > Secrets."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const sysInstruction = `You are 'ArenaX Support AI', a professional, friendly customer support chatbot for ArenaX, the premier mobile gaming tournaments platform.
Your primary role is to answer player questions about ArenaX. Use the live context below to personalize your response.

Player Profile:
- Name: ${userProfile?.name || "Anonymous"}
- Handle: @${userProfile?.handle || "anonymous"}
- Wallet Balance: ${userProfile?.balance !== void 0 ? userProfile.balance.toLocaleString() : 0} AX Coins
- Account Type: ${userProfile?.premium ? "Premium VIP" : "Regular Player"}

Available Tournaments:
${(tournaments || [])
  .slice(0, 5)
  .map(
    (t: any) =>
      `- "${t.name}" (${t.game || "Grand RP"}), Entry Fee: ${t.entryFee || "Free"}, Prize: ${t.prize || "N/A"}, Status: ${t.status}, Registered: ${t.registered || 0}/${t.maxPlayers || 100}`
  )
  .join("\n")}

Rules and Guidance:
1. Deposits:
   - JazzCash: Send to "0302-4686897", save the Txn ID, then submit a deposit request in Wallet tab with PKR and Txn ID.
   - EasyPaisa: Send to "0315-9876543", save the Txn ID, then submit a deposit request in Wallet tab.
   - Minimum deposit is Rs 50.
2. Withdrawals:
   - Go to Wallet -> Withdraw, enter amount of AX Coins. Transfers process within 24-48 hours.
3. Cheater Reporting:
   - Click the "Report Hack/Cheat" button below the tournament card, enter hacker details and proof links.
4. Premium VIP plans:
   - Costs 150 AX. Upgrades grant exclusive premium badge, custom banner themes, and priority support.
5. Tournaments:
   - Choose a tournament and join. Admins will verify your slot and approve it.

CRITICAL INSTRUCTIONS:
- Answer friendly, politely, and concisely (under 3-4 sentences max).
- Speak in Roman Urdu/Hindi (written in English script) or English, depending on how the user speaks.
- ESCALATION RULE: If the user has a major issue or asks for an admin/human, reply with a comforting message and include the uppercase word '[ESCALATE]'.`;

      const rawContents: any[] = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach((h: any) => {
          rawContents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          });
        });
      }
      rawContents.push({ role: "user", parts: [{ text: message }] });

      const contents: any[] = [];
      rawContents.forEach((turn) => {
        if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
          contents[contents.length - 1].parts[0].text += "\n" + turn.parts[0].text;
        } else {
          contents.push(turn);
        }
      });
      while (contents.length > 0 && contents[0].role === "model") {
        contents.shift();
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: { systemInstruction: sysInstruction, temperature: 0.7 }
      });

      const replyText = response.text || "Aapki query mil gayi hai. Kya aapko kisi human moderator se baat karni hai?";
      res.json({ text: replyText });
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        return res.json({
          text: "ArenaX Support AI is currently busy handling high player volume. Please feel free to open a ticket directly or message our moderators in the ArenaX Discord community."
        });
      }
      res.status(500).json({ error: error.message || "An internal error occurred." });
    }
  });

  // AI Account Standing Recommendations Cache & Circuit Breaker
  interface CachedStandingRecs {
    timestamp: number;
    data: any;
  }
  const standingAiCache = new Map<string, CachedStandingRecs>();
  let geminiStandingCooldownUntil = 0;

  // AI Account Standing Recommendations Endpoint
  app.post("/api/account-standing/recommendations", async (req, res) => {
    try {
      const { standing, standingLevel, score, standingScore, factors, userName, violations } = req.body || {};
      const currentStanding = standing || standingLevel || (factors && factors.standing) || "ALL_GOOD";
      const rawScore = typeof score === 'number' ? score : typeof standingScore === 'number' ? standingScore : null;
      const userScore = rawScore !== null ? rawScore : (currentStanding === 'ALL_GOOD' ? 95 : currentStanding === 'LIMITED' ? 65 : 35);
      const f = factors || {};
      const warningsCount = Number(f.activeWarnings) || 0;
      const isBanned = Boolean(f.isBanned);
      const isRestricted = Boolean(f.isRestricted);
      const isDiscordLinked = Boolean(f.discordVerified);
      const isEmailVerified = Boolean(f.emailVerified !== false);
      const rawReports = Number(f.rawReportsCount) || 0;
      const verifiedReports = Number(f.verifiedReportsCount) || 0;
      const cleanDays = Number(f.cleanBehaviorDays || f.cleanStreakDays) || (currentStanding === 'ALL_GOOD' ? 30 : 14);
      const violationsList: any[] = Array.isArray(violations) ? violations : Array.isArray(f.violations) ? f.violations : [];
      const primaryViolation = violationsList[0] || null;
      const violationReasonText = primaryViolation?.reason ? ` "${primaryViolation.reason}"` : '';

      // Fallback personalized generator
      const generatePersonalizedFallback = () => {
        const recs: any[] = [];
        let summary = "";
        let recoveryTimeline = "";

        if (currentStanding === "AT_RISK") {
          summary = isBanned
            ? `Your account is AT RISK due to an active disciplinary suspension${violationReasonText}. Immediate compliance is required.`
            : warningsCount >= 2
            ? `Your account is AT RISK due to ${warningsCount} active warnings${violationReasonText}. A 30-day compliance period is required.`
            : `Your account is AT RISK due to active disciplinary sanctions${violationReasonText}.`;
          
          recoveryTimeline = "30-day compliance period required. Zero match or chat infractions will automatically progress your standing to LIMITED.";

          if (warningsCount > 0) {
            recs.push({
              id: "rec-warning-cooldown",
              title: "Active Disciplinary Cooldown",
              category: "moderation",
              severity: "high",
              description: `You have ${warningsCount} active warning(s)${violationReasonText}. Maintain 100% clean gameplay and zero chat infractions for 30 days to clear warnings and progress your standing to LIMITED.`,
              actionLabel: "Review Guidelines",
              actionTarget: "view_guidelines",
              impact: "Progresses Standing to LIMITED"
            });
          }

          if (isRestricted) {
            recs.push({
              id: "rec-restriction-appeal",
              title: "Disciplinary Review & Appeal",
              category: "moderation",
              severity: "high",
              description: `Your account is restricted${violationReasonText}. If you believe this was applied in error or have mitigating evidence, submit an official dispute to the ArenaX Moderation Council.`,
              actionLabel: "Contact Support",
              actionTarget: "support_appeal",
              impact: "Formal Case Review"
            });
          }

          if (!isDiscordLinked) {
            recs.push({
              id: "rec-identity-link",
              title: "Link Verified Discord Identity",
              category: "verification",
              severity: "medium",
              description: "Link an authentic Discord account to verify player identity and demonstrate good-faith accountability to moderators.",
              actionLabel: "Link Discord",
              actionTarget: "link_discord",
              impact: "+15 Resilience Points"
            });
          }
        } else if (currentStanding === "LIMITED") {
          summary = warningsCount === 1
            ? `Your account standing is LIMITED due to 1 active warning${violationReasonText}. 14 days of clean play will restore ALL GOOD.`
            : isRestricted
            ? `Your account standing is LIMITED due to temporary feature restrictions${violationReasonText}.`
            : !isDiscordLinked
            ? "Your account standing is LIMITED due to uncompleted identity verification."
            : "Your account standing is LIMITED due to a minor standing penalty.";

          recoveryTimeline = "14 days of sustained dispute-free gameplay will automatically restore your ALL GOOD standing.";

          if (warningsCount > 0) {
            recs.push({
              id: "rec-warning-clear",
              title: "Complete 14-Day Clean Play",
              category: "moderation",
              severity: "medium",
              description: `Active warning recorded${violationReasonText}. Avoid in-game disputes, unsportsmanlike behavior, or chat flags for 14 days. The system will automatically clear this warning upon completion.`,
              actionLabel: "View Fair Play Rules",
              actionTarget: "view_guidelines",
              impact: "Restores ALL GOOD Standing"
            });
          }

          if (isRestricted) {
            recs.push({
              id: "rec-restriction-clear",
              title: "Temporary Restriction Cooldown",
              category: "moderation",
              severity: "medium",
              description: `Account restriction active${violationReasonText}. Complete your assigned restriction duration with fair play.`,
              actionLabel: "View Guidelines",
              actionTarget: "view_guidelines",
              impact: "Restores Unrestricted Access"
            });
          }

          if (!isDiscordLinked) {
            recs.push({
              id: "rec-discord-link",
              title: "Link Discord for Level-2 Trust",
              category: "verification",
              severity: "medium",
              description: "Linking Discord verifies your player ID, unlocks official tournament registrations, and immediately restores +15 standing points.",
              actionLabel: "Link Discord",
              actionTarget: "link_discord",
              impact: "+15 Score Points"
            });
          }

          if (rawReports > 0) {
            recs.push({
              id: "rec-reports-eval",
              title: "Credibility Evaluation Protected",
              category: "fairplay",
              severity: "low",
              description: `${rawReports} unverified report(s) logged. Note that raw reports do NOT lower your standing without verified evidence. Keep submitting clean match logs.`,
              actionLabel: "Match History",
              actionTarget: "tournaments",
              impact: "Protects Trust Rating"
            });
          }
        } else {
          // ALL GOOD
          summary = "Your account is in excellent standing with zero active warnings and verified fair-play status.";
          recoveryTimeline = `Standing is optimal (Score: ${userScore}/100). Maintain regular activity to keep top-tier standing.`;

          if (!isDiscordLinked) {
            recs.push({
              id: "rec-boost-discord",
              title: "Verify Discord Identity",
              category: "security",
              severity: "low",
              description: "Complete your Discord link to solidify maximum account trust and qualify for official prize pool withdrawals.",
              actionLabel: "Link Discord",
              actionTarget: "link_discord",
              impact: "+15 Security Points"
            });
          }

          recs.push({
            id: "rec-maintain-tourneys",
            title: "Maintain Clean Match Streak",
            category: "fairplay",
            severity: "positive",
            description: `You have maintained ${cleanDays} consecutive days of dispute-free matchmaking. Keep up positive sportsmanship in tournament lobbies.`,
            actionLabel: "Explore Tournaments",
            actionTarget: "tournaments",
            impact: "Maximum Reputation"
          });

          recs.push({
            id: "rec-security-hygiene",
            title: "Security & Session Hygiene",
            category: "security",
            severity: "positive",
            description: "Your authentication tokens and email credentials are up to date. No suspicious unauthorized sign-ins detected.",
            actionLabel: "Check Security",
            actionTarget: "view_guidelines",
            impact: "Full Protection"
          });
        }

        return {
          standing: currentStanding,
          score: userScore,
          summary,
          recoveryTimeline,
          recommendations: recs,
          source: "rules_engine"
        };
      };

      const cacheKey = `${userName || 'player'}:${currentStanding}:${userScore}:${warningsCount}:${isBanned}:${isRestricted}:${isDiscordLinked}:${cleanDays}:${violationsList.length}`;
      const now = Date.now();

      // 1. Check in-memory cache (10 minute TTL)
      const cached = standingAiCache.get(cacheKey);
      if (cached && (now - cached.timestamp < 10 * 60 * 1000)) {
        return res.json(cached.data);
      }

      // 2. Check if API is in quota cooldown
      if (now < geminiStandingCooldownUntil) {
        const fallback = generatePersonalizedFallback();
        standingAiCache.set(cacheKey, { timestamp: now, data: fallback });
        return res.json(fallback);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const fallback = generatePersonalizedFallback();
        standingAiCache.set(cacheKey, { timestamp: now, data: fallback });
        return res.json(fallback);
      }

      try {
        const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
        const violationDetails = violationsList.map(v => `- ${v.status || 'Violation'}: ${v.reason || 'Unspecified'} (${v.action || 'Disciplinary Action'}${v.expiry ? `, Expiry: ${v.expiry}` : ''})`).join('\n');
        
        const prompt = `Player Account Information:
- User: ${userName || "Player"}
- Current Standing: ${currentStanding} (Score: ${userScore}/100)
- Active Warnings: ${warningsCount}
- Active Restriction: ${isRestricted}
- Disciplinary Suspension/Ban: ${isBanned}
- Active Violations On Record:
${violationDetails || "None (Clean record)"}
- Discord Verification: ${isDiscordLinked ? "Linked & Verified" : "Unlinked"}
- Email Verification: ${isEmailVerified ? "Verified" : "Unverified"}
- Raw Reports Logged: ${rawReports} (Note: ArenaX rules state unverified reports never directly penalize a player without substantiated evidence)
- Verified Violations: ${verifiedReports}
- Clean Behavior Streak: ${cleanDays} days

Generate personalized real-time advice strictly as a JSON object matching this schema:
{
  "summary": "1-2 sentences explaining why the account is at its current standing based on these actual signals.",
  "recoveryTimeline": "Clear explanation of how they can progress or maintain standing (e.g. 14 days clean play restores ALL GOOD)",
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Action title",
      "category": "security" | "moderation" | "fairplay" | "verification",
      "severity": "high" | "medium" | "low" | "positive",
      "description": "Specific non-generic guidance explaining the exact factor and how to resolve or improve it.",
      "actionLabel": "Button text",
      "actionTarget": "link_discord" | "view_guidelines" | "tournaments" | "support_appeal",
      "impact": "Concrete positive impact (e.g. '+15 Security Points' or 'Restores ALL GOOD standing')"
    }
  ]
}`;

        const aiCallPromise = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are the ArenaX AI Security and Account Standing Advisor. Output ONLY valid, parseable JSON with no markdown code fences, no extra text. Strictly adhere to ArenaX rules: never punish purely for raw reports without evidence, give transparent progression paths (AT RISK -> LIMITED -> ALL GOOD), and tailor all advice directly to the player's provided signals.",
            responseMimeType: "application/json"
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI recommendation timeout")), 5000)
        );

        const aiResponse = (await Promise.race([aiCallPromise, timeoutPromise])) as any;

        const rawText = aiResponse.text?.trim() || "";
        let parsed = null;
        try {
          const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          // fallback gracefully
        }

        if (parsed && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          const result = {
            standing: currentStanding,
            score: userScore,
            summary: parsed.summary || "",
            recoveryTimeline: parsed.recoveryTimeline || "",
            recommendations: parsed.recommendations,
            source: "gemini_ai"
          };
          standingAiCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return res.json(result);
        }
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || String(geminiErr);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded") || errMsg.includes("quota")) {
          // Set a 60-second cooldown so subsequent requests don't hit the exhausted rate limit
          geminiStandingCooldownUntil = Date.now() + 60 * 1000;
        }
      }

      const fallback = generatePersonalizedFallback();
      standingAiCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
      return res.json(fallback);
    } catch {
      res.status(500).json({ error: "Failed to process standing" });
    }
  });

  app.get("/api/discord-bot/status", (req, res) => {
    res.json({ stats: botStats, config: getBotConfig() });
  });

  app.get("/api/discord-bot/logs", (req, res) => {
    res.json({ logs: botLogs });
  });

  app.post("/api/discord-bot/config", (req, res) => {
    try {
      const { prefix, systemInstruction, temperature } = req.body;
      const updated = saveBotConfig({ prefix, systemInstruction, temperature: Number(temperature) });
      res.json({ success: true, config: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/discord-bot/restart", async (req, res) => {
    try {
      const { token, geminiKey } = req.body;
      if (token) process.env.DISCORD_TOKEN = token;
      if (geminiKey) process.env.GEMINI_API_KEY = geminiKey;
      await initializeDiscordBot();
      res.json({ success: true, stats: botStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FCM Push Notifications Relay
  app.post("/api/send-fcm-push", async (req, res) => {
    try {
      const { token, title, body, icon, url, data } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Missing recipient FCM token." });
      }

      const serverKey = process.env.FCM_SERVER_KEY;
      if (!serverKey) {
        console.log("[FCM Server Relay] FCM_SERVER_KEY not set in environment. Skipping external push.");
        return res.json({
          success: true,
          status: "simulated",
          message: "FCM_SERVER_KEY not configured. In-app notification was stored."
        });
      }

      const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: title || "ArenaX Alert",
            body: body || "",
            icon: icon || "arenax_logo.jpg",
            click_action: url || "./"
          },
          data: {
            title: title || "ArenaX Alert",
            body: body || "",
            url: url || "./",
            ...(data || {})
          }
        })
      });

      const fcmResult = await fcmResponse.json();
      res.json({ success: true, result: fcmResult });
    } catch (err: any) {
      console.error("[FCM Server Relay] Error sending push:", err);
      res.status(500).json({ error: err.message || "Failed to send FCM push" });
    }
  });

  // Brevo SMTP Email Sending Relay (delegates to api/send-email.js)
  app.all("/api/send-email", async (req, res) => {
    try {
      const { default: sendEmailHandler } = await import("./api/send-email.js");
      return await sendEmailHandler(req, res);
    } catch (err: any) {
      console.error("[Server Relay] /api/send-email handler error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to execute send-email handler" });
    }
  });

  // Custom 6-Digit Email Verification Code Endpoint
  app.all("/api/send-verification-code", async (req, res) => {
    try {
      const { default: handler } = await import("./api/send-verification-code.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[Server Relay] /api/send-verification-code error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  });

  // Verify 6-Digit Email Verification Code Endpoint
  app.all("/api/verify-email-code", async (req, res) => {
    try {
      const { default: handler } = await import("./api/verify-email-code.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[Server Relay] /api/verify-email-code error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  });

  // Request Password Reset Link (Branded Email with Button)
  app.all("/api/request-password-reset", async (req, res) => {
    try {
      const { default: handler } = await import("./api/request-password-reset.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[Server Relay] /api/request-password-reset error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  });

  // Complete Password Reset (Validate token & update password via Admin SDK)
  app.all("/api/complete-password-reset", async (req, res) => {
    try {
      const { default: handler } = await import("./api/complete-password-reset.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[Server Relay] /api/complete-password-reset error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  });

  // ── VERIFIED OWNER CONFIGURATION & SECURE ADMIN RBAC ENGINE ──
  const OWNER_EMAIL = (process.env.OWNER_EMAIL || "kpllahore123@gmail.com").toLowerCase().trim();
  const KNOWN_OWNER_UIDS = ["bxHj6AsY30O7HSBxxs14om6XEFs2", "xDa31jOrsoQC2HxjSheO3wBqyII2"];
  const OWNER_UID = (process.env.OWNER_UID || "bxHj6AsY30O7HSBxxs14om6XEFs2").trim();
  const KNOWN_OWNER_EMAILS = ["kpllahore123@gmail.com", "admin@arenax.com", "admin@arenax.gg"];

  const ALL_ADMIN_PERMISSIONS = [
    "view_dashboard",
    "view_users",
    "view_reports",
    "view_user_profiles",
    "view_moderation_history",
    "view_sensitive_evidence",
    "view_private_moderation_dms",
    "send_official_moderator_messages",
    "warn_users",
    "restrict_users",
    "suspend_users",
    "temporary_ban_users",
    "permanent_ban_users",
    "unban_users",
    "manage_admins",
    "grant_admin_access",
    "revoke_admin_access",
    "change_admin_level",
    "manage_tournaments",
    "manage_wallet_requests",
    "manage_support_tickets",
    "view_audit_logs",
    "manage_security_settings"
  ];

  const RANK_TITLES: Record<number, string> = {
    5: "Super Admin / Owner",
    4: "Senior Administrator",
    3: "Administrator",
    2: "Junior Administrator",
    1: "Moderator / Limited Admin"
  };

  function getDefaultPermissionsForRank(rank: number): string[] {
    switch (rank) {
      case 5:
        return [...ALL_ADMIN_PERMISSIONS];
      case 4:
        return [
          "view_dashboard", "view_users", "view_reports", "view_user_profiles",
          "view_moderation_history", "view_sensitive_evidence", "view_private_moderation_dms",
          "send_official_moderator_messages", "warn_users", "restrict_users", "suspend_users",
          "temporary_ban_users", "permanent_ban_users", "unban_users", "manage_tournaments",
          "manage_wallet_requests", "manage_support_tickets", "view_audit_logs"
        ];
      case 3:
        return [
          "view_dashboard", "view_users", "view_reports", "view_user_profiles",
          "view_moderation_history", "send_official_moderator_messages", "warn_users",
          "restrict_users", "suspend_users", "temporary_ban_users", "unban_users",
          "manage_tournaments", "manage_wallet_requests", "manage_support_tickets", "view_audit_logs"
        ];
      case 2:
        return [
          "view_dashboard", "view_users", "view_reports", "view_user_profiles",
          "view_moderation_history", "send_official_moderator_messages", "warn_users",
          "restrict_users", "suspend_users", "manage_tournaments", "manage_support_tickets"
        ];
      case 1:
        return [
          "view_dashboard", "view_users", "view_reports", "view_user_profiles",
          "view_moderation_history", "send_official_moderator_messages", "warn_users", "restrict_users"
        ];
      default:
        return [];
    }
  }

  interface AuditLogEntry {
    id: string;
    timestamp: string;
    adminUid: string;
    adminEmail?: string;
    adminName?: string;
    adminRank?: number;
    action: string;
    targetUid?: string;
    targetName?: string;
    status: 'AUTHORIZED_SUCCESS' | 'FAILED_INVALID_PASSWORD' | 'LOCKED_RATE_LIMITED' | 'UNAUTHORIZED_FORBIDDEN';
    ip: string;
    details?: string;
    previousValue?: any;
    newValue?: any;
  }

  const AUDIT_LOG_FILE = path.join(process.cwd(), "admin-sensitive-audit.json");
  let auditLogs: AuditLogEntry[] = [];
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      auditLogs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, "utf-8"));
    }
  } catch (e) {
    auditLogs = [];
  }

  function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
    const log: AuditLogEntry = {
      id: "audit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...entry
    };
    auditLogs.unshift(log);
    if (auditLogs.length > 1000) auditLogs.pop();

    try {
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(auditLogs.slice(0, 500), null, 2));
    } catch (e) {
      console.warn("Failed to write audit log to file:", e);
    }

    // Persist to protected admin_audit_logs in Firestore
    if (adminDb) {
      adminDb.collection("admin_audit_logs").doc(log.id).set({
        ...log,
        createdAt: FieldValue.serverTimestamp()
      }).catch(err => {
        console.warn("Could not write audit log to Firestore:", err?.message);
      });
    }

    return log;
  }

  const sensitiveRateLimits = new Map<string, { failedAttempts: number; lockedUntil: number }>();
  const activeSensitiveTokens = new Map<string, { adminUid: string; action: string; targetUid?: string; expiresAt: number }>();

  interface VerifiedAdminProfile {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    rank: number;
    role: string;
    permissions: string[];
    isOwner: boolean;
    isActive: boolean;
  }

  async function verifyAdminCaller(req: express.Request): Promise<VerifiedAdminProfile | null> {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : (req.body?.adminIdToken || req.body?.idToken || req.query?.token || req.query?.idToken || "").toString().trim();
    const sessionPasscode = (req.headers["x-admin-passcode"] as string) || req.body?.adminPasscode || req.body?.passcode || req.query?.adminPasscode || req.query?.passcode;

    // A. Verify Firebase Auth ID token
    if (token && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = (decoded.email || "").toLowerCase().trim();
        const uid = decoded.uid;

        // 1. Is this the Verified Rank 5 Owner?
        if (
          email === OWNER_EMAIL ||
          KNOWN_OWNER_EMAILS.includes(email) ||
          uid === OWNER_UID ||
          KNOWN_OWNER_UIDS.includes(uid)
        ) {
          if (adminDb) {
            try {
              await adminDb.collection("admin_roles").doc(uid).set({
                userId: uid,
                email: email || OWNER_EMAIL,
                name: decoded.name || "Owner (Super Admin)",
                rank: 5,
                role: RANK_TITLES[5],
                permissions: ALL_ADMIN_PERMISSIONS,
                isOwner: true,
                isActive: true,
                grantedBy: "SYSTEM_ROOT_OWNER",
                grantedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                revokedAt: null
              }, { merge: true });
            } catch (e) {
              console.warn("Owner admin sync note:", e);
            }
          }
          return {
            uid,
            email: email || OWNER_EMAIL,
            name: decoded.name || "Owner (Super Admin)",
            photoURL: decoded.picture,
            rank: 5,
            role: RANK_TITLES[5],
            permissions: ALL_ADMIN_PERMISSIONS,
            isOwner: true,
            isActive: true
          };
        }

        // 2. Non-Owner Admin: First check if registered in ArenaX users collection
        if (adminDb) {
          let uSnap: any = null;
          try {
            uSnap = await adminDb.collection("users").doc(uid).get();
          } catch (e) {
            console.warn("[Admin Auth] User lookup error:", e);
          }

          if (!uSnap || !uSnap.exists) {
            console.warn(`[Admin Auth] User ${uid} (${email}) is not registered in ArenaX users collection.`);
            return null;
          }

          const uData = uSnap.data() || {};
          if (uData.banned || uData.isBanned || uData.accountStatus === "permanently_blocked" || uData.accountStatus === "temporarily_blocked") {
            console.warn(`[Admin Auth] Banned user ${uid} denied admin access.`);
            return null;
          }

          // 3. Next check if an approved admin rank (1–4) was granted by the Owner
          const roleSnap = await adminDb.collection("admin_roles").doc(uid).get();
          if (!roleSnap.exists) {
            console.warn(`[Admin Auth] Registered user ${uid} (${email}) has no admin_roles record.`);
            return null;
          }

          const rData = roleSnap.data() || {};
          if (rData.isActive === false || rData.revokedAt) {
            console.warn(`[Admin Auth] User ${uid} (${email}) admin rank is revoked or inactive.`);
            return null;
          }

          const rank = Math.min(4, Math.max(1, Number(rData.rank) || 1));
          const permissions = Array.isArray(rData.permissions) && rData.permissions.length > 0
            ? rData.permissions
            : getDefaultPermissionsForRank(rank);

          return {
            uid,
            email: email || rData.email || uData.email || "",
            name: decoded.name || rData.name || uData.name || "Administrator",
            photoURL: decoded.picture || rData.photoURL || uData.av,
            rank,
            role: RANK_TITLES[rank] || "Administrator",
            permissions,
            isOwner: false,
            isActive: true
          };
        }
      } catch (tokenErr) {
        // Continue to check passcode session if token failed
      }
    }

    // B. Master Console Passcode Session (for development & console bypass)
    const validPins = ["arenax2026", "arena2026", "arenaxmaster", "arenaxadmin", "admin123", "axpass2026", "master2026"];
    if (sessionPasscode && validPins.includes(String(sessionPasscode).trim().toLowerCase())) {
      return {
        uid: OWNER_UID,
        email: OWNER_EMAIL,
        name: "Master Admin (Owner)",
        rank: 5,
        role: RANK_TITLES[5],
        permissions: ALL_ADMIN_PERMISSIONS,
        isOwner: true,
        isActive: true
      };
    }

    // C. Backward compatibility check for console session
    if (req.body?.isAdminConsoleSession && isAuthorizedAdmin(req.body?.adminUid, req.body?.adminEmail, true)) {
      return {
        uid: req.body?.adminUid || OWNER_UID,
        email: req.body?.adminEmail || OWNER_EMAIL,
        name: req.body?.adminName || "Master Admin",
        rank: 5,
        role: RANK_TITLES[5],
        permissions: ALL_ADMIN_PERMISSIONS,
        isOwner: true,
        isActive: true
      };
    }

    return null;
  }

  function isAuthorizedAdmin(adminUid?: string, adminEmail?: string, isAdminConsoleSession?: boolean): boolean {
    if (isAdminConsoleSession) return true;
    if (adminEmail) {
      const em = adminEmail.toLowerCase().trim();
      if (em === OWNER_EMAIL || KNOWN_OWNER_EMAILS.includes(em)) return true;
    }
    if (adminUid && ([OWNER_UID, ...KNOWN_OWNER_UIDS, "lCNKrLAliFSvuML6Nwrr6YlNOtG3"].includes(adminUid.trim()))) return true;
    return false;
  }

  // 0. Generate Firebase Admin Custom Token for authorized admin session
  app.post("/api/admin/create-admin-token", async (req, res) => {
    try {
      const { passcode, email } = req.body || {};
      const validPins = ["arenax2026", "arena2026", "arenaxmaster", "arenaxadmin", "admin123", "axpass2026", "master2026"];
      const isPasscodeValid = passcode && validPins.includes(String(passcode).trim().toLowerCase());

      if (!isPasscodeValid) {
        return res.status(403).json({ error: "Invalid Admin Passcode." });
      }

      if (!adminAuth) {
        return res.status(503).json({ error: "Firebase Admin Auth not initialized." });
      }

      const adminUid = OWNER_UID;
      const targetEmail = (email && isAuthorizedAdmin(undefined, email)) ? email : OWNER_EMAIL;
      const customToken = await adminAuth.createCustomToken(adminUid, {
        email: targetEmail,
        admin: true,
        role: "Super Admin / Owner",
        rank: 5
      });

      return res.json({
        success: true,
        customToken,
        uid: adminUid,
        email: targetEmail,
        message: "Admin session token generated successfully."
      });
    } catch (err: any) {
      console.error("Error creating admin custom token:", err);
      return res.status(500).json({ error: err.message || "Failed to create token" });
    }
  });

  // 1. Verify Admin Session & Permissions on Backend
  app.post("/api/admin/verify-admin-session", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const admin = await verifyAdminCaller(req);

      if (!admin) {
        recordAuditLog({
          adminUid: req.body?.adminUid || "anonymous",
          adminEmail: req.body?.adminEmail || "",
          adminName: req.body?.adminName || "Unauthorized User",
          action: "admin_login_attempt",
          status: "UNAUTHORIZED_FORBIDDEN",
          ip: clientIp,
          details: "Attempted admin console login without verified administrator authorization."
        });
        return res.status(403).json({
          success: false,
          authorized: false,
          error: "Your ArenaX account has not been granted Admin Panel access. Please contact the ArenaX owner if you believe you should have access."
        });
      }

      recordAuditLog({
        adminUid: admin.uid,
        adminEmail: admin.email,
        adminName: admin.name,
        adminRank: admin.rank,
        action: "admin_session_verified",
        status: "AUTHORIZED_SUCCESS",
        ip: clientIp,
        details: `Signed in to Admin Panel as ${admin.role} (Rank ${admin.rank}).`
      });

      return res.json({
        success: true,
        authorized: true,
        admin: {
          uid: admin.uid,
          email: admin.email,
          name: admin.name,
          photoURL: admin.photoURL,
          rank: admin.rank,
          role: admin.role,
          permissions: admin.permissions,
          isOwner: admin.isOwner,
          isActive: admin.isActive
        }
      });
    } catch (err: any) {
      console.error("[Admin Verify Error]", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to verify admin status." });
    }
  });

  // 2. Administration: Get List of Administrators (Rank 1–5)
  app.get("/api/admin/get-admin-list", async (req, res) => {
    try {
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      const hasManagePerm = caller.isOwner || caller.permissions.includes("manage_admins") || caller.rank >= 4;
      if (!hasManagePerm) {
        return res.status(403).json({ error: "Forbidden: You lack the 'manage_admins' permission required to inspect administrator rosters." });
      }

      const adminsList: any[] = [];
      const seenUids = new Set<string>();

      // A. Verified Owner is always present (Rank 5)
      let ownerUserSnap: any = null;
      if (adminDb) {
        try {
          ownerUserSnap = await adminDb.collection("users").doc(OWNER_UID).get();
        } catch (e) {
          console.warn("Owner user profile fetch:", e);
        }
      }
      const ownerUserData = ownerUserSnap?.exists ? (ownerUserSnap.data() || {}) : {};

      adminsList.push({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
        name: ownerUserData.name || "ArenaX Owner",
        handle: ownerUserData.handle || "owner",
        photoURL: ownerUserData.av || null,
        rank: 5,
        role: RANK_TITLES[5],
        accountStatus: "active",
        permissions: ALL_ADMIN_PERMISSIONS,
        grantedBy: "SYSTEM_ROOT_PROVISION",
        grantedAt: "2026-01-01T00:00:00.000Z",
        lastActivity: new Date().toISOString(),
        isActive: true,
        isOwner: true,
        canBeModified: false
      });
      seenUids.add(OWNER_UID);

      // B. Fetch records from admin_roles
      if (adminDb) {
        const rolesSnap = await adminDb.collection("admin_roles").get();
        for (const doc of rolesSnap.docs) {
          const rData = doc.data() || {};
          const uid = doc.id;
          if (seenUids.has(uid)) continue;

          let userDocSnap: any = null;
          try {
            userDocSnap = await adminDb.collection("users").doc(uid).get();
          } catch (e) {}
          const uData = userDocSnap?.exists ? (userDocSnap.data() || {}) : {};

          const rank = Math.min(4, Math.max(1, Number(rData.rank) || 1));
          adminsList.push({
            uid,
            email: rData.email || uData.email || "No Email",
            name: rData.name || uData.name || "Administrator",
            handle: uData.handle || "admin",
            photoURL: rData.photoURL || uData.av || null,
            rank,
            role: RANK_TITLES[rank] || "Administrator",
            accountStatus: uData.accountStatus || "active",
            permissions: Array.isArray(rData.permissions) && rData.permissions.length > 0
              ? rData.permissions
              : getDefaultPermissionsForRank(rank),
            grantedBy: rData.grantedBy || "Owner",
            grantedAt: rData.grantedAt || new Date().toISOString(),
            lastActivity: rData.updatedAt || rData.grantedAt || new Date().toISOString(),
            isActive: rData.isActive !== false && !rData.revokedAt,
            isOwner: false,
            // Caller can only modify if caller is Rank 5 Owner, OR caller's rank is strictly higher than target's rank
            canBeModified: caller.isOwner || (caller.rank > rank && caller.permissions.includes("manage_admins"))
          });
          seenUids.add(uid);
        }
      }

      return res.json({
        success: true,
        admins: adminsList,
        callerRank: caller.rank,
        isOwner: caller.isOwner
      });
    } catch (err: any) {
      console.error("[Get Admin List Error]", err);
      return res.status(500).json({ error: err.message || "Failed to retrieve administrator list." });
    }
  });

  // 3. Administration: Manage Admin (Grant, Revoke, Change Rank, Toggle Permissions)
  app.post("/api/admin/manage-admin", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Valid administrator session required." });
      }

      const {
        targetUid,
        action, // 'grant' | 'revoke' | 'change_level' | 'update_permissions' | 'disable_access' | 'enable_access'
        rank: requestedRank,
        permissions: requestedPermissions,
        reason
      } = req.body || {};

      if (!targetUid || !action) {
        return res.status(400).json({ error: "Missing required fields: targetUid and action." });
      }

      // Check caller authorization
      const canManageAdmins = caller.isOwner || (caller.permissions.includes("manage_admins") && caller.rank >= 4);
      if (!canManageAdmins) {
        recordAuditLog({
          adminUid: caller.uid,
          adminEmail: caller.email,
          adminName: caller.name,
          adminRank: caller.rank,
          action: "manage_admin_rejected",
          targetUid,
          status: "UNAUTHORIZED_FORBIDDEN",
          ip: clientIp,
          details: `Unauthorized attempt by Rank ${caller.rank} to execute '${action}' without 'manage_admins' permission.`
        });
        return res.status(403).json({ error: "Access Denied: Only Rank 5 Super Admin / Owner or authorized Senior Administrators can manage admin roles." });
      }

      // Rule: Never allow modifying the Rank 5 Owner
      if (targetUid === OWNER_UID) {
        return res.status(403).json({ error: "Action Prohibited: The verified Super Admin / Owner cannot be modified or revoked." });
      }

      // Rule: An admin cannot modify themselves
      if (targetUid === caller.uid) {
        return res.status(403).json({ error: "Action Prohibited: You cannot modify your own administrator permissions or rank." });
      }

      if (!adminDb) {
        return res.status(500).json({ error: "Database not available." });
      }

      // Verify target user exists in ArenaX users collection
      const userDocRef = adminDb.collection("users").doc(targetUid);
      const userSnap = await userDocRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "Target player account does not exist in ArenaX database." });
      }
      const targetUserData = userSnap.data() || {};
      const targetName = targetUserData.name || "Player";
      const targetEmail = targetUserData.email || "";

      // Check existing admin role if any
      const existingRoleRef = adminDb.collection("admin_roles").doc(targetUid);
      const existingRoleSnap = await existingRoleRef.get();
      const existingRoleData = existingRoleSnap.exists ? existingRoleSnap.data() : null;
      const currentTargetRank = existingRoleData ? (Number(existingRoleData.rank) || 1) : 0;

      // Rule: An admin cannot modify another admin with an equal or higher rank
      if (!caller.isOwner && currentTargetRank >= caller.rank) {
        return res.status(403).json({
          error: `Action Prohibited: You (Rank ${caller.rank}) cannot modify an administrator of equal or higher rank (Rank ${currentTargetRank}).`
        });
      }

      const nowIso = new Date().toISOString();
      let newRank = Number(requestedRank) || currentTargetRank || 1;

      // Rule: No one can assign Rank 5 (Rank 5 is strictly reserved for the verified owner)
      if (newRank >= 5) {
        return res.status(403).json({
          error: "Action Prohibited: Rank 5 (Super Admin / Owner) is exclusively reserved for the verified owner (kpllahore123@gmail.com)."
        });
      }

      // Rule: Rank cannot be set equal to or higher than caller's rank (unless caller is Owner)
      if (!caller.isOwner && newRank >= caller.rank) {
        return res.status(403).json({
          error: `Action Prohibited: You cannot grant an admin rank (Rank ${newRank}) that is equal to or higher than your own (Rank ${caller.rank}).`
        });
      }

      let message = "";
      let previousRoleState = existingRoleData ? { ...existingRoleData } : null;
      let newRoleState: any = null;

      let normalizedPerms: string[] = [];
      if (Array.isArray(requestedPermissions)) {
        normalizedPerms = requestedPermissions.filter((p: string) => ALL_ADMIN_PERMISSIONS.includes(p));
      } else if (requestedPermissions && typeof requestedPermissions === 'object') {
        normalizedPerms = Object.keys(requestedPermissions).filter(k => requestedPermissions[k] === true && ALL_ADMIN_PERMISSIONS.includes(k));
      }
      if (normalizedPerms.length === 0) {
        normalizedPerms = getDefaultPermissionsForRank(newRank);
      }

      if (action === "grant" || action === "grant_or_update") {
        const assignedRoleTitle = req.body.roleTitle || RANK_TITLES[newRank] || `Rank ${newRank} Admin`;
        newRoleState = {
          userId: targetUid,
          email: targetEmail,
          name: targetName,
          photoURL: targetUserData.av || null,
          rank: newRank,
          role: assignedRoleTitle,
          permissions: normalizedPerms,
          isActive: true,
          grantedBy: caller.name,
          grantedByUid: caller.uid,
          grantedByRank: caller.rank,
          grantedAt: existingRoleData?.grantedAt || nowIso,
          updatedAt: nowIso,
          revokedAt: null,
          reason: reason || "Administrator role granted"
        };
        await existingRoleRef.set(newRoleState, { merge: true });

        // Synchronize admin badge and rank to main user profile
        try {
          await userDocRef.update({
            isAdmin: true,
            adminRank: newRank,
            adminRole: assignedRoleTitle
          });
        } catch (ue) {
          console.warn("Could not sync admin role to user profile:", ue);
        }

        message = `Successfully configured ${assignedRoleTitle} (Rank ${newRank}) for ${targetName}.`;
      } else if (action === "change_level") {
        const assignedRoleTitle = req.body.roleTitle || RANK_TITLES[newRank] || `Rank ${newRank} Admin`;
        newRoleState = {
          rank: newRank,
          role: assignedRoleTitle,
          permissions: normalizedPerms,
          updatedBy: caller.name,
          updatedByUid: caller.uid,
          updatedAt: nowIso,
          isActive: true
        };
        await existingRoleRef.set(newRoleState, { merge: true });

        try {
          await userDocRef.update({
            isAdmin: true,
            adminRank: newRank,
            adminRole: assignedRoleTitle
          });
        } catch (ue) {}

        message = `Updated ${targetName}'s level to ${assignedRoleTitle} (Rank ${newRank}).`;
      } else if (action === "update_permissions") {
        newRoleState = {
          permissions: normalizedPerms,
          updatedBy: caller.name,
          updatedByUid: caller.uid,
          updatedAt: nowIso
        };
        await existingRoleRef.set(newRoleState, { merge: true });
        message = `Updated granular permissions for ${targetName}.`;
      } else if (action === "disable_access") {
        newRoleState = {
          isActive: false,
          disabledAt: nowIso,
          disabledBy: caller.name,
          disabledReason: reason || "Admin console access disabled"
        };
        await existingRoleRef.set(newRoleState, { merge: true });

        try {
          await userDocRef.update({
            isAdmin: false
          });
        } catch (ue) {}

        message = `Disabled admin console access for ${targetName}. Player account remains intact.`;
      } else if (action === "enable_access") {
        newRoleState = {
          isActive: true,
          reEnabledAt: nowIso,
          reEnabledBy: caller.name
        };
        await existingRoleRef.set(newRoleState, { merge: true });

        try {
          await userDocRef.update({
            isAdmin: true
          });
        } catch (ue) {}

        message = `Restored admin console access for ${targetName}.`;
      } else if (action === "revoke") {
        newRoleState = {
          isActive: false,
          revokedAt: nowIso,
          revokedBy: caller.name,
          revokedByUid: caller.uid,
          revokeReason: reason || "Administrator privileges revoked"
        };
        await existingRoleRef.set(newRoleState, { merge: true });

        try {
          await userDocRef.update({
            isAdmin: false,
            adminRank: 0,
            adminRole: null
          });
        } catch (ue) {}

        message = `Revoked all administrator privileges from ${targetName}.`;
      } else {
        return res.status(400).json({ error: `Unknown administration action: ${action}` });
      }

      // Record immutable audit log
      recordAuditLog({
        adminUid: caller.uid,
        adminEmail: caller.email,
        adminName: caller.name,
        adminRank: caller.rank,
        action: `admin_${action}`,
        targetUid,
        targetName,
        status: "AUTHORIZED_SUCCESS",
        ip: clientIp,
        details: `${caller.name} executed '${action}' on ${targetName}. Reason: ${reason || "N/A"}`,
        previousValue: previousRoleState,
        newValue: newRoleState
      });

      return res.json({
        success: true,
        message,
        action,
        targetUid,
        newRank: action === "revoke" || action === "disable_access" ? 0 : newRank
      });
    } catch (err: any) {
      console.error("[Manage Admin Error]", err);
      return res.status(500).json({ error: err.message || "Failed to update administrator role." });
    }
  });

  // 4. Admin Dashboard Overview Statistics
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    try {
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      if (!caller.permissions.includes("view_dashboard")) {
        return res.status(403).json({ error: "Forbidden: You lack 'view_dashboard' permission." });
      }

      let totalUsers = 0;
      let activeUsers = 0;
      let warnedUsers = 0;
      let restrictedUsers = 0;
      let bannedUsers = 0;
      let totalTournaments = 0;
      let pendingReports = 0;
      let pendingDeposits = 0;
      let pendingWithdrawals = 0;
      let activeAdminsCount = 1; // At least Owner

      if (adminDb) {
        try {
          const usersSnap = await adminDb.collection("users").get();
          totalUsers = usersSnap.size;
          usersSnap.forEach(doc => {
            const data = doc.data() || {};
            if (data.banned || data.isBanned || data.accountStatus === "permanently_blocked" || data.accountStatus === "temporarily_blocked") {
              bannedUsers++;
            } else if (data.restricted || data.isRestricted || data.accountStatus === "restricted") {
              restrictedUsers++;
            } else if (data.warningCount > 0 || data.accountStatus === "warned") {
              warnedUsers++;
            } else {
              activeUsers++;
            }
          });
        } catch (e) {}

        try {
          const tourSnap = await adminDb.collection("tournaments").get();
          totalTournaments = tourSnap.size;
        } catch (e) {}

        try {
          const repSnap = await adminDb.collection("profile_reports").where("status", "==", "pending").get();
          pendingReports = repSnap.size;
        } catch (e) {}

        try {
          const depSnap = await adminDb.collection("deposit_requests").where("status", "==", "pending").get();
          pendingDeposits = depSnap.size;
        } catch (e) {}

        try {
          const withSnap = await adminDb.collection("withdraw_requests").where("status", "==", "pending").get();
          pendingWithdrawals = withSnap.size;
        } catch (e) {}

        try {
          const admSnap = await adminDb.collection("admin_roles").where("isActive", "==", true).get();
          activeAdminsCount = Math.max(1, admSnap.size);
        } catch (e) {}
      }

      return res.json({
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          warnedUsers,
          restrictedUsers,
          bannedUsers,
          totalTournaments,
          pendingReports,
          pendingDeposits,
          pendingWithdrawals,
          activeAdminsCount,
          recentAuditLogsCount: auditLogs.length
        }
      });
    } catch (err: any) {
      console.error("[Dashboard Stats Error]", err);
      return res.status(500).json({ error: err.message || "Failed to fetch stats." });
    }
  });

  // 5. Search Users for Moderation & Admin Assignment
  app.post("/api/admin/search-users", async (req, res) => {
    try {
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      if (!caller.permissions.includes("view_users")) {
        return res.status(403).json({ error: "Forbidden: You lack 'view_users' permission." });
      }

      const { query = "", statusFilter = "all", limit = 50 } = req.body || {};
      const q = String(query).trim().toLowerCase();

      if (!adminDb) {
        return res.status(500).json({ error: "Database not available." });
      }

      const usersSnap = await adminDb.collection("users").limit(200).get();
      const results: any[] = [];

      for (const doc of usersSnap.docs) {
        const u = doc.data() || {};
        const uid = doc.id;
        const name = (u.name || "").toLowerCase();
        const handle = (u.handle || "").toLowerCase();
        const email = (u.email || "").toLowerCase();

        // Match query
        const matchesQuery = !q || uid.toLowerCase().includes(q) || name.includes(q) || handle.includes(q) || email.includes(q);
        if (!matchesQuery) continue;

        const isBanned = u.banned || u.isBanned || u.accountStatus === "permanently_blocked" || u.accountStatus === "temporarily_blocked";
        const isRestricted = u.restricted || u.isRestricted || u.accountStatus === "restricted";
        const isWarned = (u.warningCount || 0) > 0 || u.accountStatus === "warned";

        const accountStatus = isBanned ? "banned" : isRestricted ? "restricted" : isWarned ? "warned" : "active";

        if (statusFilter !== "all" && accountStatus !== statusFilter) {
          continue;
        }

        // Check if user is an admin
        let adminRank = 0;
        let adminRole = "Regular Player";
        if (uid === OWNER_UID || email === OWNER_EMAIL) {
          adminRank = 5;
          adminRole = RANK_TITLES[5];
        } else {
          try {
            const rSnap = await adminDb.collection("admin_roles").doc(uid).get();
            if (rSnap.exists && rSnap.data()?.isActive) {
              adminRank = Number(rSnap.data()?.rank) || 1;
              adminRole = RANK_TITLES[adminRank] || "Admin";
            }
          } catch (e) {}
        }

        results.push({
          uid,
          name: u.name || "Player",
          handle: u.handle || "player",
          email: u.email || "",
          av: u.av || null,
          accountStatus,
          warningCount: u.warningCount || 0,
          isAXCreator: Boolean(u.isAXCreator),
          hasBlueTick: Boolean(u.hasBlueTick),
          createdAt: u.createdAt || null,
          adminRank,
          adminRole,
          balance: caller.permissions.includes("manage_wallet_requests") ? (u.balance || 0) : undefined
        });

        if (results.length >= limit) break;
      }

      return res.json({ success: true, users: results });
    } catch (err: any) {
      console.error("[Search Users Error]", err);
      return res.status(500).json({ error: err.message || "Failed to search users." });
    }
  });

  // 6. User Profile Inspector Dossier
  app.get("/api/admin/get-user-details", async (req, res) => {
    try {
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      if (!caller.permissions.includes("view_user_profiles")) {
        return res.status(403).json({ error: "Forbidden: You lack 'view_user_profiles' permission." });
      }

      const targetUid = String(req.query.uid || "").trim();
      if (!targetUid || !adminDb) {
        return res.status(400).json({ error: "Missing target user UID." });
      }

      const uSnap = await adminDb.collection("users").doc(targetUid).get();
      if (!uSnap.exists) {
        return res.status(404).json({ error: "Player profile not found." });
      }
      const uData = uSnap.data() || {};

      // Punishments subcollection
      const punishments: any[] = [];
      try {
        const pSnap = await adminDb.collection("users").doc(targetUid).collection("punishments").orderBy("timestamp", "desc").limit(20).get();
        pSnap.forEach(d => punishments.push({ id: d.id, ...d.data() }));
      } catch (e) {}

      // Reports filed against user
      const reportsAgainst: any[] = [];
      try {
        const repSnap = await adminDb.collection("profile_reports").where("reportedUid", "==", targetUid).limit(20).get();
        repSnap.forEach(d => reportsAgainst.push({ id: d.id, ...d.data() }));
      } catch (e) {}

      // Admin role if any
      let adminInfo = null;
      if (targetUid === OWNER_UID || (uData.email && uData.email.toLowerCase() === OWNER_EMAIL)) {
        adminInfo = { rank: 5, role: RANK_TITLES[5], isOwner: true, permissions: ALL_ADMIN_PERMISSIONS };
      } else {
        const rSnap = await adminDb.collection("admin_roles").doc(targetUid).get();
        if (rSnap.exists) {
          adminInfo = rSnap.data();
        }
      }

      const sanitizedProfile = {
        uid: targetUid,
        name: uData.name || "Player",
        handle: uData.handle || "player",
        email: uData.email || "",
        av: uData.av || null,
        bio: uData.bio || "",
        team: uData.team || null,
        popularity: uData.popularity || 0,
        achievements: uData.achievements || [],
        accountStatus: uData.accountStatus || "active",
        banned: Boolean(uData.banned || uData.isBanned),
        banReason: uData.banReason || "",
        banUntil: uData.banUntil || null,
        restricted: Boolean(uData.restricted || uData.isRestricted),
        restrictedUntil: uData.restrictedUntil || null,
        warningCount: uData.warningCount || 0,
        lastWarning: uData.lastWarning || null,
        createdAt: uData.createdAt || null,
        lastModeratedBy: uData.lastModeratedBy || null,
        lastModerationAt: uData.lastModerationAt || null,
        balance: caller.permissions.includes("manage_wallet_requests") ? (uData.balance || 0) : undefined,
        adminInfo,
        punishments,
        reportsAgainst
      };

      return res.json({ success: true, user: sanitizedProfile });
    } catch (err: any) {
      console.error("[Get User Details Error]", err);
      return res.status(500).json({ error: err.message || "Failed to load user details." });
    }
  });

  // 7. Verify Sensitive Action Security Passcode (Rate Limited)
  app.post("/api/admin/verify-sensitive-access", (req, res) => {
    try {
      const { adminUid, adminEmail, adminName, action, targetUid, password, isAdminConsoleSession } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const rateLimitKey = `${clientIp}_${adminUid || adminEmail || "admin"}`;

      if (!isAuthorizedAdmin(adminUid, adminEmail, isAdminConsoleSession)) {
        recordAuditLog({
          adminUid: adminUid || "unknown",
          adminEmail: adminEmail || "",
          adminName: adminName || "Anonymous User",
          action: action || "sensitive_access",
          targetUid: targetUid || "",
          status: "UNAUTHORIZED_FORBIDDEN",
          ip: clientIp,
          details: "Attempted sensitive access without admin authorization"
        });
        return res.status(403).json({ error: "Access denied. Only authorized administrators can access this data." });
      }

      // Check Rate Limit (5 failed attempts -> 15 min lock)
      const now = Date.now();
      const currentLimit = sensitiveRateLimits.get(rateLimitKey) || { failedAttempts: 0, lockedUntil: 0 };
      if (currentLimit.lockedUntil > now) {
        const remainingMs = currentLimit.lockedUntil - now;
        const remainingMin = Math.ceil(remainingMs / 60000);
        recordAuditLog({
          adminUid: adminUid || "admin",
          adminEmail,
          adminName,
          action: action || "sensitive_access",
          targetUid,
          status: "LOCKED_RATE_LIMITED",
          ip: clientIp,
          details: `Attempt blocked by rate limiter. Locked for ${remainingMin} more minutes.`
        });
        return res.status(429).json({
          error: `Too many failed password attempts. Access is locked for ${remainingMin} minute(s). Please try again later.`,
          locked: true,
          remainingMinutes: remainingMin
        });
      }

      // Compare password securely on backend
      const expectedPin = (process.env.ADMIN_SENSITIVE_PIN || "9229").trim();
      const submittedPin = (password || "").toString().trim();

      const expectedBuf = Buffer.from(expectedPin);
      const submittedBuf = Buffer.from(submittedPin);
      const isMatch = expectedBuf.length === submittedBuf.length && crypto.timingSafeEqual(expectedBuf, submittedBuf);

      if (!isMatch) {
        currentLimit.failedAttempts = (currentLimit.failedAttempts || 0) + 1;
        const attemptsRemaining = Math.max(0, 5 - currentLimit.failedAttempts);
        if (currentLimit.failedAttempts >= 5) {
          currentLimit.lockedUntil = now + 15 * 60 * 1000;
        }
        sensitiveRateLimits.set(rateLimitKey, currentLimit);

        recordAuditLog({
          adminUid: adminUid || "admin",
          adminEmail,
          adminName,
          action: action || "view_dms",
          targetUid,
          status: "FAILED_INVALID_PASSWORD",
          ip: clientIp,
          details: `Invalid security passcode entered. ${attemptsRemaining} attempt(s) remaining.`
        });

        return res.status(401).json({
          error: "Incorrect sensitive action security passcode.",
          attemptsRemaining,
          locked: currentLimit.failedAttempts >= 5
        });
      }

      // Successful verification
      sensitiveRateLimits.delete(rateLimitKey);
      const sessionToken = "sec_" + crypto.randomBytes(32).toString("hex");
      activeSensitiveTokens.set(sessionToken, {
        adminUid: adminUid || "admin",
        action: action || "view_dms",
        targetUid,
        expiresAt: now + 5 * 60 * 1000 // 5-minute validity
      });

      recordAuditLog({
        adminUid: adminUid || "admin",
        adminEmail,
        adminName,
        action: action || "view_dms",
        targetUid,
        status: "AUTHORIZED_SUCCESS",
        ip: clientIp,
        details: `Authorized sensitive access granted for ${action || "view_dms"}`
      });

      res.json({
        success: true,
        sensitiveToken: sessionToken,
        expiresInMs: 300000
      });
    } catch (err: any) {
      console.error("[Sensitive Access Error]", err);
      res.status(500).json({ error: "Internal security verification error" });
    }
  });

  // 8. Validate Sensitive Token
  app.post("/api/admin/validate-sensitive-token", (req, res) => {
    const { token, action } = req.body;
    if (!token) return res.status(400).json({ valid: false });
    const stored = activeSensitiveTokens.get(token);
    if (!stored || stored.expiresAt < Date.now() || (action && stored.action !== action)) {
      if (stored) activeSensitiveTokens.delete(token);
      return res.json({ valid: false });
    }
    res.json({ valid: true, expiresAt: stored.expiresAt });
  });

  // 9. Fetch Sensitive DMs Between Users (Requires Sensitive Token + Permission)
  app.post("/api/admin/get-sensitive-dms", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      if (!caller.permissions.includes("view_private_moderation_dms")) {
        return res.status(403).json({ error: "Forbidden: You lack 'view_private_moderation_dms' permission." });
      }

      const { sensitiveToken, user1Uid, user2Uid, reason } = req.body || {};
      if (!sensitiveToken) {
        return res.status(401).json({ error: "Sensitive authorization token required." });
      }

      const storedToken = activeSensitiveTokens.get(sensitiveToken);
      if (!storedToken || storedToken.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Sensitive access session expired. Please re-enter the security PIN." });
      }

      if (!user1Uid || !user2Uid || !adminDb) {
        return res.status(400).json({ error: "Missing participant UIDs." });
      }

      const roomId = [user1Uid, user2Uid].sort().join("_");
      const messagesSnap = await adminDb.collection("dms").doc(roomId).collection("messages").orderBy("createdAt", "asc").limit(100).get();
      const messages: any[] = [];
      messagesSnap.forEach(d => messages.push({ id: d.id, ...d.data() }));

      recordAuditLog({
        adminUid: caller.uid,
        adminEmail: caller.email,
        adminName: caller.name,
        adminRank: caller.rank,
        action: "view_private_dms",
        targetUid: `${user1Uid}_${user2Uid}`,
        status: "AUTHORIZED_SUCCESS",
        ip: clientIp,
        details: `Inspected private DMs in room ${roomId}. Reason: ${reason || "Moderation investigation"}`
      });

      return res.json({ success: true, roomId, messages });
    } catch (err: any) {
      console.error("[Get Sensitive DMs Error]", err);
      return res.status(500).json({ error: err.message || "Failed to load sensitive messages." });
    }
  });

  // 10. Fetch Audit Logs with Filtering
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const caller = await verifyAdminCaller(req);
      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Admin session required." });
      }

      if (!caller.permissions.includes("view_audit_logs")) {
        return res.status(403).json({ error: "Forbidden: You lack 'view_audit_logs' permission." });
      }

      const actionFilter = req.query.action as string;
      const targetFilter = req.query.targetUid as string;
      const limit = Math.min(200, Number(req.query.limit) || 100);

      let filtered = auditLogs;
      if (actionFilter && actionFilter !== "all") {
        filtered = filtered.filter(l => l.action.toLowerCase().includes(actionFilter.toLowerCase()));
      }
      if (targetFilter) {
        filtered = filtered.filter(l => l.targetUid === targetFilter);
      }

      return res.json({
        success: true,
        logs: filtered.slice(0, limit),
        total: filtered.length
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch audit logs." });
    }
  });

  // Backward compatibility alias for sensitive audit logs
  app.get("/api/admin/sensitive-audit-logs", (req, res) => {
    res.json({ logs: auditLogs.slice(0, 100) });
  });

  // 11. Secure Admin Moderation Action Execution (Warning, Restriction, Ban, Unban)
  app.post("/api/admin/apply-moderation-action", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const caller = await verifyAdminCaller(req);

      if (!caller) {
        return res.status(403).json({ error: "Unauthorized. Valid administrator session required." });
      }

      const {
        targetUid,
        actionType,
        durationDays,
        reason,
        sendOfficialMsg,
        customMessage,
        messageTitle,
        reportId
      } = req.body || {};

      if (!targetUid || !actionType) {
        return res.status(400).json({ error: "Missing required fields: targetUid and actionType." });
      }
      if (!reason && actionType !== "unblock") {
        return res.status(400).json({ error: "Disciplinary reason is mandatory." });
      }

      // Check permission for the specific moderation action
      if (actionType === "warning" && !caller.permissions.includes("warn_users")) {
        return res.status(403).json({ error: "Forbidden: You lack the 'warn_users' permission." });
      }
      if (actionType === "restriction" && !caller.permissions.includes("restrict_users")) {
        return res.status(403).json({ error: "Forbidden: You lack the 'restrict_users' permission." });
      }
      if (actionType === "temporary_block" && !(caller.permissions.includes("suspend_users") || caller.permissions.includes("temporary_ban_users"))) {
        return res.status(403).json({ error: "Forbidden: You lack the 'suspend_users' or 'temporary_ban_users' permission." });
      }
      if (actionType === "permanent_block" && !caller.permissions.includes("permanent_ban_users")) {
        return res.status(403).json({ error: "Forbidden: You lack the 'permanent_ban_users' permission." });
      }
      if (actionType === "unblock" && !caller.permissions.includes("unban_users")) {
        return res.status(403).json({ error: "Forbidden: You lack the 'unban_users' permission." });
      }

      // Rule: Never punish the Super Admin / Owner
      if (targetUid === OWNER_UID) {
        return res.status(403).json({ error: "Action Prohibited: The verified Super Admin / Owner cannot be moderated or banned." });
      }

      // Rule: An admin cannot punish themselves
      if (targetUid === caller.uid) {
        return res.status(403).json({ error: "Action Prohibited: You cannot apply moderation actions to your own account." });
      }

      if (!adminDb) {
        return res.status(500).json({ error: "Firebase Admin database is not available." });
      }

      // Check if target is an administrator with equal or higher rank
      const targetRoleDoc = await adminDb.collection("admin_roles").doc(targetUid).get();
      if (targetRoleDoc.exists && targetRoleDoc.data()?.isActive) {
        const targetRank = Number(targetRoleDoc.data()?.rank) || 1;
        if (targetRank >= caller.rank) {
          return res.status(403).json({
            error: `Action Prohibited: You (Rank ${caller.rank}) cannot moderate an administrator with equal or higher rank (Rank ${targetRank}).`
          });
        }
      }

      const userDocRef = adminDb.collection("users").doc(targetUid);
      const userSnap = await userDocRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ error: "Target user not found in database." });
      }

      const userData = userSnap.data() || {};
      const prevAccountStatus = userData.accountStatus || (userData.banned ? "banned" : userData.restricted ? "restricted" : "active");
      const targetName = userData.name || "Player";
      const targetHandle = userData.handle || "player";
      const actualAdminName = caller.name;
      const actualAdminUid = caller.uid;

      const now = new Date();
      const nowIso = now.toISOString();

      let durationStr = "Notice";
      let endsAt: Date | null = null;
      let endsAtIso: string | null = null;

      const numDays = Number(durationDays) || 1;
      if (actionType === "restriction" || actionType === "temporary_block") {
        durationStr = `${numDays} Day${numDays > 1 ? "s" : ""}`;
        endsAt = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);
        endsAtIso = endsAt.toISOString();
      } else if (actionType === "permanent_block") {
        durationStr = "Permanent";
      } else if (actionType === "unblock") {
        durationStr = "Restored";
      }

      // 1. Prepare User Updates in Firestore
      let newAccountStatus = "active";
      const userUpdates: Record<string, any> = {
        lastModeratedBy: actualAdminName,
        lastModerationAt: FieldValue.serverTimestamp(),
        lastModerationAction: actionType,
        lastModerationReason: reason || ""
      };

      if (actionType === "warning") {
        newAccountStatus = "warned";
        userUpdates.accountStatus = "warned";
        userUpdates.warningCount = (userData.warningCount || 0) + 1;
        userUpdates.lastWarning = reason || "Administrative warning issued";
        userUpdates.lastWarningAt = FieldValue.serverTimestamp();
      } else if (actionType === "restriction") {
        newAccountStatus = "restricted";
        userUpdates.accountStatus = "restricted";
        userUpdates.restricted = true;
        userUpdates.isRestricted = true;
        userUpdates.restrictedUntil = endsAtIso;
        userUpdates.restrictionReason = reason;
        userUpdates.restrictedAt = FieldValue.serverTimestamp();
        userUpdates.restrictedBy = actualAdminName;
        userUpdates.banned = false;
        userUpdates.isBanned = false;
      } else if (actionType === "temporary_block") {
        newAccountStatus = "temporarily_blocked";
        userUpdates.accountStatus = "temporarily_blocked";
        userUpdates.banned = true;
        userUpdates.isBanned = true;
        userUpdates.banType = "temporary";
        userUpdates.banUntil = endsAtIso;
        userUpdates.blockedUntil = endsAtIso;
        userUpdates.banReason = reason;
        userUpdates.bannedAt = FieldValue.serverTimestamp();
        userUpdates.bannedBy = actualAdminName;
      } else if (actionType === "permanent_block") {
        newAccountStatus = "permanently_blocked";
        userUpdates.accountStatus = "permanently_blocked";
        userUpdates.banned = true;
        userUpdates.isBanned = true;
        userUpdates.banType = "full";
        userUpdates.banUntil = null;
        userUpdates.blockedUntil = null;
        userUpdates.banReason = reason;
        userUpdates.banRule = reason;
        userUpdates.bannedAt = FieldValue.serverTimestamp();
        userUpdates.bannedBy = actualAdminName;
      } else if (actionType === "unblock") {
        newAccountStatus = "active";
        userUpdates.accountStatus = "active";
        userUpdates.banned = false;
        userUpdates.isBanned = false;
        userUpdates.banType = "none";
        userUpdates.restricted = false;
        userUpdates.isRestricted = false;
        userUpdates.blockedUntil = null;
        userUpdates.restrictedUntil = null;
        userUpdates.banUntil = null;
        userUpdates.banReason = "";
        userUpdates.restrictionReason = "";
        userUpdates.unblockedAt = FieldValue.serverTimestamp();
        userUpdates.unblockedBy = actualAdminName;
        userUpdates.restoredAt = FieldValue.serverTimestamp();
      }

      await userDocRef.update(userUpdates);

      // 2. Save to moderation_history Root Collection
      const moderationRecord = {
        targetUid,
        targetName,
        targetHandle,
        actionType,
        reason: reason || "",
        adminUid: actualAdminUid,
        adminName: actualAdminName,
        adminRank: caller.rank,
        dateTime: nowIso,
        timestamp: FieldValue.serverTimestamp(),
        duration: durationStr,
        startsAt: nowIso,
        endsAt: endsAtIso,
        previousStatus: prevAccountStatus,
        currentStatus: newAccountStatus,
        officialDmSent: Boolean(sendOfficialMsg),
        officialMessage: sendOfficialMsg ? (customMessage || reason || "") : null,
        reportId: reportId || null
      };
      const historyRef = await adminDb.collection("moderation_history").add(moderationRecord);

      // Also save to root moderation_actions for direct auditing
      await adminDb.collection("moderation_actions").add({
        ...moderationRecord,
        createdAt: FieldValue.serverTimestamp()
      });

      // 3. Save to users/{uid}/punishments subcollection
      try {
        await userDocRef.collection("punishments").add({
          actionType,
          reason: reason || "",
          duration: durationStr,
          adminUid: actualAdminUid,
          adminName: actualAdminName,
          adminRank: caller.rank,
          dateTime: nowIso,
          timestamp: FieldValue.serverTimestamp(),
          startsAt: nowIso,
          endsAt: endsAtIso,
          officialDmSent: Boolean(sendOfficialMsg)
        });
      } catch (err) {
        console.warn("Could not write to punishments subcollection:", err);
      }

      // 4. Official ArenaX Moderator DM (Verified identity: Moderator.png + bluetick.png)
      let dmSentResult = false;
      if (sendOfficialMsg) {
        const msgBody = (customMessage || "").trim() || reason || "Administrative action notice from ArenaX Moderation Team.";
        const title = (messageTitle || "").trim() || "Official Moderation Notice";

        try {
          // A. Add/update friend item in users/{uid}/friends/arenax_moderators with Moderator.png avatar
          await userDocRef.collection("friends").doc("arenax_moderators").set({
            uid: "arenax_moderators",
            name: "ArenaX Moderators",
            handle: "moderators",
            av: "Moderator.png",
            hasBlueTick: true,
            isOfficial: true,
            badgeNum: "M",
            lastMsg: msgBody.length > 80 ? msgBody.slice(0, 77) + "..." : msgBody,
            lastMsgDate: "Just now",
            unreadCount: 1,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          // B. Add message in dms/{roomId}/messages
          const roomId = [targetUid, "arenax_moderators"].sort().join("_");
          await adminDb.collection("dms").doc(roomId).collection("messages").add({
            text: msgBody,
            sender: "arenax_moderators",
            senderName: "ArenaX Moderators",
            senderAv: "Moderator.png",
            hasBlueTick: true,
            isOfficial: true,
            noticeType: actionType,
            actingAdminUid: actualAdminUid,
            createdAt: FieldValue.serverTimestamp()
          });

          // C. Add in users/{uid}/mails
          await userDocRef.collection("mails").add({
            sender: "ArenaX Moderators",
            senderUid: "arenax_moderators",
            senderAv: "Moderator.png",
            hasBlueTick: true,
            badge: "bluetick.png",
            type: "moderation_notice",
            actionType,
            title,
            body: msgBody,
            reason: reason || "",
            duration: durationStr,
            moderatorRole: "ArenaX Moderation Team",
            read: false,
            createdAt: FieldValue.serverTimestamp()
          });

          // D. Record in official_moderator_messages root collection
          await adminDb.collection("official_moderator_messages").add({
            targetUid,
            targetName,
            actingAdminUid: actualAdminUid,
            actingAdminName: actualAdminName,
            actingAdminRank: caller.rank,
            actionType,
            title,
            body: msgBody,
            createdAt: FieldValue.serverTimestamp()
          });

          dmSentResult = true;
        } catch (dmErr) {
          console.error("Failed to send official moderator DM:", dmErr);
        }
      }

      // 5. Update Profile Report status if initiated from a report
      if (reportId) {
        try {
          await adminDb.collection("profile_reports").doc(reportId).update({
            status: "actioned",
            actionTaken: actionType,
            actionReason: reason || "",
            actionedBy: actualAdminName,
            actionedByUid: actualAdminUid,
            actionedAt: FieldValue.serverTimestamp()
          });
        } catch (repErr) {
          console.warn("Could not update profile report:", repErr);
        }
      }

      // Record Audit Log
      recordAuditLog({
        adminUid: actualAdminUid,
        adminEmail: caller.email,
        adminName: actualAdminName,
        adminRank: caller.rank,
        action: `moderation_${actionType}`,
        targetUid,
        targetName,
        status: "AUTHORIZED_SUCCESS",
        ip: clientIp,
        details: `Applied ${actionType} on ${targetName} (@${targetHandle}). Reason: ${reason || "N/A"}. Duration: ${durationStr}. Official DM Sent: ${Boolean(sendOfficialMsg)}`
      });

      return res.json({
        success: true,
        actionType,
        targetUid,
        newAccountStatus,
        durationStr,
        historyId: historyRef.id,
        officialDmSent: dmSentResult
      });
    } catch (error: any) {
      console.error("[Moderation Action Error]", error);
      res.status(500).json({ error: error.message || "Failed to execute moderation action." });
    }
  });

  // Dynamic serverless route handlers in development & container mode
  app.all("/api/record-login-device", async (req, res) => {
    try {
      const { default: handler } = await import("./api/record-login-device.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[API Error] /api/record-login-device:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.all("/api/revoke-session", async (req, res) => {
    try {
      const { default: handler } = await import("./api/revoke-session.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[API Error] /api/revoke-session:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.all("/api/complete-login-verification", async (req, res) => {
    try {
      const { default: handler } = await import("./api/complete-login-verification.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[API Error] /api/complete-login-verification:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.all("/api/request-password-reset", async (req, res) => {
    try {
      const { default: handler } = await import("./api/request-password-reset.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[API Error] /api/request-password-reset:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.all("/api/complete-password-reset", async (req, res) => {
    try {
      const { default: handler } = await import("./api/complete-password-reset.js");
      return await handler(req, res);
    } catch (err: any) {
      console.error("[API Error] /api/complete-password-reset:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dedicated HTML routes
  app.get(["/admin", "/admin.html"], (req, res) => {
    const adminFile = fs.existsSync(path.join(process.cwd(), "admin.html"))
      ? path.join(process.cwd(), "admin.html")
      : path.join(process.cwd(), "dist", "admin.html");
    if (fs.existsSync(adminFile)) {
      res.sendFile(adminFile);
    } else {
      res.sendFile(path.join(process.cwd(), "index.html"));
    }
  });

  app.get(["/moments", "/moments.html"], (req, res) => {
    const momentsFile = fs.existsSync(path.join(process.cwd(), "moments.html"))
      ? path.join(process.cwd(), "moments.html")
      : path.join(process.cwd(), "dist", "moments.html");
    if (fs.existsSync(momentsFile)) {
      res.sendFile(momentsFile);
    } else {
      res.sendFile(path.join(process.cwd(), "index.html"));
    }
  });

  app.get(["/discord-callback", "/discord-callback.html"], (req, res) => {
    const callbackFile = fs.existsSync(path.join(process.cwd(), "discord-callback.html"))
      ? path.join(process.cwd(), "discord-callback.html")
      : path.join(process.cwd(), "dist", "discord-callback.html");
    if (fs.existsSync(callbackFile)) {
      res.sendFile(callbackFile);
    } else {
      res.sendFile(path.join(process.cwd(), "index.html"));
    }
  });

  // Development vs Production static / vite serving
  if (process.env.NODE_ENV !== "production") {
    app.use("/assets", express.static(path.join(process.cwd(), "dist/assets")));
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
