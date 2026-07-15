import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, Copy, Check, Terminal, Play, BookOpen, 
  Feather, Globe, RefreshCw, Send, ShieldCheck, 
  FileCode, Settings, HelpCircle, Code, Eye, 
  ArrowRight, Sparkles, BookMarked, Users, Tv 
} from "lucide-react";

interface EndpointDoc {
  path: string;
  method: "GET" | "POST";
  desc: string;
  category: "Anthology" | "Adab Library" | "AI Features" | "System";
  body?: Record<string, any>;
  sampleResponse?: Record<string, any>;
}

export default function ApiPortal() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "playground" | "flutter">("catalog");
  const [selectedEndpoint, setSelectedEndpoint] = useState<number>(0);
  
  // Playground States
  const [playgroundPath, setPlaygroundPath] = useState("/api/poets");
  const [playgroundMethod, setPlaygroundMethod] = useState<"GET" | "POST">("GET");
  const [playgroundBody, setPlaygroundBody] = useState("");
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  const apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://zauq-app.run.app";

  const endpoints: EndpointDoc[] = [
    {
      path: "/api/poets",
      method: "GET",
      category: "Anthology",
      desc: "Retrieve classical Urdu poets metadata, profile descriptions, and historical details.",
      sampleResponse: [
        {
          id: "zauq",
          name: "Mohammad Ibrahim Zauq",
          era: "Mughal Court Era",
          bio: "Sheikh Mohammad Ibrahim Zauq was a prominent classical Urdu poet of Delhi. He was appointed as court poet of the Mughal emperor Bahadur Shah Zafar.",
          born: "1789",
          died: "1854"
        }
      ]
    },
    {
      path: "/api/ghazals",
      method: "GET",
      category: "Anthology",
      desc: "Retrieve classical ghazals and poems complete with couplets (shers), rhyming constraints, and metadata.",
      sampleResponse: [
        {
          id: "zauq-ghazal-1",
          title: "Layi Hayat Aaye Qaza Le Chali Chale",
          poetId: "zauq",
          shers: [
            {
              urdu: "لائی حیات آئے قضا لے چلی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
              roman: "Layi hayat aaye qaza le chali chale\nApni khushi na aaye na apni khushi chale",
              english: "Life brought us here, death carries us away\nNeither did we come by our choice, nor do we leave by our accord."
            }
          ]
        }
      ]
    },
    {
      path: "/api/videos",
      method: "GET",
      category: "System",
      desc: "Fetch curated recitations, mushairas, and traditional musical renderings complete with YouTube video IDs.",
      sampleResponse: [
        {
          id: "video-1",
          title: "Zauq Ghazal Sung by Begum Akhtar",
          youtubeId: "dQw4w9WgXcQ",
          description: "An evocative rendering of Ibrahim Zauq's masterpiece.",
          duration: "4:15"
        }
      ]
    },
    {
      path: "/api/authors",
      method: "GET",
      category: "Adab Library",
      desc: "Retrieve all master scholars, fictionists, and prose writers documented in the Adab Library.",
      sampleResponse: [
        {
          id: "manto",
          name: "Saadat Hasan Manto",
          era: "Progressive Writers Era",
          intro: "Renowned short story writer, novelist, and playwright who captured the raw human realities.",
          born: "1912",
          died: "1955"
        }
      ]
    },
    {
      path: "/api/books",
      method: "GET",
      category: "Adab Library",
      desc: "Retrieve prose texts, critical essays, biographies, and historical publications.",
      sampleResponse: [
        {
          id: "thanda-gosht",
          title: "Thanda Gosht",
          authorId: "manto",
          genre: "Short Stories",
          description: "A profound literary critique of partition-era social conditions.",
          chapters: ["Chapter 1: The Cold Flesh", "Chapter 2: Aftermath"]
        }
      ]
    },
    {
      path: "/api/daily-couplets",
      method: "GET",
      category: "Anthology",
      desc: "Fetch customized daily inspiration couplets curated for local notifications.",
      sampleResponse: [
        {
          id: "daily-1",
          urdu: "وقتِ پیری شباب کی باتیں\nایسی ہیں جیسے خواب کی باتیں",
          roman: "Waqt-e-peeri shabab ki baatein\nAisi hain jaise khwab ki baatein",
          english: "Talking of youth in old age\nIs like talking about dreams.",
          poet: "Ibrahim Zauq"
        }
      ]
    },
    {
      path: "/api/cms",
      method: "GET",
      category: "System",
      desc: "Retrieve custom informational, help, and editorial Markdown pages authored dynamically inside the admin panel.",
      sampleResponse: [
        {
          id: "about-us",
          title: "Zauq App Mission",
          content: "# About Zauq\n\nWelcome to the supreme Urdu courtly literature experience..."
        }
      ]
    },
    {
      path: "/api/dictionary",
      method: "GET",
      category: "System",
      desc: "Retrieve the local literary glossary containing authentic Urdu definitions, pronunciations, and origins.",
      sampleResponse: {
        "سخن": {
          meaning: "Speech, word, poetry, literary talk",
          origin: "Persian",
          examples: ["اہلِ سخن", "سخن ور"]
        }
      }
    },
    {
      path: "/api/gemini/beit-bazi",
      method: "POST",
      category: "AI Features",
      desc: "Engage in an interactive session of traditional Beit-Bazi with our AI opponent. Responds with valid classical verses starting with the last letter.",
      body: {
        userCouplet: "اپنی خوشی نہ آئے نہ اپنی خوشی چلے",
        history: []
      },
      sampleResponse: {
        detectedLetterUrdu: "ے",
        detectedLetterEnglish: "Ye",
        botCoupletUrdu: "یہ ہم جو ہجر میں دیوار و در کو دیکھتے ہیں\nکبھی صبا کو کبھی نامہ بر کو دیکھتے ہیں",
        botCoupletRoman: "Yeh hum jo hijr mein deewar o dar ko dekhte hain\nKabhi saba ko kabhi nama-bar ko dekhte hain",
        botCoupletEnglish: "We who stare blankly at the walls and doors in separation\nSometimes look at the breeze, sometimes scan the horizon for the messenger.",
        poet: "Mirza Ghalib",
        explanation: "An evocative verse representing the absolute anxiety and anticipation of a lover separated from the beloved.",
        dialogue: "Ah, a beautiful couplet ending in 'Ye'! Let the battle of verses flourish!",
        nextStartingLetter: "ن"
      }
    },
    {
      path: "/api/gemini/poetry-assist",
      method: "POST",
      category: "AI Features",
      desc: "Leverage 'Ustaad-e-Zauq', our AI classical advisor, for completion (second line), Islaah (rhythmical/thematic criticism), or rhyme suggestion.",
      body: {
        incompletePoetry: "تم میرے پاس ہوتے ہو گویا",
        mode: "complete",
        prompt: "Complete this famous line with absolute classic rhythm."
      },
      sampleResponse: {
        title: "Mentorship Session with Ustaad Zauq",
        analysis: "Your line matches the classical meter of 'Momin Khan Momin's' timeless composition.",
        suggestions: [
          {
            urdu: "جب کوئی دوسرا نہیں ہوتا",
            roman: "Jab koi doosra nahi hota",
            english: "When no one else is around me.",
            poeticContext: "The perfect thematic and rhyming match representing omnipresence of the companion."
          }
        ],
        ustadsWords: "Keep refining your cadence, child. Poetry is the architecture of the soul!"
      }
    },
    {
      path: "/api/gemini/word-lookup",
      method: "POST",
      category: "AI Features",
      desc: "Get an aesthetic etymological, literary, and poetic breakdown of any Urdu word with historical examples.",
      body: {
        word: "جنون"
      },
      sampleResponse: {
        word: "جنون (Junoon)",
        etymology: "Derived from Arabic root 'J-N-N' representing hidden, covered, or possessed.",
        poeticMeanings: "Divine madness, the ecstatic state of absolute devotion transcending intellect.",
        classicalCouplet: "جنوں کا نام خرد رکھ دیا خرد کا جنوں\nجو چاہے آپ کا حسنِ کرشمہ ساز کرے",
        poet: "Hasrat Mohani",
        explanation: "A gorgeous critique of how the world labels madness as intellect and intellect as madness."
      }
    },
    {
      path: "/api/gemini/sher-interpretation",
      method: "POST",
      category: "AI Features",
      desc: "Generate multi-lingual academic interpretations (Tafseer) and structural analysis of any classical couplet.",
      body: {
        urdu: "کون ہوتا ہے حریفِ مئے مرد افگنِ عشق\nہے مکرر لبِ ساقی پہ صلا میرے بعد",
        roman: "Kaun hota hai hareef-e-mai-e-mard-afgan-e-ishq\nHai mukarrar lab-e-saqi pe sala mere baad",
        poet: "Mirza Ghalib",
        languages: ["English", "Hindi", "Urdu"]
      },
      sampleResponse: {
        poetProfile: "Mirza Asadullah Khan Ghalib, writing from the twilight of Delhi's courtly elegance.",
        meterAnalysis: "Written in Behr-e-Hazaj, utilizing a highly complex courtly vocabulary.",
        interpretations: {
          English: "The couplet refers to the rare, standard of devotion required to consume the lethal wine of divine love...",
          Hindi: "यह शेर प्रेम की उस कठिन शराब के बारे में है जिसे पीने का साहस केवल असाधारण प्रेमी ही कर सकते हैं..."
        }
      }
    }
  ];

  useEffect(() => {
    // Synchronize playground inputs when selectedEndpoint changes
    const endpoint = endpoints[selectedEndpoint];
    setPlaygroundPath(endpoint.path);
    setPlaygroundMethod(endpoint.method);
    setPlaygroundBody(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : "");
    setPlaygroundResponse(null);
    setPlaygroundError(null);
  }, [selectedEndpoint]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSendTestRequest = async () => {
    setIsPlaying(true);
    setPlaygroundResponse(null);
    setPlaygroundError(null);

    try {
      const url = `${apiBaseUrl}${playgroundPath}`;
      const options: RequestInit = {
        method: playgroundMethod,
        headers: {
          "Content-Type": "application/json"
        }
      };

      if (playgroundMethod === "POST" && playgroundBody) {
        options.body = playgroundBody;
      }

      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setPlaygroundResponse(data);
    } catch (err: any) {
      setPlaygroundError(err.message || "Failed to execute request.");
    } finally {
      setIsPlaying(false);
    }
  };

  // Dart code generation for Flutter
  const generateDartSnippet = (endpoint: EndpointDoc) => {
    const isPost = endpoint.method === "POST";
    const bodyArgs = isPost 
      ? `\n    final Map<String, dynamic> requestBody = ${JSON.stringify(endpoint.body, null, 6)};`
      : "";
    
    return `import 'dart:convert';
import 'package:http/http.dart' as http;

/// Production-ready service class to connect Flutter with Zauq REST APIs
class ZauqApiService {
  static const String baseUrl = '${apiBaseUrl}';

  /// Fetches data from ${endpoint.path}
  static Future<dynamic> fetch${endpoint.path.split('/').map(w => w.replace(/[^a-zA-Z]/g, '')).map(w => w ? w[0].toUpperCase() + w.substring(1) : '').join('')}() async {
    final Uri url = Uri.parse('$baseUrl${endpoint.path}');
    
    try {
      final http.Response response = await ${isPost ? 'http.post(\n        url,\n        headers: {\'Content-Type\': \'application/json\'},\n        body: jsonEncode(requestBody),\n      )' : 'http.get(url)'};${bodyArgs ? bodyArgs : ""}

      if (response.statusCode == 200) {
        // Decode raw bytes to avoid Unicode/Urdu character encoding loss
        final String decodedBody = utf8.decode(response.bodyBytes);
        return jsonDecode(decodedBody);
      } else {
        throw Exception('Server error (Status: \${response.statusCode}): \${response.body}');
      }
    } catch (e) {
      print('Zauq API Exception on ${endpoint.path}: $e');
      rethrow;
    }
  }
}`;
  };

  return (
    <div id="api_portal_container" className="max-w-6xl mx-auto px-4 py-8 text-stone-200">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-900 pb-8 mb-8 gap-6 text-left">
        <div>
          <span className="text-amber-500 font-mono text-[10px] tracking-widest uppercase flex items-center gap-1.5 mb-1.5">
            <Cpu className="w-3.5 h-3.5 animate-pulse" /> Developer Integration Hub
          </span>
          <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 tracking-tight">
            Zauq App Mobile Gateway
          </h1>
          <p className="text-xs text-stone-400 mt-2 max-w-xl leading-relaxed">
            Connecting our rich classical Urdu anthology, local dictionaries, and courtly AI engines with native mobile clients. Perfect for Flutter, Kotlin Multiplatform, or React Native.
          </p>
        </div>

        {/* Dynamic Host Base Status */}
        <div className="bg-stone-950/80 border border-stone-900 p-4 rounded-2xl flex flex-col gap-2 shrink-0 md:w-80 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">Active Gateway Server</span>
          </div>
          <div className="bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-stone-300 select-all truncate">{apiBaseUrl}</span>
            <button 
              onClick={() => handleCopy(apiBaseUrl, "base")} 
              className="text-stone-500 hover:text-amber-400 p-1 cursor-pointer transition-colors"
              title="Copy Base URL"
            >
              {copiedText === "base" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-stone-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
            <span>Wildcard CORS Enabled (<code className="font-mono bg-stone-900 px-1 rounded text-stone-400">*</code>)</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-900/60 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 text-xs font-serif font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-amber-500 text-amber-300 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Endpoints Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab("playground")}
          className={`pb-3 px-4 text-xs font-serif font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "playground"
              ? "border-amber-500 text-amber-300 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Interactive Playground</span>
        </button>
        <button
          onClick={() => setActiveTab("flutter")}
          className={`pb-3 px-4 text-xs font-serif font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "flutter"
              ? "border-amber-500 text-amber-300 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-300"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Flutter (Dart) Integration</span>
        </button>
      </div>

      {/* Active Tab Contents */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: CATALOG */}
        {activeTab === "catalog" && (
          <motion.div
            key="catalog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Endpoints Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-2.5 max-h-[650px] overflow-y-auto pr-1">
              {endpoints.map((ep, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedEndpoint(idx)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                    selectedEndpoint === idx
                      ? "bg-amber-500/10 border-amber-500/30 shadow-md"
                      : "bg-stone-950/40 border-stone-900 hover:border-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase ${
                      ep.method === "POST" 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" 
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {ep.method}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                      {ep.category}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-stone-300 select-all truncate">{ep.path}</span>
                  <p className="text-[10px] text-stone-500 leading-snug line-clamp-2">{ep.desc}</p>
                </button>
              ))}
            </div>

            {/* Documentation Details */}
            <div className="lg:col-span-8 flex flex-col gap-6 text-left">
              <div className="bg-stone-950/60 border border-stone-900 rounded-3xl p-6 md:p-8 flex flex-col gap-6">
                
                {/* Method & Route Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-900 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider uppercase ${
                      endpoints[selectedEndpoint].method === "POST" 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {endpoints[selectedEndpoint].method}
                    </span>
                    <h2 className="text-sm font-mono font-semibold text-stone-200 tracking-tight break-all">
                      {endpoints[selectedEndpoint].path}
                    </h2>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedEndpoint(selectedEndpoint);
                      setActiveTab("playground");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-amber-500/30 text-[10px] font-serif font-semibold text-stone-400 hover:text-amber-300 transition-all cursor-pointer self-start sm:self-center"
                  >
                    <Send className="w-3 h-3" />
                    <span>Run in Playground</span>
                  </button>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">Functional Description</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {endpoints[selectedEndpoint].desc}
                  </p>
                </div>

                {/* Request Schema (for POST requests) */}
                {endpoints[selectedEndpoint].method === "POST" && endpoints[selectedEndpoint].body && (
                  <div className="flex flex-col gap-2.5">
                    <h4 className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">Required Request Payload</h4>
                    <div className="bg-stone-950 border border-stone-900/80 rounded-2xl p-4 font-mono text-xs text-stone-400 relative">
                      <pre className="overflow-x-auto leading-relaxed">
                        {JSON.stringify(endpoints[selectedEndpoint].body, null, 2)}
                      </pre>
                      <button
                        onClick={() => handleCopy(JSON.stringify(endpoints[selectedEndpoint].body, null, 2), "req")}
                        className="absolute right-3 top-3 text-stone-600 hover:text-amber-400 p-1.5 rounded-lg hover:bg-stone-900 transition-all cursor-pointer"
                        title="Copy payload"
                      >
                        {copiedText === "req" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sample JSON Response */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">Expected JSON Response Structure</h4>
                    <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">HTTP 200 OK</span>
                  </div>
                  <div className="bg-stone-950 border border-stone-900/80 rounded-2xl p-4 font-mono text-xs text-stone-400 max-h-[300px] overflow-y-auto relative">
                    <pre className="overflow-x-auto leading-relaxed">
                      {JSON.stringify(endpoints[selectedEndpoint].sampleResponse, null, 2)}
                    </pre>
                    <button
                      onClick={() => handleCopy(JSON.stringify(endpoints[selectedEndpoint].sampleResponse, null, 2), "resp")}
                      className="absolute right-3 top-3 text-stone-600 hover:text-amber-400 p-1.5 rounded-lg hover:bg-stone-900 transition-all cursor-pointer"
                      title="Copy response body"
                    >
                      {copiedText === "resp" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: PLAYGROUND */}
        {activeTab === "playground" && (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
          >
            {/* Input Configurator (Left Panel) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-stone-950/60 border border-stone-900 rounded-3xl p-6 flex flex-col gap-5">
                <h3 className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-900 pb-2">
                  <Settings className="w-3.5 h-3.5" /> Configure Request
                </h3>

                {/* HTTP Endpoint Selection Dropdown */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">Endpoint</label>
                  <select
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(Number(e.target.value))}
                    className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500/50 font-mono cursor-pointer"
                  >
                    {endpoints.map((ep, idx) => (
                      <option key={idx} value={idx}>
                        {ep.method} {ep.path}
                      </option>
                    ))}
                  </select>
                </div>

                {/* URL preview (Read-only) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">Full Destination URL</label>
                  <div className="bg-stone-950 border border-stone-900 px-3 py-2 rounded-xl text-xs text-stone-400 font-mono select-all truncate">
                    {apiBaseUrl}{playgroundPath}
                  </div>
                </div>

                {/* Body payload custom editor (for POST) */}
                {playgroundMethod === "POST" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">JSON Payload Body</label>
                      <span className="text-[9px] text-amber-500/80 font-mono">Editable</span>
                    </div>
                    <textarea
                      rows={8}
                      value={playgroundBody}
                      onChange={(e) => setPlaygroundBody(e.target.value)}
                      className="bg-stone-950 border border-stone-900 text-stone-300 rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Trigger Button */}
                <button
                  onClick={handleSendTestRequest}
                  disabled={isPlaying}
                  className="w-full mt-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPlaying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute API Call</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Response Viewer (Right Panel) */}
            <div className="lg:col-span-7 bg-stone-950/20 p-6 rounded-3xl border border-stone-900 flex flex-col gap-4 min-h-[400px]">
              <div className="flex items-center justify-between border-b border-stone-900 pb-3">
                <h3 className="text-xs font-mono uppercase text-stone-400 font-bold tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-stone-500" /> Response Terminal
                </h3>
                {playgroundResponse && (
                  <button
                    onClick={() => handleCopy(JSON.stringify(playgroundResponse, null, 2), "terminal_resp")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-300 text-[10px] transition-all cursor-pointer"
                  >
                    {copiedText === "terminal_resp" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Output</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Console/Screen Area */}
              <div className="flex-1 flex flex-col justify-center bg-stone-950 border border-stone-900/80 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-[500px]">
                {isPlaying ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-stone-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                    <p className="text-xs">Fetching response from active gateway...</p>
                  </div>
                ) : playgroundError ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 leading-normal flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                    <div>
                      <span className="font-bold block text-xs">Connection Error</span>
                      <p className="text-[11px] mt-1">{playgroundError}</p>
                    </div>
                  </div>
                ) : playgroundResponse ? (
                  <pre className="text-stone-300 leading-relaxed text-left overflow-x-auto">
                    {JSON.stringify(playgroundResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-stone-600">
                    <Eye className="w-8 h-8 text-stone-800" />
                    <p className="text-xs">No active request executed yet. Press the button to run real live queries.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: FLUTTER CODE */}
        {activeTab === "flutter" && (
          <motion.div
            key="flutter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6 text-left"
          >
            {/* Quick Flutter Checklist Info */}
            <div className="bg-stone-950/40 border border-stone-900 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-amber-500 uppercase font-bold tracking-widest">Step 1: Install http</span>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Add <code className="font-mono bg-stone-950 px-1 py-0.5 rounded text-amber-400">http: ^1.2.0</code> to your <code className="font-mono bg-stone-950 px-1 py-0.5 rounded">pubspec.yaml</code> and run <code className="font-mono text-stone-300">flutter pub get</code>.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-amber-500 uppercase font-bold tracking-widest">Step 2: Unicode & Font Rendering</span>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Import Jameel Noori Nastaliq or use Noto Nastaliq Urdu via <code className="font-mono bg-stone-950 px-1 py-0.5 rounded text-amber-400">google_fonts</code> for stunning, traditional Urdu layouts in Flutter.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-amber-500 uppercase font-bold tracking-widest">Step 3: Preserve UTF-8</span>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Always use <code className="font-mono bg-stone-950 px-1 py-0.5 rounded text-amber-400">utf8.decode(response.bodyBytes)</code> to protect elegant Urdu script characters from raw encoding corruption!
                </p>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-stone-950/60 border border-stone-900 rounded-3xl p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-stone-900 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-mono font-bold text-stone-200 tracking-tight">
                    zauq_api_service.dart
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(generateDartSnippet(endpoints[selectedEndpoint]), "dart")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-400 hover:text-amber-300 text-[11px] transition-all cursor-pointer"
                >
                  {copiedText === "dart" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Snippet!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Dart Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Explanatory text of the selected Endpoint's Dart structure */}
              <div className="text-xs text-stone-400 border-l-2 border-amber-500/40 pl-3 italic">
                Currently showing integration sample for <code className="font-mono bg-stone-900 text-amber-300 px-1 rounded">{endpoints[selectedEndpoint].path}</code>. Use the Endpoint selector on the left menu of Endpoint Catalog or Playground tabs to switch.
              </div>

              {/* Syntax Scroll Block */}
              <div className="bg-stone-950 border border-stone-900/80 rounded-2xl p-5 font-mono text-xs text-stone-300 overflow-x-auto max-h-[450px]">
                <pre className="leading-relaxed text-left">
                  {generateDartSnippet(endpoints[selectedEndpoint])}
                </pre>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Decorative footer */}
      <div className="mt-12 text-center text-[10px] text-stone-600 font-mono flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-stone-700" />
        <span>Courtly integrations forged dynamically in our sandbox developer environment.</span>
      </div>

    </div>
  );
}

// Inline fallback AlertCircle icon as it might not be in standard imports
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
