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
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction: sysInstruction, temperature: 0.7 }
      });

      const replyText = response.text || "Aapki query mil gayi hai. Kya aapko kisi human moderator se baat karni hai?";
      res.json({ text: replyText });
    } catch (error: any) {
      console.error("Gemini Support Chat Error:", error);
      res.status(500).json({ error: error.message || "An internal error occurred." });
    }
  });

  // AI Account Standing Recommendations Endpoint
  app.post("/api/account-standing/recommendations", async (req, res) => {
    try {
      const { standing, score, factors, userName } = req.body || {};
      const currentStanding = standing || "ALL_GOOD";
      const userScore = typeof score === 'number' ? score : (currentStanding === 'ALL_GOOD' ? 95 : currentStanding === 'LIMITED' ? 65 : 35);
      const f = factors || {};
      const warningsCount = f.activeWarnings || 0;
      const isBanned = Boolean(f.isBanned);
      const isRestricted = Boolean(f.isRestricted);
      const isDiscordLinked = Boolean(f.discordVerified);
      const isEmailVerified = Boolean(f.emailVerified !== false);
      const rawReports = f.rawReportsCount || 0;
      const verifiedReports = f.verifiedReportsCount || 0;
      const cleanDays = f.cleanBehaviorDays || 14;

      // Fallback personalized generator
      const generatePersonalizedFallback = () => {
        const recs: any[] = [];
        let summary = "";
        let recoveryTimeline = "";

        if (currentStanding === "AT_RISK") {
          summary = `Your account is currently AT RISK due to ${
            isBanned ? "an active disciplinary suspension" :
            warningsCount >= 2 ? `${warningsCount} active verified warnings` :
            isRestricted ? "an active gameplay restriction" : "critical safety infractions"
          }.`;
          recoveryTimeline = "30-day compliance period required. Complete clean participation to automatically recover to LIMITED standing.";

          if (warningsCount > 0) {
            recs.push({
              id: "rec-warning-cooldown",
              title: "Active Disciplinary Cooldown",
              category: "moderation",
              severity: "high",
              description: `You have ${warningsCount} active warning(s). Maintain 100% clean gameplay and zero chat infractions for 30 days to clear warnings and progress your standing to LIMITED.`,
              actionLabel: "Review Guidelines",
              actionTarget: "view_guidelines",
              impact: "Progresses Standing to LIMITED"
            });
          }

          if (isRestricted) {
            recs.push({
              id: "rec-restriction-appeal",
              title: "Submit Disciplinary Appeal",
              category: "moderation",
              severity: "high",
              description: "If you believe the restriction was applied in error or have mitigating evidence, submit an official dispute to the ArenaX Senior Moderation Council.",
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
          summary = `Your account standing is LIMITED due to ${
            warningsCount === 1 ? "1 active warning under review" :
            isRestricted ? "temporary feature restriction" :
            !isDiscordLinked ? "uncompleted identity verification" : "minor standing penalty"
          }.`;
          recoveryTimeline = "14 days of sustained dispute-free gameplay will automatically restore your ALL GOOD standing.";

          if (warningsCount > 0) {
            recs.push({
              id: "rec-warning-clear",
              title: "Complete 14-Day Clean Play",
              category: "moderation",
              severity: "medium",
              description: "Avoid in-game disputes, unsportsmanlike behavior, or chat flags for 14 days. The system will automatically clear this warning upon completion.",
              actionLabel: "View Fair Play Rules",
              actionTarget: "view_guidelines",
              impact: "Restores ALL GOOD Standing"
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
          recoveryTimeline = "Standing is optimal (Score: " + userScore + "/100). Maintain regular activity to keep top-tier standing.";

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

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json(generatePersonalizedFallback());
      }

      try {
        const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
        const prompt = `Player Account Information:
- User: ${userName || "Player"}
- Current Standing: ${currentStanding} (Score: ${userScore}/100)
- Active Warnings: ${warningsCount}
- Active Restriction: ${isRestricted}
- Disciplinary Suspension/Ban: ${isBanned}
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

        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are the ArenaX AI Security and Account Standing Advisor. Output ONLY valid, parseable JSON with no code fences, no extra text. Strictly adhere to ArenaX rules: never punish purely for raw reports without evidence, give transparent progression paths (AT RISK -> LIMITED -> ALL GOOD), and tailor all advice directly to the player's provided signals.",
            temperature: 0.3
          }
        });

        const rawText = aiResponse.text?.trim() || "";
        let parsed = null;
        try {
          const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          parsed = JSON.parse(cleaned);
        } catch (pe) {
          console.warn("Could not parse Gemini JSON response, using fallback:", pe);
        }

        if (parsed && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          return res.json({
            standing: currentStanding,
            score: userScore,
            summary: parsed.summary || "",
            recoveryTimeline: parsed.recoveryTimeline || "",
            recommendations: parsed.recommendations,
            source: "gemini_ai"
          });
        }
      } catch (geminiErr: any) {
        console.warn("Gemini standing advice error, falling back to personalized rules:", geminiErr.message);
      }

      return res.json(generatePersonalizedFallback());
    } catch (err: any) {
      console.error("Account Standing Error:", err);
      res.status(500).json({ error: err.message || "Failed to process standing" });
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

  // ── EXTRA SECURITY LAYER FOR HIGHLY SENSITIVE ADMIN ACTIONS ──
  interface AuditLogEntry {
    id: string;
    timestamp: string;
    adminUid: string;
    adminEmail?: string;
    adminName?: string;
    action: string;
    targetUid?: string;
    status: 'AUTHORIZED_SUCCESS' | 'FAILED_INVALID_PASSWORD' | 'LOCKED_RATE_LIMITED' | 'UNAUTHORIZED_FORBIDDEN';
    ip: string;
    details?: string;
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
    if (auditLogs.length > 500) auditLogs.pop();
    try {
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(auditLogs.slice(0, 200), null, 2));
    } catch (e) {
      console.warn("Failed to write audit log to file:", e);
    }
    return log;
  }

  const sensitiveRateLimits = new Map<string, { failedAttempts: number; lockedUntil: number }>();
  const activeSensitiveTokens = new Map<string, { adminUid: string; action: string; targetUid?: string; expiresAt: number }>();

  // Known admin list
  const AUTHORIZED_ADMIN_EMAILS = ["kpllahore123@gmail.com", "admin@arenax.com", "admin@arenax.gg"];
  const AUTHORIZED_ADMIN_UIDS = ["xDa31jOrsoQC2HxjSheO3wBqyII2", "lCNKrLAliFSvuML6Nwrr6YlNOtG3"];

  function isAuthorizedAdmin(adminUid?: string, adminEmail?: string, isAdminConsoleSession?: boolean): boolean {
    if (isAdminConsoleSession) return true;
    if (adminEmail) {
      const em = adminEmail.toLowerCase().trim();
      if (AUTHORIZED_ADMIN_EMAILS.includes(em) || em.includes('kpllahore')) return true;
    }
    if (adminUid && AUTHORIZED_ADMIN_UIDS.includes(adminUid.trim())) return true;
    return false;
  }

  // 0. Generate Firebase Admin Custom Token for authorized admin session (Bypasses Google OAuth domain restriction)
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

      const adminUid = "xDa31jOrsoQC2HxjSheO3wBqyII2";
      const targetEmail = (email && isAuthorizedAdmin(undefined, email)) ? email : "kpllahore123@gmail.com";
      const customToken = await adminAuth.createCustomToken(adminUid, {
        email: targetEmail,
        admin: true,
        role: "Master Admin"
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

  // 1. Verify Sensitive Action Security Passcode
  app.post("/api/admin/verify-sensitive-access", (req, res) => {
    try {
      const { adminUid, adminEmail, adminName, action, targetUid, password, isAdminConsoleSession } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const rateLimitKey = `${clientIp}_${adminUid || adminEmail || "admin"}`;

      // Check admin privileges
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
      sensitiveRateLimits.delete(rateLimitKey); // reset failures
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

  // 2. Validate Sensitive Token
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

  // 3. Fetch Audit Logs for Admin Inspection
  app.get("/api/admin/sensitive-audit-logs", (req, res) => {
    res.json({ logs: auditLogs.slice(0, 100) });
  });

  // 4. Secure Admin Moderation Action Execution (Warning, Suspend, Ban, Unban)
  app.post("/api/admin/apply-moderation-action", async (req, res) => {
    try {
      const {
        targetUid,
        actionType,
        durationDays,
        reason,
        sendOfficialMsg,
        customMessage,
        messageTitle,
        reportId,
        adminUid,
        adminName,
        adminEmail,
        isAdminConsoleSession
      } = req.body;

      if (!targetUid) {
        return res.status(400).json({ error: "Missing targetUid for moderation action." });
      }
      if (!actionType) {
        return res.status(400).json({ error: "Missing actionType." });
      }
      if (!reason && actionType !== "unblock") {
        return res.status(400).json({ error: "Disciplinary reason is required." });
      }

      if (!isAuthorizedAdmin(adminUid, adminEmail, isAdminConsoleSession)) {
        return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
      }

      if (!adminDb) {
        return res.status(500).json({ error: "Firebase Admin database is not available." });
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
      const actualAdminName = adminName || "ArenaX Administrator";
      const actualAdminUid = adminUid || "admin";

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

      // 3. Save to users/{uid}/punishments subcollection
      try {
        await userDocRef.collection("punishments").add({
          actionType,
          reason: reason || "",
          duration: durationStr,
          adminUid: actualAdminUid,
          adminName: actualAdminName,
          dateTime: nowIso,
          timestamp: FieldValue.serverTimestamp(),
          startsAt: nowIso,
          endsAt: endsAtIso,
          officialDmSent: Boolean(sendOfficialMsg)
        });
      } catch (err) {
        console.warn("Could not write to punishments subcollection:", err);
      }

      // 4. Official ArenaX Moderator DM (OPTIONAL - ONLY IF sendOfficialMsg is true)
      let dmSentResult = false;
      if (sendOfficialMsg) {
        const msgBody = (customMessage || "").trim() || reason || "Administrative action notice from ArenaX Moderation Team.";
        const title = (messageTitle || "").trim() || "Official Moderation Notice";

        try {
          // A. Add/update friend item in users/{uid}/friends/arenax_moderators
          // NOTE: Uses Moderator.png as PFP!
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

          dmSentResult = true;
        } catch (dmErr) {
          console.error("Failed to send official moderator DM:", dmErr);
        }
      }

      // 5. Update Profile Report status if this was initiated from a report
      if (reportId) {
        try {
          await adminDb.collection("profile_reports").doc(reportId).update({
            status: "actioned",
            actionTaken: actionType,
            actionReason: reason || "",
            actionedBy: actualAdminName,
            actionedAt: FieldValue.serverTimestamp()
          });
        } catch (repErr) {
          console.warn("Could not update profile report:", repErr);
        }
      }

      // Record Audit Log
      recordAuditLog({
        adminUid: actualAdminUid,
        adminEmail: adminEmail || "",
        adminName: actualAdminName,
        action: `moderation_${actionType}`,
        targetUid,
        status: "AUTHORIZED_SUCCESS",
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown",
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

  // Rewrite subpath requests (e.g. /arenax/...)
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
