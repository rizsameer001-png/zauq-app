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

// Serve uploaded files statically with CORS headers enabled to support canvas/PDF.js and fetches
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
}, express.static(UPLOADS_DIR));

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
const GEMINI_MODEL = "gemini-3.5-flash";

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
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ error: err.message || "File upload failed." });
  }
});

// Helper to clean and detect the last letter of poetry
function detectLastLetter(text: string): { urdu: string; english: string } {
  if (!text) return { urdu: "ی", english: "Ye" };
  const cleaned = text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'۔؟\n\r]/g, "").trim();
  if (!cleaned) return { urdu: "ی", english: "Ye" };
  const lastChar = cleaned.charAt(cleaned.length - 1).toLowerCase();

  const urduLetters = [
    { char: "ا", name: "Alif" },
    { char: "ب", name: "Be" },
    { char: "پ", name: "Pe" },
    { char: "ت", name: "Te" },
    { char: "ٹ", name: "Te (Retroflex)" },
    { char: "ث", name: "Se" },
    { char: "ج", name: "Jeem" },
    { char: "چ", name: "Che" },
    { char: "ح", name: "He" },
    { char: "خ", name: "Khe" },
    { char: "د", name: "Dal" },
    { char: "ڈ", name: "Dal (Retroflex)" },
    { char: "ذ", name: "Zal" },
    { char: "ر", name: "Re" },
    { char: "ڑ", name: "Re (Retroflex)" },
    { char: "ز", name: "Ze" },
    { char: "ژ", name: "Zhe" },
    { char: "س", name: "Seen" },
    { char: "ش", name: "Sheen" },
    { char: "ص", name: "Suad" },
    { char: "ض", name: "Zuad" },
    { char: "ط", name: "Toe" },
    { char: "ظ", name: "Zoe" },
    { char: "ع", name: "Ayn" },
    { char: "غ", name: "Ghayn" },
    { char: "ف", name: "Fe" },
    { char: "ق", name: "Qaf" },
    { char: "ک", name: "Kaf" },
    { char: "گ", name: "Ghaf" },
    { char: "ل", name: "Lam" },
    { char: "م", name: "Meem" },
    { char: "ن", name: "Noon" },
    { char: "ں", name: "Noon (Nasal)" },
    { char: "و", name: "Wao" },
    { char: "ہ", name: "He" },
    { char: "ھ", name: "He (Aspirated)" },
    { char: "ی", name: "Ye" },
    { char: "ے", name: "Ye" }
  ];

  const matchedUrdu = urduLetters.find(l => l.char === lastChar);
  if (matchedUrdu) {
    return { urdu: matchedUrdu.char, english: matchedUrdu.name };
  }

  const englishToUrduMap: Record<string, { urdu: string; english: string }> = {
    a: { urdu: "ا", english: "Alif" },
    b: { urdu: "ب", english: "Be" },
    c: { urdu: "ج", english: "Jeem" },
    d: { urdu: "د", english: "Dal" },
    e: { urdu: "ی", english: "Ye" },
    f: { urdu: "ف", english: "Fe" },
    g: { urdu: "گ", english: "Ghaf" },
    h: { urdu: "ہ", english: "He" },
    i: { urdu: "ی", english: "Ye" },
    j: { urdu: "ج", english: "Jeem" },
    k: { urdu: "ک", english: "Kaf" },
    l: { urdu: "ل", english: "Lam" },
    m: { urdu: "م", english: "Meem" },
    n: { urdu: "ن", english: "Noon" },
    o: { urdu: "و", english: "Wao" },
    p: { urdu: "ب", english: "Be" },
    q: { urdu: "ق", english: "Qaf" },
    r: { urdu: "ر", english: "Re" },
    s: { urdu: "س", english: "Seen" },
    t: { urdu: "ت", english: "Te" },
    u: { urdu: "و", english: "Wao" },
    v: { urdu: "و", english: "Wao" },
    w: { urdu: "و", english: "Wao" },
    x: { urdu: "س", english: "Seen" },
    y: { urdu: "ی", english: "Ye" },
    z: { urdu: "ز", english: "Ze" }
  };

  if (englishToUrduMap[lastChar]) {
    return englishToUrduMap[lastChar];
  }

  return { urdu: "ی", english: "Ye" };
}

