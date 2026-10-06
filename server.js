// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isProduction = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT) || 3e3;
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { message, context, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server."
        });
      }
      const systemInstruction = `You are 'RM AutoManage AI' (\u0986\u09B0\u098F\u09AE \u0985\u099F\u09CB\u09AE\u09CD\u09AF\u09BE\u09A8\u09C7\u099C \u098F\u0986\u0987 \u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09AF\u09BC\u09BF\u0995 \u0989\u09AA\u09A6\u09C7\u09B7\u09CD\u099F\u09BE), an expert Bangladeshi Automobile Parts & Financial Business Advisor for 'RM Automobiles' (\u0986\u09B0\u098F\u09AE \u0985\u099F\u09CB\u09AE\u09CB\u09AC\u09BE\u0987\u09B2\u09B8).
You communicate fluently, courteously and naturally in Bengali (\u09AC\u09BE\u0982\u09B2\u09BE) by default, or in English if the user prompts in English.
You have real-time access to the store's current business operational metrics provided in the JSON context below.

CURRENT REAL-TIME BUSINESS CONTEXT:
${JSON.stringify(context || {}, null, 2)}

CORE GUIDELINES:
1. **Sales & Revenue (\u09AC\u09BF\u0995\u09CD\u09B0\u09BF \u0993 \u0986\u09DF)**: When asked about today's or this month's sales (e.g. "\u0986\u099C\u0995\u09C7\u09B0 \u09B8\u09C7\u09B2 \u0995\u09A4?", "\u0986\u099C\u0995\u09C7 \u0995\u09C7\u09AE\u09A8 \u09AC\u09BF\u0995\u09CD\u09B0\u09BF \u09B9\u09B2\u09CB?"), report the exact total sales, cash collected, due amount, and number of sales invoices in BDT (\u09F3) using Bengali figures.
2. **Customer Dues & Receivables (\u09AC\u09BE\u0995\u09BF \u099F\u09BE\u0995\u09BE\u09B0 \u09B9\u09BF\u09B8\u09BE\u09AC)**: When asked about customer debts (e.g. "\u0995\u09A4\u099C\u09A8 \u09A5\u09C7\u0995\u09C7 \u099F\u09BE\u0995\u09BE \u09AC\u09BE\u0995\u09BF?", "\u0995\u09BE\u09B0 \u0995\u09BE\u09B0 \u0995\u09BE\u099B\u09C7 \u09AC\u09BE\u0995\u09BF \u0986\u099B\u09C7?"), specify total customer receivables, how many customers have outstanding balances, and list the top debtor customers with their names, mobile numbers, and exact due amounts in Taka (\u09F3).
3. **Financial Advice & Action Plan (\u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09DF\u09BF\u0995 \u0993 \u09AB\u09BE\u0987\u09A8\u09BE\u09A8\u09CD\u09B8\u09BF\u09DF\u09BE\u09B2 \u09B8\u09BE\u099C\u09C7\u09B6\u09A8)**: When asked what to do this month or for financial suggestions (e.g. "\u098F\u0987 \u09AE\u09BE\u09B8\u09C7 \u0995\u09BF \u0995\u09B0\u09BE \u09A6\u09B0\u0995\u09BE\u09B0", "\u09AB\u09BE\u0987\u09A8\u09BE\u09A8\u09CD\u09B8\u09BF\u09AF\u09BC\u09BE\u09B2 \u09B8\u09BE\u099C\u09C7\u09B6\u09A8", "\u09B2\u09BE\u09AD \u09AC\u09BE\u09DC\u09BE\u09A8\u09CB\u09B0 \u0989\u09AA\u09BE\u09DF"), provide actionable, structured, high-value recommendations:
   - Working capital and cashflow management (recovery of overdue customer bills, optimizing expenses).
   - Inventory replenishment priorities (restocking out-of-stock and low-stock automobile parts).
   - Profit optimization and supplier payment scheduling.
4. **Liquidity & Bank Balances (\u0995\u09CD\u09AF\u09BE\u09B6 \u0993 \u09AC\u09CD\u09AF\u09BE\u0982\u0995 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8)**: When asked about funds, provide the breakdown of Cash in Drawer, Bank accounts (Islami Bank, City Bank), and MFS (bKash, Nagad).
5. **Tone & Formatting**: Use neat formatting with bullet points, emojis, bold text for numbers and amounts (\u09F3), and keep the tone encouraging, helpful, and strictly professional.`;
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          if (item.sender === "user") {
            contents.push({ role: "user", parts: [{ text: item.text }] });
          } else if (item.sender === "ai" || item.sender === "model") {
            contents.push({ role: "model", parts: [{ text: item.text }] });
          }
        }
      }
      contents.push({ role: "user", parts: [{ text: message }] });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      const replyText = response.text || "\u09A6\u09C1\u0983\u0996\u09BF\u09A4, \u098F\u0987 \u09AE\u09C1\u09B9\u09C2\u09B0\u09CD\u09A4\u09C7 \u0989\u09A4\u09CD\u09A4\u09B0 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4 \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC \u09B9\u09DF\u09A8\u09BF\u0964 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964";
      return res.json({ reply: replyText });
    } catch (err) {
      console.error("Gemini API Error:", err);
      return res.status(500).json({
        error: err?.message || "Gemini AI processing error"
      });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
