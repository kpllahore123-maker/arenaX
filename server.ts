import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeDiscordBot, botLogs, botStats, getBotConfig, saveBotConfig } from "./discord-bot.ts";

dotenv.config();

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

  // Discord Bot APIs
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
  const AUTHORIZED_ADMIN_EMAILS = ["kpllahore123@gmail.com"];
  const AUTHORIZED_ADMIN_UIDS = ["xDa31jOrsoQC2HxjSheO3wBqyII2", "lCNKrLAliFSvuML6Nwrr6YlNOtG3"];

  function isAuthorizedAdmin(adminUid?: string, adminEmail?: string, isAdminConsoleSession?: boolean): boolean {
    if (isAdminConsoleSession) return true;
    if (adminEmail && AUTHORIZED_ADMIN_EMAILS.includes(adminEmail.toLowerCase().trim())) return true;
    if (adminUid && AUTHORIZED_ADMIN_UIDS.includes(adminUid.trim())) return true;
    return false;
  }

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