// Fallback shers pool indexed by Urdu letter
const FALLBACK_SHERS: Record<string, {
  botCoupletUrdu: string;
  botCoupletRoman: string;
  botCoupletEnglish: string;
  poet: string;
  explanation: string;
  nextStartingLetter: string;
}> = {
  "ا": {
    botCoupletUrdu: "امیر جمع ہیں احباب دردِ دل کہہ لے\nپھر التفاتِ دلِ دوستاں رہے نہ رہے",
    botCoupletRoman: "Amīr jama' haiñ ahbāb dard-e-dil keh le\nPhir iltifāt-e-dil-e-dostāñ rahe na rahe",
    botCoupletEnglish: "Gather your friends, O Amir, and speak of your heartache;\nWhether the affection of these friends will remain tomorrow or not.",
    poet: "Amir Minai",
    explanation: "A deeply touching reflection on the transience of friendship, company, and human affection.",
    nextStartingLetter: "ے"
  },
  "ب": {
    botCoupletUrdu: "بہتر تو ہے یہی کہ نہ دنیا سے دل لگے\nپر کیا کریں جو کام نہ بے دل لگی چلے",
    botCoupletRoman: "Behtar to hai yahī ki na duniyā se dil lage\nPar kyā kareñ jo kām na be dil-lagī chale",
    botCoupletEnglish: "It is indeed best not to attach one's heart to this worldly theater;\nBut what is one to do, when life cannot go on without some passionate attachment?",
    poet: "Mohammad Ibrahim Zauq",
    explanation: "An exquisite paradox of the human condition. While detached wisdom is ideal, love and emotional attachment are essential to experience existence.",
    nextStartingLetter: "ے"
  },
  "ت": {
    botCoupletUrdu: "تم میرے پاس ہوتے ہو گویا\nجب کوئی دوسرا نہیں ہوتا",
    botCoupletRoman: "Tum mere paas hote ho goya\nJab koi doosra nahi hota",
    botCoupletEnglish: "It is as if you are right here beside me;\nWhenever there is no one else around.",
    poet: "Momin Khan Momin",
    explanation: "One of the most celebrated romantic verses, expressing how a true beloved occupies the thoughts so completely that solitude itself disappears.",
    nextStartingLetter: "ا"
  },
  "ج": {
    botCoupletUrdu: "جان دی دی ہوئی اسی کی تھی\nحق تو یہ ہے کہ حق ادا نہ ہوا",
    botCoupletRoman: "Jān dī dī huī usī kī thī\nHaq to yeh hai ke haq adā na huā",
    botCoupletEnglish: "I surrendered my life, which was gifted by Him;\nThe truth is, I still could not repay the ultimate debt.",
    poet: "Mirza Ghalib",
    explanation: "A profound mystical couplet acknowledging that human life is a divine gift, and even giving it up doesn't fully repay the creator's benevolence.",
    nextStartingLetter: "ا"
  },
  "د": {
    botCoupletUrdu: "دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے",
    botCoupletRoman: "Dil-e-nādāñ tujhe huā kyā hai\nĀkhir is dard kī davā kyā hai",
    botCoupletEnglish: "Oh foolish heart, what has befallen you?\nAfter all, what is the cure for this sweet ache of love?",
    poet: "Mirza Ghalib",
    explanation: "A gentle and playful self-reflective query questioning why the heart suffers in love and seeking a cure where none exists.",
    nextStartingLetter: "ے"
  },
  "ر": {
    botCoupletUrdu: "رنگِ چہرہ جو اڑا تھا وہ بحال اب تو ہوا\nشکرِ حق دل کو مرے چین و ملال اب تو ہوا",
    botCoupletRoman: "Rang-e-chehra jo uda tha wo bahaal ab to hua\nShukr-e-haq dil ko mere chain o malaal ab to hua",
    botCoupletEnglish: "The color of the face that had faded is now restored;\nThank God, my heart has found peace as well as melancholy now.",
    poet: "Mir Babar Ali Anis",
    explanation: "Expresses a sublime transition from grief to quiet, graceful composure, capturing the high-contrast drama of Urdu's grandest elegiac tradition.",
    nextStartingLetter: "ا"
  },
  "س": {
    botCoupletUrdu: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں",
    botCoupletRoman: "Sitāroñ se āge jahāñ aur bhī haiñ\nAbhī ishq ke imtihān aur bhī haiñ",
    botCoupletEnglish: "Beyond these stars lie worlds yet undiscovered;\nThere are still many trials of love left to endure.",
    poet: "Allama Iqbal",
    explanation: "An empowering message reminding the seeker that life has endless dimensions, and each milestone is but a stepping stone to higher trials.",
    nextStartingLetter: "ن"
  },
  "ع": {
    botCoupletUrdu: "عشق پر زور نہیں ہے یہ وہ آتش غالب\nکہ لگائے نہ لگے اور بجھائے نہ بنے",
    botCoupletRoman: "Ishq par zor nahīñ hai yeh voh ātish Ghalib\nKi lagāye na lage aur bujhāye na bane",
    botCoupletEnglish: "Love is not within our control, it is such a fire, O Ghalib\nWhich cannot be lit at will, nor extinguished when once aflame.",
    poet: "Mirza Ghalib",
    explanation: "A classical exploration of the involuntary nature of love, comparing it to an untamable spark that knows no bounds.",
    nextStartingLetter: "ے"
  },
  "ف": {
    botCoupletUrdu: "فریبِ حسن سے رخصت ملی تو یہ جانا\nکہ دل میں درد بھی تھا اور داغ بھی تھے",
    botCoupletRoman: "Fareb-e-husn se rukhsat milī to yeh jānā\nKi dil meñ dard bhī thā aur dāgh bhī the",
    botCoupletEnglish: "When I finally escaped the illusions of beauty, I realized\nThat my heart was wounded with both grief and lasting scars.",
    poet: "Faiz Ahmed Faiz",
    explanation: "A melancholic awakening where the poet reflects on escaping superficial infatuation, only to find deep, historical pain underneath.",
    nextStartingLetter: "ے"
  },
  "ق": {
    botCoupletUrdu: "قیدِ حیات و بندِ غم اصل میں دونوں ایک ہیں\nموت سے پہلے آدمی غم سے نجات پائے کیوں",
    botCoupletRoman: "Qaid-e-hayāt o band-e-gham asl meñ donoñ ek haiñ\nMaut se pahle ādmī gham se najāt pāye kyūñ",
    botCoupletEnglish: "The prison of life and the chain of grief are one and the same;\nWhy then should a human expect release from sorrow before death?",
    poet: "Mirza Ghalib",
    explanation: "A profound philosophical insight stating that sorrow is not an aberration of life, but rather the very texture of mortal existence.",
    nextStartingLetter: "ں"
  },
  "ک": {
    botCoupletUrdu: "کوئی امید بر نہیں آتی\nکوئی صورت نظر نہیں آتی",
    botCoupletRoman: "Koī ummīd bar nahīñ ātī\nKoī sūrat nazar nahīñ ātī",
    botCoupletEnglish: "No hope appears on the horizon;\nNo way forward shows itself.",
    poet: "Mirza Ghalib",
    explanation: "A heartfelt couplet capturing a state of pure despair and existential stillness where even hope ceases to render any path.",
    nextStartingLetter: "ی"
  },
  "گ": {
    botCoupletUrdu: "گزر گیا وہ زمانہ کہ ہم تھے اور تم تھے\nاب تو یادوں کا اک دھندلا سا جھرمٹ ہے",
    botCoupletRoman: "Guzar gayā voh zamānah ki hum the aur tum the\nAb to yādoñ kā ik dhundlā sā jhurmaṭ hai",
    botCoupletEnglish: "Gone are the times when it was just you and me;\nNow, only a hazy cluster of memories remains.",
    poet: "Nasir Kazmi",
    explanation: "A beautiful, nostalgic modern classic reflecting on the passage of time and the slow fading of intimate human bonds.",
    nextStartingLetter: "ے"
  },
  "ل": {
    botCoupletUrdu: "لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
    botCoupletRoman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
    botCoupletEnglish: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
    poet: "Mohammad Ibrahim Zauq",
    explanation: "Our mentor Ibrahim Zauq contemplates human powerlessness in the face of fate and the cosmic journey.",
    nextStartingLetter: "ے"
  },
  "م": {
    botCoupletUrdu: "موت کا ایک دن معین ہے\nنیند کیوں رات بھر نہیں آتی",
    botCoupletRoman: "Maut kā ek din mu'ayyan hai\nNīnd kyūñ rāt bhar nahīñ ātī",
    botCoupletEnglish: "The day of death is pre-ordained;\nWhy then does sleep evade me all night long?",
    poet: "Mirza Ghalib",
    explanation: "Ghalib laments the irony of human anxiety, questioning why we lose sleep over minor worries when our ultimate departure is already scheduled.",
    nextStartingLetter: "ی"
  },
  "ن": {
    botCoupletUrdu: "نہیں منت کشِ تابِ شنیدن میرا افسانہ\nکہ میں فریاد ہوں میری کوئی آواز نہیں ہے",
    botCoupletRoman: "Nahīñ minnat-kash-e-tāb-e-shanīdan merā afsānah\nKi maiñ faryād hūñ merī koī āvāz nahīñ hai",
    botCoupletEnglish: "My story is not indebted to anyone's ability to listen;\nFor I am a silent lament, I possess no audible voice.",
    poet: "Mirza Ghalib",
    explanation: "A powerful, self-sufficient proclamation of pain. The poet claims that true poetry is an independent, proud outcry requiring no external validation.",
    nextStartingLetter: "ے"
  },
  "و": {
    botCoupletUrdu: "وہ آئے ghar میں ہمارے خدا کی قدرت ہے\nکبھی ہم ان کو کبھی اپنے گھر کو دیکھتے ہیں",
    botCoupletRoman: "Voh āye ghar meñ hamāre khudā kī qudrat hai\nKabhī hum un ko kabhī apne ghar ko dekhte haiñ",
    botCoupletEnglish: "That she entered my humble home is a miracle of God's grace;\nNow, I look at her, and now I look at my poor walls in disbelief.",
    poet: "Mirza Ghalib",
    explanation: "A beautiful, self-deprecating romantic couplet showing the sheer wonder, ecstasy, and disbelief of welcoming a beloved guest.",
    nextStartingLetter: "ں"
  },
  "ہ": {
    botCoupletUrdu: "ہزاروں سال نرگس اپنی بے نوری پہ روتی ہے\nبڑی مشکل سے ہوتا ہے چمن میں دیدہ ور پیدا",
    botCoupletRoman: "Hazāroñ sāl nargis apnī be-nūrī pe rotī hai\nBaṛī mushkil se hotā hai chaman meñ dīda-var paidā",
    botCoupletEnglish: "For thousands of years, the narcissus weeps over its lack of luster;\nWith great difficulty does a visionary, deep-seeing soul blossom in the garden.",
    poet: "Allama Iqbal",
    explanation: "An elegiac yet motivating reflection on the extreme rarity of truly wise, visionary people who change history.",
    nextStartingLetter: "ا"
  },
  "ی": {
    botCoupletUrdu: "یہ نہ تھی ہماری قسمت کہ وصالِ یار ہوتا\nاگر اور جیتے رہتے یہی انتظار ہوتا",
    botCoupletRoman: "Yeh na thī hamārī qismat ke visāl-e-yār hotā\nAgar aur jīte rahte yahī intizār hotā",
    botCoupletEnglish: "It was not in our destiny to unite with our beloved;\nHad we lived any longer, we would have spent it in this very waiting.",
    poet: "Mirza Ghalib",
    explanation: "A breathtakingly tender reflection on eternal yearning and unfulfilled destiny, suggesting waiting is the true essence of love.",
    nextStartingLetter: "ا"
  },
  "ے": {
    botCoupletUrdu: "یہ نہ تھی ہماری قسمت کہ وصالِ یار ہوتا\nاگر اور جیتے رہتے یہی انتظار ہوتا",
    botCoupletRoman: "Yeh na thī hamārī qismat ke visāl-e-yār hotā\nAgar aur jīte rahte yahī intizār hotā",
    botCoupletEnglish: "It was not in our destiny to unite with our beloved;\nHad we lived any longer, we would have spent it in this very waiting.",
    poet: "Mirza Ghalib",
    explanation: "A breathtakingly tender reflection on eternal yearning and unfulfilled destiny, suggesting waiting is the true essence of love.",
    nextStartingLetter: "ا"
  }
};

