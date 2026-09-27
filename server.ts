import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // AI initialization with required User-Agent header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API Endpoint for Business Analysis & Financial Advice
  app.post('/api/ai/analysis', async (req, res) => {
    try {
      const { message, context, history } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      const systemInstruction = `You are 'RM AutoManage AI' (আরএম অটোম্যানেজ এআই ব্যবসায়িক উপদেষ্টা), an expert Bangladeshi Automobile Parts & Financial Business Advisor for 'RM Automobiles' (আরএম অটোমোবাইলস).
You communicate fluently, courteously and naturally in Bengali (বাংলা) by default, or in English if the user prompts in English.
You have real-time access to the store's current business operational metrics provided in the JSON context below.

CURRENT REAL-TIME BUSINESS CONTEXT:
${JSON.stringify(context || {}, null, 2)}

CORE GUIDELINES:
1. **Sales & Revenue (বিক্রি ও আয়)**: When asked about today's or this month's sales (e.g. "আজকের সেল কত?", "আজকে কেমন বিক্রি হলো?"), report the exact total sales, cash collected, due amount, and number of sales invoices in BDT (৳) using Bengali figures.
2. **Customer Dues & Receivables (বাকি টাকার হিসাব)**: When asked about customer debts (e.g. "কতজন থেকে টাকা বাকি?", "কার কার কাছে বাকি আছে?"), specify total customer receivables, how many customers have outstanding balances, and list the top debtor customers with their names, mobile numbers, and exact due amounts in Taka (৳).
3. **Financial Advice & Action Plan (ব্যবসায়িক ও ফাইনান্সিয়াল সাজেশন)**: When asked what to do this month or for financial suggestions (e.g. "এই মাসে কি করা দরকার", "ফাইনান্সিয়াল সাজেশন", "লাভ বাড়ানোর উপায়"), provide actionable, structured, high-value recommendations:
   - Working capital and cashflow management (recovery of overdue customer bills, optimizing expenses).
   - Inventory replenishment priorities (restocking out-of-stock and low-stock automobile parts).
   - Profit optimization and supplier payment scheduling.
4. **Liquidity & Bank Balances (ক্যাশ ও ব্যাংক ব্যালেন্স)**: When asked about funds, provide the breakdown of Cash in Drawer, Bank accounts (Islami Bank, City Bank), and MFS (bKash, Nagad).
5. **Tone & Formatting**: Use neat formatting with bullet points, emojis, bold text for numbers and amounts (৳), and keep the tone encouraging, helpful, and strictly professional.`;

      // Build conversation contents including history
      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          if (item.sender === 'user') {
            contents.push({ role: 'user', parts: [{ text: item.text }] });
          } else if (item.sender === 'ai' || item.sender === 'model') {
            contents.push({ role: 'model', parts: [{ text: item.text }] });
          }
        }
      }
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || 'দুঃখিত, এই মুহূর্তে উত্তর প্রস্তুত করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
      return res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(500).json({
        error: err?.message || 'Gemini AI processing error',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Vite middleware in development or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
