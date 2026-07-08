import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Support Chat API endpoint utilizing Gemini
  app.post("/api/support-chat", async (req, res) => {
    try {
      const { message, history, userProfile, tournaments } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured in the environment. Please add it in Settings > Secrets." 
        });
      }

      // Initialize Gemini client with proper User-Agent telemetry
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct system instruction with live app context
      const sysInstruction = `You are 'ArenaX Support AI', a professional, friendly customer support chatbot for ArenaX, the premier mobile gaming tournaments platform.
Your primary role is to answer player questions about ArenaX. Use the live context below to personalize your response.

Player Profile:
- Name: ${userProfile?.name || 'Anonymous'}
- Handle: @${userProfile?.handle || 'anonymous'}
- Wallet Balance: ${userProfile?.balance !== undefined ? userProfile.balance.toLocaleString() : 0} AX Coins
- Account Type: ${userProfile?.premium ? 'Premium VIP' : 'Regular Player'}

Available Tournaments:
${(tournaments || []).slice(0, 5).map((t: any) => `- "${t.name}" (${t.game || 'Grand RP'}), Entry Fee: ${t.entryFee || 'Free'}, Prize: ${t.prize || 'N/A'}, Status: ${t.status}, Registered: ${t.registered || 0}/${t.maxPlayers || 100}`).join('\n')}

Rules and Guidance:
1. Deposits:
   - JazzCash: Send to "0302-4686897", save the Txn ID, then submit a deposit request in Wallet tab with PKR and Txn ID.
   - EasyPaisa: Send to "0315-9876543", save the Txn ID, then submit a deposit request in Wallet tab.
   - Minimum deposit is Rs 50.
2. Withdrawals:
   - Go to Wallet -> Withdraw, enter amount of AX Coins. Transfers process within 24-48 hours.
3. Cheater Reporting:
   - Click the "Report Hack/Cheat" button below the tournament card, enter hacker details and proof links (screen records).
4. Premium VIP plans:
   - Costs 150 AX. Upgrades grant exclusive premium badge, custom banner themes, name color options, and priority support.
5. Tournaments:
   - Choose a tournament and join. Admins will verify your slot and approve it.

CRITICAL INSTRUCTIONS:
- Answer friendly, politely, and concisey (under 3-4 sentences max).
- Speak in Roman Urdu/Hindi (written in English script) or English, depending on how the user speaks. For example: "Aapka balance abhi 150 AX Coins hai" or "JazzCash deposit details ke liye Wallet tab check karein."
- **ESCALATION RULE**: If the user has a major/complex issue (like a transaction failed/stuck, account suspended, refund missing, clear signs of distress/errors, or if they explicitly ask for a human, admin, or moderator - e.g., 'agent', 'human', 'admin', 'mod', 'fuzool bot', 'connect me', 'call admin'), you MUST reply with a comforting message saying you are connecting them to a human moderator/administrator, AND you MUST include the exact uppercase word '[ESCALATE]' somewhere in your reply. This is crucial for the frontend to transfer the chat to a human admin.

Be human-like, supportive, and extremely clear.`;

      // Map history to Gemini format
      const contents: any[] = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach((h: any) => {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        });
      }

      // Add the latest message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      // Query Gemini
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "Aapki query mil gayi hai. Kya aapko kisi human moderator se baat karni hai?";
      res.json({ text: replyText });
    } catch (error: any) {
      console.error("Gemini Support Chat Error:", error);
      res.status(500).json({ error: error.message || "An internal error occurred." });
    }
  });

  // Middleware to handle subpath rewrites (like /arenax/ or /arenaX/)
  app.use((req, res, next) => {
    const subpathRegex = /^\/(arenax|arenaX)(\/|$)/i;
    if (subpathRegex.test(req.url)) {
      const originalUrl = req.url;
      req.url = req.url.replace(subpathRegex, '/');
      req.originalUrl = req.url;
      console.log(`Rewrote subpath request from ${originalUrl} to ${req.url}`);
    }
    next();
  });

  // Explicit route handlers for Admin Panel
  app.get(["/admin", "/admin.html"], (req, res) => {
    if (process.env.NODE_ENV !== "production") {
      res.sendFile(path.join(process.cwd(), "admin.html"));
    } else {
      res.sendFile(path.join(process.cwd(), "dist", "admin.html"));
    }
  });

  // Serve static files and support Vite in Dev
  if (process.env.NODE_ENV !== "production") {
    // Serve compiled assets as fallback in development to support cached production pages
    app.use('/assets', express.static(path.join(process.cwd(), 'dist/assets')));
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