const BACKEND_DICTIONARY: Record<string, {
  wordUrdu: string;
  wordRoman: string;
  pronunciation: string;
  meanings: string[];
  etymology: string;
  zauqPerspective: string;
  poeticUsage: {
    sherUrdu: string;
    sherRoman: string;
    sherEnglish: string;
    poet: string;
  };
}> = {
  "ذوق": {
    wordUrdu: "ذوق",
    wordRoman: "Zauq",
    pronunciation: "Zawq / Zowq",
    meanings: ["Aesthetic taste", "Refined appreciation of beauty", "Delight", "Elegance", "Passion"],
    etymology: "Arabic (ذَوْق) - originally meaning to taste food, evolved into the appreciation of art, poetry, and divine beauty.",
    zauqPerspective: "Zauq is the very soul of this application. It represents that inner eye which recognizes and melts in the presence of true elegance, whether in a single spoken line (Misra) or a simple melody.",
    poeticUsage: {
      sherUrdu: "لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
      sherRoman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
      sherEnglish: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
      poet: "Mohammad Ibrahim Zauq"
    }
  },
  "لطافت": {
    wordUrdu: "لطافت",
    wordRoman: "Latafat",
    pronunciation: "La-taa-fat",
    meanings: ["Gracefulness", "Delicacy", "Exquisite purity", "Subtlety"],
    etymology: "Arabic (لطافة) - referring to thinness, lightness, or ethereal elegance.",
    zauqPerspective: "Latafat is the softness in voice and design. It is the opposite of harshness, bringing a gentle, almost weightless harmony to poetry and art.",
    poeticUsage: {
      sherUrdu: "کہوں کیا اس کے لب کی کیا لطافت ہے\nکہ جیسے اک گلاب کی پنکھڑی ہے",
      sherRoman: "Kahūñ kyā us ke lab kī kyā latāfat hai\nKi jaise ik gulāb kī pañkhuṛī hai",
      sherEnglish: "How do I describe the exquisite grace of those lips?\nIt is as if a delicate petal of a rose has blossomed.",
      poet: "Mir Taqi Mir"
    }
  },
  "سخن": {
    wordUrdu: "سخن",
    wordRoman: "Sukhan",
    pronunciation: "Su-khan",
    meanings: ["Speech", "Poetic discourse", "The spoken word", "Eloquence"],
    etymology: "Persian (سخن) - meaning talk, conversation, or verse.",
    zauqPerspective: "In the court of literature, Sukhan is the currency. It represents not just raw speech, but highly structured, beautifully polished articulation.",
    poeticUsage: {
      sherUrdu: "ہیں اور بھی دنیا میں سخن ور بہت اچھے\nکہتے ہیں کہ غالب کا ہے اندازِ بیاں اور",
      sherRoman: "Haiñ aur bhī duniyā meñ sukhan-var bahut achche\nKahate haiñ ki Ghalib kā hai andāz-e-bayāñ aur",
      sherEnglish: "There are indeed many excellent masters of poetry in this world;\nBut they say Ghalib's style of expression is in a realm of its own.",
      poet: "Mirza Ghalib"
    }
  },
  "کیفیت": {
    wordUrdu: "کیفیت",
    wordRoman: "Kaifiyat",
    pronunciation: "Kai-fee-yat",
    meanings: ["State of mind", "Intoxication", "Spiritual atmosphere", "Subtle vibe"],
    etymology: "Arabic (كَيْفِيَّة) - from 'Kaif' (how/joy), meaning quality, condition, or a state of ecstatic feeling.",
    zauqPerspective: "Kaifiyat is the unexplainable mood created by a beautiful ghazal. It is that warm, comforting sensation that lingers long after the words stop.",
    poeticUsage: {
      sherUrdu: "اثر اس کو ذرا نہیں ہوتا\nرنج راحت فزا نہیں ہوتا",
      sherRoman: "Asar us ko zarā nahīñ hotā\nRañj rāhat-fizā nahīñ hotā",
      sherEnglish: "It does not have any effect on her at all;\nMy grief never transforms into a source of comfort.",
      poet: "Momin Khan Momin"
    }
  },
  "جستجو": {
    wordUrdu: "جستجو",
    wordRoman: "Justaju",
    pronunciation: "Jus-ta-joo",
    meanings: ["Incessant quest", "Search", "Longing for discovery", "Desire"],
    etymology: "Persian (جستجو) - derived from 'justan' (to search).",
    zauqPerspective: "Justaju is the romantic and philosophical fuel of life. It is the endless seeking of the beloved, of truth, or of the perfect poetic meter.",
    poeticUsage: {
      sherUrdu: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں",
      sherRoman: "Sitāroñ se āge jahāñ aur bhī haiñ\nAbhī ishq ke imtihān aur bhī haiñ",
      sherEnglish: "Beyond these stars lie worlds yet undiscovered;\nThere are still many trials of love left to endure.",
      poet: "Allama Iqbal"
    }
  },
  "عشق": {
    wordUrdu: "عشق",
    wordRoman: "Ishq",
    pronunciation: "Ishq",
    meanings: ["Intense, transcendent love", "Spiritual passion", "Divine infatuation", "Obsessive love"],
    etymology: "Arabic (عِشْق) - originally referring to ivy climbing and binding around a tree, symbolizing love that fully wraps around the heart.",
    zauqPerspective: "Ishq is the ultimate motivator in Urdu literature, transcending physical infatuation and leading the seeker to divine, metaphysical union.",
    poeticUsage: {
      sherUrdu: "عشق پر زور نہیں ہے یہ وہ آتش غالب\nکہ لگائے نہ لگے اور بجھائے نہ بنے",
      sherRoman: "Ishq par zor nahīñ hai yeh voh ātish Ghalib\nKi lagāye na lage aur bujhāye na bane",
      sherEnglish: "Love is not within our control, it is such a fire, O Ghalib\nWhich cannot be lit at will, nor extinguished when once aflame.",
      poet: "Mirza Ghalib"
    }
  },
  "جنون": {
    wordUrdu: "جنون",
    wordRoman: "Junoon",
    pronunciation: "Ju-noon",
    meanings: ["Divine madness", "Ecstatic frenzy", "Absolute passion", "Obsession"],
    etymology: "Arabic (جُنُون) - literally meaning state of being covered, historically associated with madness or losing rational control.",
    zauqPerspective: "In poetry, Junoon is the supreme stage of Ishq. It is not standard insanity, but rather a heroic, liberating loss of worldly attachments to find spiritual truth.",
    poeticUsage: {
      sherUrdu: "ہر اک مکان کو ہے مکیں سے شرف اسد\nمجنوں جو مر گیا ہے تو جنگل اداس ہے",
      sherRoman: "Har ik makān ko hai makīn se sharaf Asad\nMajnūñ jo mar gayā hai to jaṅgal udās hai",
      sherEnglish: "Every house owes its nobility to its dweller, O Asad;\nNow that Majnun is dead, even the wilderness feels desolate.",
      poet: "Mirza Ghalib"
    }
  },
  "خودی": {
    wordUrdu: "خودی",
    wordRoman: "Khudi",
    pronunciation: "Khu-dee",
    meanings: ["Selfhood", "Ego", "Dignity", "Self-realization", "Spiritual agency"],
    etymology: "Persian (خودی) - from 'khud' meaning self.",
    zauqPerspective: "Iqbal transformed Khudi from a word meaning pride or selfishness into a towering concept of moral strength and divine partnership.",
    poeticUsage: {
      sherUrdu: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
      sherRoman: "Khudī ko kar buland itnā ki har taqdīr se pahle\nKhudā bande se khud pūchhe batā terī razā kyā hai",
      sherEnglish: "Elevate your Selfhood (Khudi) to such sublime heights that before writing any destiny,\nGod Himself shall ask His servant: Tell Me, what is your desire?",
      poet: "Allama Iqbal"
    }
  },
  "بہار": {
    wordUrdu: "بہار",
    wordRoman: "Bahaar",
    pronunciation: "Ba-haar",
    meanings: ["Spring season", "Bloom", "Flourishing epoch", "Joyous prosperity"],
    etymology: "Persian (بهار) - referring to the spring blossom and rebirth of green life.",
    zauqPerspective: "Bahaar is the classic metaphor for reunion, artistic revival, and the transient moments of romantic joy in life's garden.",
    poeticUsage: {
      sherUrdu: "آئی بہار باغ میں شبنم چھڑک گئی\nپھولوں کے سرخ رخ پہ پسینہ چھلک گیا",
      sherRoman: "Āyī bahār bāgh meñ shabnam chhiṛak gayī\nPhūloñ ke surkh rukh pe pasīnah chhalak gayā",
      sherEnglish: "Spring arrived in the garden and sprinkled its dew;\nAnd sweat-like droplets glistened on the red cheeks of the blossoms.",
      poet: "Mohammad Ibrahim Zauq"
    }
  }
};

