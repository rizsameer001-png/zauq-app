import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
app.set("trust proxy", true);
const PORT = 3000;

app.use(express.json());

// Set up local storage for uploaded attachments/PDFs/images/audio
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Configure multer storage
const storageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${baseName}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage: storageEngine });

// Lazy-loaded GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
const GEMINI_MODEL = "gemini-2.5-flash";

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to support health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API endpoint for file uploads
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }
    const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
    const xProto = req.headers["x-forwarded-proto"];
    const protocol = (typeof xProto === "string" && xProto) || (host.includes("localhost") ? "http" : "https");
    
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ error: err.message || "File upload failed." });
  }
});

// API endpoint for Beit-Bazi poetry game
app.post("/api/gemini/beit-bazi", async (req, res) => {
  try {
    const { userCouplet, history } = req.body;
    if (!userCouplet) {
      return res.status(400).json({ error: "Couplet is required." });
    }

    const ai = getAIClient();
    
    // Prompt instructs Gemini to act as a friendly, expert Urdu poet opponent
    const systemInstruction = `You are a master of Urdu literature, poetry (Shayari), and the traditional game of 'Beit-Bazi'.
In Beit-Bazi, your opponent recites a couplet (Sher), and you must respond with a couplet that starts with the last letter (in Urdu/Persian alphabet, or the phonetic equivalent) of their couplet.

Your task:
1. Analyze the user's couplet (it might be in Urdu script, Devanagari, or Roman English transliteration).
2. Determine the last letter of their couplet.
3. Choose a beautiful, classic Urdu couplet (Sher) starting with that letter. Prefer legendary poets like Mohammad Ibrahim Zauq, Mirza Ghalib, Allama Iqbal, Faiz Ahmed Faiz, or Mir Taqi Mir.
4. Provide a structured response containing:
   - The detected last letter (both English and Urdu alphabet, e.g. "Nūn" / "ن" or "Ye" / "ی").
   - Your response couplet in:
     - Beautiful Urdu script (Nasta'liq equivalent text)
     - Roman English transliteration (phonetic spelling)
     - English Translation
   - The name of the poet (e.g. Ibrahim Zauq).
   - A short, beautiful explanation of your couplet's meaning (1-2 sentences).
   - An encouraging, witty, or poetic remark to keep the game exciting.

Ensure the response is strictly valid JSON conforming to the schema.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `User's Couplet: "${userCouplet}"\nPrevious game history for context: ${JSON.stringify(history || [])}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLetterUrdu: { type: Type.STRING, description: "The Urdu letter detected at the end of user's poetry" },
            detectedLetterEnglish: { type: Type.STRING, description: "The English phonetic name of the detected letter" },
            botCoupletUrdu: { type: Type.STRING, description: "The bot's responding couplet in Urdu script" },
            botCoupletRoman: { type: Type.STRING, description: "The bot's responding couplet in Roman Urdu" },
            botCoupletEnglish: { type: Type.STRING, description: "The English translation of the bot's couplet" },
            poet: { type: Type.STRING, description: "The writer of the bot's couplet" },
            explanation: { type: Type.STRING, description: "A elegant explanation of the couplet's depth/concept" },
            dialogue: { type: Type.STRING, description: "A poetic or encouraging retort to the user" },
            nextStartingLetter: { type: Type.STRING, description: "The letter the user must start their next couplet with" }
          },
          required: [
            "detectedLetterUrdu",
            "detectedLetterEnglish",
            "botCoupletUrdu",
            "botCoupletRoman",
            "botCoupletEnglish",
            "poet",
            "explanation",
            "dialogue",
            "nextStartingLetter"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response generated from Gemini.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in Beit-Bazi endpoint:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating poetry." });
  }
});