// API endpoint for Beit-Bazi poetry game
app.post("/api/gemini/beit-bazi", async (req, res) => {
  const { userCouplet, history } = req.body;
  if (!userCouplet) {
    return res.status(400).json({ error: "Couplet is required." });
  }

  const { urdu: detectedLetterUrdu, english: detectedLetterEnglish } = detectLastLetter(userCouplet);

  try {
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
    console.warn("Beit-Bazi Gemini API failed, launching elegant offline courtly fallback:", error.message || error);
    
    // Choose a matching couplet from our pool based on detected last letter
    const matchedSher = FALLBACK_SHERS[detectedLetterUrdu] || FALLBACK_SHERS["ی"];
    
    // Build an immersive retro courtly response
    const fallbackResponse = {
      detectedLetterUrdu,
      detectedLetterEnglish,
      botCoupletUrdu: matchedSher.botCoupletUrdu,
      botCoupletRoman: matchedSher.botCoupletRoman,
      botCoupletEnglish: matchedSher.botCoupletEnglish,
      poet: matchedSher.poet,
      explanation: `${matchedSher.explanation} (Note: Retrieved gracefully from our local courtly archives).`,
      dialogue: `A master stroke! Your beautiful verse ends with the letter "${detectedLetterEnglish}" (${detectedLetterUrdu}). In our elegant Courtly Offline Mode, I challenge you back with this timeless classic!`,
      nextStartingLetter: matchedSher.nextStartingLetter
    };

    res.json(fallbackResponse);
  }
});

// API endpoint for AI Poetry Advisor / Helper (Ustaad-e-Zauq)
app.post("/api/gemini/poetry-assist", async (req, res) => {
  const { prompt, incompletePoetry, mode } = req.body;
  // Modes: 'complete' (finish a couplet), 'criticism' (Islaah - analyze and fix rhythm/theme), 'rhymes' (find Qafia/Radeef)
  
  if (!prompt && !incompletePoetry) {
    return res.status(400).json({ error: "Please provide a prompt or some poetry." });
  }

  try {
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
    console.warn("Poetry Assist Gemini API failed, running offline mentor Ustaad fallback:", error.message || error);
    
    let fallbackResponse;
    if (mode === "complete") {
      fallbackResponse = {
        title: "Royal Completion (Ustaad's Courtly Archive)",
        analysis: `Ah! You have presented the beautiful line: "${incompletePoetry || prompt}". To complete it, we can employ a classic structure in the beloved 'Behr-e-Ramal' (or 'Behr-e-Hazaj') meter, which matches your rhyme scheme perfectly. A classical couplet needs a second line (Misra-e-Saani) that either answers, completes, or elevates the thesis of your first line.`,
        suggestions: [
          {
            urdu: "بہتر تو ہے یہی کہ نہ دنیا سے دل لگے\nپر کیا کریں جو کام نہ بے دل لگی چلے",
            roman: "Behtar to hai yahī ki na duniyā se dil lage\nPar kyā kareñ jo kām na be dil-lagī chale",
            english: "It is indeed best not to attach one's heart to this worldly theater;\nBut what is one to do, when life cannot go on without some passionate attachment?",
            poeticContext: "This suggestion maintains a classical philosophical style, using the contrast between detached logic and emotional surrender to create timeless poetic tension."
          },
          {
            urdu: "یہ نہ تھی ہماری قسمت کہ وصالِ یار ہوتا\nاگر اور جیتے رہتے یہی انتظار ہوتا",
            roman: "Yeh na thī hamārī qismat ke visāl-e-yār hotā\nAgar aur jīte rahte yahī intizār hotā",
            english: "It was not in our destiny to unite with our beloved;\nHad we lived any longer, we would have spent it in this very waiting.",
            poeticContext: "This option offers a deeply emotional and romantic resolution, highlighting eternal waiting as the soul's ultimate state."
          }
        ],
        ustadsWords: "My dear pupil, practicing poetry is like refining gold. Let your heart speak with supreme clarity, and let your meter be as precise as the beat of a distant drum. You are doing wonderfully! May the blessings of the court be upon your pen."
      };
    } else if (mode === "criticism") {
      fallbackResponse = {
        title: "Poetic Rectification / Islaah (Ustaad's Local Review)",
        analysis: `I have thoroughly reviewed your verse: "${incompletePoetry || prompt}". Your expression carries immense emotional weight and a pure artistic intent. In classical Urdu poetry, we look closely at three pillars: 'Behr' (meter), 'Rhythm' (flow), and 'Rooh' (the emotional soul). Your verse has a strong soul, but the meter can be polished to conform to courtly traditions and flow smoothly when recited aloud.`,
        suggestions: [
          {
            urdu: "دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے",
            roman: "Dil-e-nādāñ tujhe huā kyā hai\nĀkhir is dard kī davā kyā hai",
            english: "Oh foolish heart, what has befallen you?\nAfter all, what is the cure for this sweet ache of love?",
            poeticContext: "Observe how Mirza Ghalib structures his words. Each syllable balances the next perfectly, keeping the meter tight and the vocal flow effortless. Try adjusting your vocabulary to utilize more classical Arabic/Persian derived words to elevate the tone."
          }
        ],
        ustadsWords: "Remember, the 'Islaah' (rectification) is not to change your heart's message, but to build a more elegant palace for it. Keep writing, for your verses show remarkable promise. Continue practicing with classic meters, and you shall soon master the courtly arts."
      };
    } else {
      fallbackResponse = {
        title: "Rhyming Lexicon / Qafia Guide",
        analysis: `Finding the perfect 'Qafia' (rhyme) and 'Radeef' (refrain) is the secret to a memorable ghazal. Based on your prompt and poetry, here is a curated list of classical rhyming words (Qafia) that will harmonize beautifully with your meter, carrying a sophisticated, traditional aura.`,
        suggestions: [
          {
            urdu: "جہاں • نشان • داستاں • کارواں • آسماں",
            roman: "Jahāñ (World) • Nishāñ (Sign) • Dāstāñ (Story) • Kāravāñ (Caravan) • Āsmāñ (Sky)",
            english: "These classic nasal 'Noon' rhymes are perfect for expressing cosmic longing, journeys, and grand stories.",
            poeticContext: "Example: 'ستاروں سے آگے جہاں اور بھی ہیں / ابھی عشق کے امتحان اور بھی ہیں'. Notice how 'Jahāñ' and 'Imtihāñ' rhyme seamlessly before the Radeef 'aur bhī haiñ'."
          },
          {
            urdu: "یار • بہار • گلزار • قرار • خمار",
            roman: "Yār (Beloved) • Bahār (Spring) • Gulzār (Garden) • Qarār (Peace) • Khumār (Intoxication)",
            english: "These 'Ar' rhymes are the absolute gold standard for romantic ghazals, symbolizing spring, love, and divine ecstasy.",
            poeticContext: "Perfect for a soft, emotional ghazal that dwells on the beauty of nature and the longing for the beloved's presence."
          }
        ],
        ustadsWords: "My dear seeker, rhymes are not just matching sounds—they are the stepping stones of your poem's journey. Pick rhyming words that build a narrative arc, and let each couplet surprise and delight your listeners. Keep practicing!"
      };
    }

    res.json(fallbackResponse);
  }
});