// API endpoint for AI Poetry Advisor / Helper (Ustaad-e-Zauq)
app.post("/api/gemini/poetry-assist", async (req, res) => {
  try {
    const { prompt, incompletePoetry, mode } = req.body;
    // Modes: 'complete' (finish a couplet), 'criticism' (Islaah - analyze and fix rhythm/theme), 'rhymes' (find Qafia/Radeef)
    
    if (!prompt && !incompletePoetry) {
      return res.status(400).json({ error: "Please provide a prompt or some poetry." });
    }

    const ai = getAIClient();

    const systemInstruction = `You are 'Ustaad-e-Zauq', an AI poetry mentor (Ustaad) embodying the classical, sophisticated style of Mohammad Ibrahim Zauq (the royal poet of the Mughal court). Your role is to assist aspiring poets in crafting, refining, and understanding Urdu poetry (Ghazal/Nazm).

Depending on the mode:
1. 'complete': The user will provide a single line (Misra) or fragment. Complete the couplet (recite the second Misra) adhering to proper meter (Behr), rhyme (Qafia), and refrain (Radeef).
2. 'criticism' (Islaah): Analyze the user's couplet for rhyme correctness, rhythm, meter flow, and emotional weight. Provide constructive, respectful advice on how to improve it, along with a polished version.
3. 'rhymes' (Qafia): Provide a list of beautiful rhyming words (Qafia) that fit the theme and meter, and explain how to use them with an example couplet.

Always communicate with immense grace, using elegant and respectful literary phrasing.
Provide the response as JSON conforming strictly to the schema.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Mode: ${mode}\nUser Input: ${incompletePoetry || ""}\nUser Instructions/Context: ${prompt || ""}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A poetic title for this mentorship session" },
            analysis: { type: Type.STRING, description: "Ustaad's assessment, explanation of rules, or poetic review" },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  urdu: { type: Type.STRING, description: "Suggested poetry line or example couplet in Urdu script" },
                  roman: { type: Type.STRING, description: "Suggested line/couplet in Roman Urdu" },
                  english: { type: Type.STRING, description: "English translation" },
                  poeticContext: { type: Type.STRING, description: "Why this fits, what meter/emotion it conveys" }
                },
                required: ["urdu", "roman", "english", "poeticContext"]
              },
              description: "A list of beautiful completions, rhyming examples, or improved versions"
            },
            ustadsWords: { type: Type.STRING, description: "A final courtly blessing, advice, or greeting in the signature style of Ustaad Zauq" }
          },
          required: ["title", "analysis", "suggestions", "ustadsWords"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No feedback generated.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in Poetry Assist endpoint:", error);
    res.status(500).json({ error: error.message || "An error occurred in poetry mentorship." });
  }
});

// API endpoint for Urdu Word lookup (Zauq-e-Lafz)
app.post("/api/gemini/word-lookup", async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required." });
    }

    const ai = getAIClient();

    const systemInstruction = `You are a lexicographer of classical Urdu literature. Break down the requested Urdu word into a highly aesthetic, educational profile.
Provide:
- The word in Urdu script.
- The Roman spelling and English phonetic pronunciation.
- The literal meaning and poetic/literary connotations (refined, deep meanings).
- Its origins/etymology (e.g. Persian, Arabic, Sanskrit, Turkish).
- A famous classical couplet (Sher) featuring this word, with its poet, Roman Urdu translation, and English translation.
- A short sentence on how the word encapsulates 'Zauq' (delight, taste, or aesthetic sense).

Respond in JSON conforming to the schema.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Explain the word: "${word}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            wordUrdu: { type: Type.STRING },
            wordRoman: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            meanings: { type: Type.ARRAY, items: { type: Type.STRING } },
            etymology: { type: Type.STRING },
            zauqPerspective: { type: Type.STRING },
            poeticUsage: {
              type: Type.OBJECT,
              properties: {
                sherUrdu: { type: Type.STRING },
                sherRoman: { type: Type.STRING },
                sherEnglish: { type: Type.STRING },
                poet: { type: Type.STRING }
              },
              required: ["sherUrdu", "sherRoman", "sherEnglish", "poet"]
            }
          },
          required: ["wordUrdu", "wordRoman", "pronunciation", "meanings", "etymology", "zauqPerspective", "poeticUsage"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response generated.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error in word lookup endpoint:", error);
    res.status(500).json({ error: error.message || "An error occurred during word lookup." });
  }
});

// Set up Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up static serving in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zauq Server running on http://localhost:${PORT}`);
  });
}

startServer();