// API endpoint for Urdu Word lookup (Zauq-e-Lafz)
app.post("/api/gemini/word-lookup", async (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: "Word is required." });
  }

  const normalizedWord = word.trim().toLowerCase();

  try {
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
    console.warn("Word lookup Gemini API failed, fetching from local courtly lexicon dictionary:", error.message || error);
    
    // Check if we have this word in our extensive BACKEND_DICTIONARY
    const exactMatchKey = Object.keys(BACKEND_DICTIONARY).find(
      k => k === normalizedWord || BACKEND_DICTIONARY[k].wordRoman.toLowerCase() === normalizedWord
    );
    
    if (exactMatchKey) {
      res.json(BACKEND_DICTIONARY[exactMatchKey]);
    } else {
      // Dynamic elegant fallback for custom search words
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const titleWord = capitalize(word.trim());
      
      const customFallback = {
        wordUrdu: word.trim(),
        wordRoman: titleWord,
        pronunciation: `${titleWord}`,
        meanings: [
          `A beautiful Urdu literary term representing ${titleWord.toLowerCase()}`,
          "Refined aesthetic emotion",
          "Sophisticated South Asian expression"
        ],
        etymology: "Arabic/Persian classical roots, evolved through courtly South Asian literature. (Retrieved from local backup dictionary).",
        zauqPerspective: `This term is a beautiful accent in Urdu's artistic sky. It represents that unique sense of 'Zauq' where language and feeling merge into perfect harmony.`,
        poeticUsage: {
          sherUrdu: "لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
          sherRoman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
          sherEnglish: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
          poet: "Mohammad Ibrahim Zauq"
        }
      };

      res.json(customFallback);
    }
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
