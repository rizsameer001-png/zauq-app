import React, { useState } from "react";
import { 
  Calendar, 
  MapPin, 
  User, 
  BookOpen, 
  ArrowRight, 
  Award, 
  Compass, 
  Scroll, 
  Layers, 
  Clock,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Author } from "../types";

// Named export for era resolution used in DeewanView and other components
export function getPoetEra(poetName: string): string {
  if (!poetName) return "19th-century";
  const name = poetName.toLowerCase();
  if (name.includes("mir taqi") || name.includes("taqi") || name.includes("mir")) {
    return "18th-century";
  }
  if (name.includes("ghalib") || name.includes("zauq") || name.includes("ibrahim") || name.includes("momin") || name.includes("zafar")) {
    return "19th-century";
  }
  if (name.includes("iqbal")) {
    return "early-20th";
  }
  if (name.includes("faiz")) {
    return "mid-20th";
  }
  return "modern";
}

interface PoetTimelineProps {
  // Option 1: DeewanView props
  poets?: any[];
  ghazals?: any[];
  selectedPoet?: string | null;
  onSelectPoet?: (poetName: string | null) => void;
  selectedEra?: string | null;
  onSelectEra?: (eraName: string | null) => void;

  // Option 2: LibraryView props
  authors?: Author[];
  onSelectAuthor?: (author: Author) => void;
  triggerToast?: (msg: string) => void;
}

interface TimelinePoet {
  id: string; // matches Author.id or standard identifier
  name: string;
  urduName: string;
  lifespan: string;
  birthYear: number;
  era: string; // display name
  eraKey: string; // matches getPoetEra
  eraDescription: string;
  birthPlace: string;
  keyThemes: string[];
  signatureCouplet: {
    urdu: string;
    transliteration: string;
    translation: string;
  };
  narrativeBio: string;
}

const HISTORICAL_POETS: TimelinePoet[] = [
  {
    id: "auth_wali",
    name: "Wali Deccani",
    urduName: "ولی دکنی",
    lifespan: "1667 – 1707",
    birthYear: 1667,
    era: "Pre-Classical Era",
    eraKey: "18th-century", // fallback to earliest Deewan group
    eraDescription: "The foundational era where Deccani and Northern idioms merged to form standard Urdu ghazal.",
    birthPlace: "Aurangabad, Deccan",
    keyThemes: ["Sufism", "Divine Love", "Lyrical Simplicity"],
    signatureCouplet: {
      urdu: "جسے عشق کا تیر کاری لگے\nاسے زندگی میں کٹاری لگے",
      transliteration: "Jise ishq ka teer-e-kaari lage\nUse zindagi mein kataari lage",
      translation: "One who is struck by the deep arrow of divine love\nFinds even the simple affairs of life turning into sweet torment."
    },
    narrativeBio: "Wali Deccani is regarded as the Father of the Urdu Ghazal. His legendary journey from Aurangabad to Delhi in 1700 brought southern linguistic elegance to the Mughal capital, completely transforming Persian-centric courtly literature into Urdu."
  },
  {
    id: "auth_mir",
    name: "Mir Taqi Mir",
    urduName: "میر تقی میر",
    lifespan: "1723 – 1810",
    birthYear: 1723,
    era: "The Golden Age of Delhi",
    eraKey: "18th-century",
    eraDescription: "An era of profound melancholia, emotional purity, and structural perfection in classical ghazals.",
    birthPlace: "Agra, Mughal India",
    keyThemes: ["Aesthetic Grief", "Elegance of Sorrow", "Spiritual Yearning"],
    signatureCouplet: {
      urdu: "پتہ پتہ بوٹا بوٹا حال ہمارا جانے ہے\nجانے نہ جانے گل ہی نہ جانے باغ تو سارا جانے ہے",
      transliteration: "Patta patta boota boota haal hamara jaane hai\nJaane na jaane gul hi na jaane baagh to saara jaane hai",
      translation: "Every single leaf and bud knows of my state of love;\nOnly the beloved rose remains unaware, while the entire garden bears witness."
    },
    narrativeBio: "Revered as 'Khuda-e-Sukhan' (The God of Poetry), Mir Taqi Mir was the supreme chronicler of human suffering and delicate emotional resonance during the turbulent sacking of Delhi in the 18th century."
  },
  {
    id: "auth_zafar",
    name: "Bahadur Shah Zafar",
    urduName: "بہادر شاہ ظفر",
    lifespan: "1775 – 1862",
    birthYear: 1775,
    era: "The Twilight of Empire",
    eraKey: "19th-century",
    eraDescription: "Sorrowful, poignant verses capturing the decline of Mughal rule and royal exile.",
    birthPlace: "Delhi, Mughal India",
    keyThemes: ["Patriotism", "Exile", "Impermanence of Power"],
    signatureCouplet: {
      urdu: "عمرِ دراز مانگ کے لائے تھے چار دن\nدو آرزو میں کٹ گئے دو انتظار میں",
      transliteration: "Umr-e-daraaz maang ke laaye the chaar din\nDo aarzoo mein kat gaye do intezaar mein",
      translation: "I petitioned for a long life and was granted a mere four days;\nTwo were consumed in yearning, and two were spent in waiting."
    },
    narrativeBio: "The last Mughal Emperor, Bahadur Shah Zafar was a deeply spiritual Sufi and a prolific patron of arts. His melancholic poetry, written during his tragic exile in Rangoon, is a poignant epitaph of a bygone era."
  },
  {
    id: "auth_ghalib",
    name: "Mirza Ghalib",
    urduName: "مرزا اسد اللہ خان غالب",
    lifespan: "1797 – 1869",
    birthYear: 1797,
    era: "The Zenith of Classical Urdu",
    eraKey: "19th-century",
    eraDescription: "The height of philosophical depth, intellectual questioning, and supreme metaphorical complexity.",
    birthPlace: "Agra, India",
    keyThemes: ["Existentialism", "Skeptical Query", "Cosmic Play", "Wit & Irony"],
    signatureCouplet: {
      urdu: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے مرے ارمان لیکن پھر بھی کم نکلے",
      transliteration: "Hazaaron khwahishein aisi ke har khwahish pe dam nikle\nBahut nikle mere armaan lekin phir bhi kam nikle",
      translation: "Thousands of desires, each so intense that it takes away one's breath;\nMany of my yearnings were fulfilled, yet so many remain unquenched."
    },
    narrativeBio: "Mirza Ghalib stands as the absolute giant of Urdu poetry, infusing ghazals with deep existentialist philosophy, mocking traditional orthodoxy, and examining the ultimate illusions of human reality."
  },
  {
    id: "auth_momin",
    name: "Momin Khan Momin",
    urduName: "مومن خان مومن",
    lifespan: "1800 – 1851",
    birthYear: 1800,
    era: "The Zenith of Classical Urdu",
    eraKey: "19th-century",
    eraDescription: "An era of romance, complex wordplay, astrology, and delicate aristocratic lyricism.",
    birthPlace: "Delhi, India",
    keyThemes: ["Romantic Insinuations", "Lover's Pride", "Astrology"],
    signatureCouplet: {
      urdu: "تم مرے پاس ہوتے ہو گویا\nجب کوئی دوسرا نہیں ہوتا",
      transliteration: "Tum mere paas hote ho goya\nJab koi doosra nahi hota",
      translation: "It is as if you are right here beside me,\nWhenever there is no one else around."
    },
    narrativeBio: "Momin was a brilliant contemporary of Ghalib. Known for his subtle romantic nuance and breathtaking economy of words, Ghalib famously offered his entire diwan in exchange for just one of Momin's couplets."
  },
  {
    id: "auth_daagh",
    name: "Daagh Dehlvi",
    urduName: "داغ دہلوی",
    lifespan: "1831 – 1905",
    birthYear: 1831,
    era: "Lucknow & Rampur Transition",
    eraKey: "19th-century",
    eraDescription: "Idiomatic clarity, playful romantic dialogues, and a shift towards lighter, standard colloquial expressions.",
    birthPlace: "Delhi, India",
    keyThemes: ["Direct Romance", "Idiomatic Purity", "Playfulness"],
    signatureCouplet: {
      urdu: "اردو ہے جس کا نام ہمیں جانتے ہیں داغ\nسارے جہاں میں دھوم ہماری زباں کی ہے",
      transliteration: "Urdu hai jis ka naam hamein jaante hain Daagh\nSaare jahaan mein dhoom hamari zabaan ki hai",
      translation: "We alone know the true beauty of the language called Urdu, O Daagh;\nFor its sweet melody has enthralled the hearts of the entire world."
    },
    narrativeBio: "Daagh Dehlvi was a master of the spoken Urdu idiom. His courtly poetry in Rampur and Hyderabad returned Urdu to a state of simple, accessible, and delightful daily conversation, training generations of poets."
  },
  {
    id: "auth_iqbal",
    name: "Allama Muhammad Iqbal",
    urduName: "علامہ محمد اقبال",
    lifespan: "1877 – 1938",
    birthYear: 1877,
    era: "The Philosophical Awakening",
    eraKey: "early-20th",
    eraDescription: "A modern era of political renaissance, philosophical action, self-realization (Khudi), and cosmic ascension.",
    birthPlace: "Sialkot, Punjab",
    keyThemes: ["Selfhood (Khudi)", "Spiritual Awakening", "Visionary Action", "Unity"],
    signatureCouplet: {
      urdu: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
      transliteration: "Khudi ko kar buland itna ke har taqdeer se pehle\nKhuda bande se khud pooche bata teri raza kya hai",
      translation: "Elevate your Self (Khudi) to such sublime heights that before writing any destiny\nGod Himself asks of His servant: Tell Me, what is your ultimate pleasure?"
    },
    narrativeBio: "Sir Allama Iqbal, the 'Poet of the East', pioneered a monumental departure from traditional passive sorrow. He crafted an epic philosophy of active spiritual struggle, urging Eastern societies to awaken their latent spiritual selfhood."
  },
  {
    id: "auth_faiz",
    name: "Faiz Ahmed Faiz",
    urduName: "فیض احمد فیض",
    lifespan: "1911 – 1984",
    birthYear: 1911,
    era: "The Humanist & Progressive Era",
    eraKey: "mid-20th",
    eraDescription: "Blending classical romantic metaphors with socialist struggle, revolutionary calling, and humanist devotion.",
    birthPlace: "Sialkot, Pakistan",
    keyThemes: ["Socialist Realism", "Revolutionary Struggle", "Uncompromising Hope"],
    signatureCouplet: {
      urdu: "اور بھی دکھ ہیں زمانے میں محبت کے سوا\nراحتیں اور بھی ہیں وصل کی راحت کے سوا",
      transliteration: "Aur bhi dukh hain zamaane mein mohabbat ke siwa\nRahatein aur bhi hain wasl ki raahat ke siwa",
      translation: "There are other deeper sorrows in this world than the pangs of love,\nAnd other forms of comfort than the sweet warmth of a lover's embrace."
    },
    narrativeBio: "Faiz was a Nobel-nominated champion of the Progressive Writers' Movement. He masterfully adapted the vocabulary of love, wine, and the beloved to express the pain of marginalized laborers and political dissidents."
  },
  {
    id: "auth_jaun",
    name: "Jaun Elia",
    urduName: "جون ایلیا",
    lifespan: "1931 – 2002",
    birthYear: 1931,
    era: "Post-Classical Modernist Era",
    eraKey: "modern",
    eraDescription: "Anarchic non-conformism, self-mockery, painful nihilistic lyricism, and intense individual angst.",
    birthPlace: "Amroha, India / Karachi, Pakistan",
    keyThemes: ["Nihilism", "Sarcasm", "Existential Rage", "Alienation"],
    signatureCouplet: {
      urdu: "میں بھی بہت عجیب ہوں اتنا عجیب ہوں کہ بس\nخود کو تباہ کر لیا اور ملال بھی نہیں",
      transliteration: "Main bhi bahut ajeeb hoon itna ajeeb hoon ke bas\nKhud ko tabaah kar لیا اور ملال بھی نہیں",
      translation: "I too am incredibly strange, so remarkably odd that\nI completely destroyed my own life, and yet I feel no regret."
    },
    narrativeBio: "Jaun Elia was a modern revolutionary icon whose fame skyrocketed post-humously. A scholar of classical history, philosophy, and languages, he brought a raw, unpretentious, and deeply direct conversational tragedy to Urdu literature."
  }
];

export default function PoetTimeline({ 
  poets,
  ghazals,
  selectedPoet,
  onSelectPoet,
  selectedEra,
  onSelectEra,
  authors, 
  onSelectAuthor, 
  triggerToast 
}: PoetTimelineProps) {
  // Determine if context is DeewanView
  const isDeewanContext = !!onSelectEra || !!onSelectPoet;

  const [localEra, setLocalEra] = useState<string>("all");
  const [selectedPoetId, setSelectedPoetId] = useState<string | null>(null);

  const activeEra = isDeewanContext ? (selectedEra || "all") : localEra;

  // Filter badges matching getPoetEra output keys
  const eras = [
    { id: "all", name: "All Eras", icon: Compass },
    { id: "18th-century", name: "18th Century", range: "1650-1810", icon: Scroll },
    { id: "19th-century", name: "19th Century (Mughal)", range: "1810-1875", icon: Clock },
    { id: "early-20th", name: "Early 20th C", range: "1875-1940", icon: Award },
    { id: "mid-20th", name: "Mid 20th C (Progressive)", range: "1940-1985", icon: Layers },
    { id: "modern", name: "Late 20th C (Modernist)", range: "1985-Present", icon: Sparkles }
  ];

  const handleEraSelect = (eraId: string) => {
    if (isDeewanContext && onSelectEra) {
      onSelectEra(eraId === "all" ? null : eraId);
      // Reset poet when era changes in Deewan
      if (onSelectPoet) onSelectPoet(null);
    } else {
      setLocalEra(eraId);
      setSelectedPoetId(null);
    }
  };

  const filteredPoets = HISTORICAL_POETS.filter(p => {
    if (activeEra === "all") return true;
    return p.eraKey === activeEra;
  });

  const handleSelectPoetCard = (poet: TimelinePoet) => {
    if (isDeewanContext) {
      if (onSelectPoet) {
        const targetPoet = selectedPoet === poet.name ? null : poet.name;
        onSelectPoet(targetPoet);
      }
    } else {
      setSelectedPoetId(selectedPoetId === poet.id ? null : poet.id);
    }
  };

  const handleLinkToProfile = (poet: TimelinePoet) => {
    if (isDeewanContext) {
      if (onSelectPoet) {
        onSelectPoet(selectedPoet === poet.name ? null : poet.name);
      }
      return;
    }

    if (authors && onSelectAuthor && triggerToast) {
      const matchedAuthor = authors.find(a => a.id === poet.id || a.name.toLowerCase().includes(poet.name.toLowerCase()));
      if (matchedAuthor) {
        onSelectAuthor(matchedAuthor);
        triggerToast(`Opening ${matchedAuthor.name}'s library collection...`);
      } else {
        triggerToast(`${poet.name}'s dedicated bibliography is currently being preserved. Full digital catalog coming soon!`);
      }
    }
  };

  const handleResetFilters = () => {
    if (isDeewanContext) {
      if (onSelectEra) onSelectEra(null);
      if (onSelectPoet) onSelectPoet(null);
    } else {
      setLocalEra("all");
      setSelectedPoetId(null);
    }
  };

  return (
    <div id="poet-historical-timeline-root" className={`flex flex-col gap-6 ${isDeewanContext ? "bg-stone-950/20 border border-stone-900/60 p-6 rounded-3xl mb-8" : ""}`}>
      {/* Era Selector & Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-md">
          <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest block mb-1">
            {isDeewanContext ? "Interactive Poetry Navigator" : "Historical Sequence"}
          </span>
          <h3 className="text-base font-serif font-bold text-stone-200">
            {isDeewanContext ? "The Chronology of Ghazal & Sukhan" : "The Chronicle of Classical Urdu Verse"}
          </h3>
          <p className="text-xs text-stone-400 font-serif mt-1 leading-relaxed">
            {isDeewanContext 
              ? "Select an era or click a poet's timeline card below to instantly filter the active Ghazals catalogued in your Deewan."
              : "Follow the evolutionary line of Urdu literature across 300 years, tracing the transition from early Sufi mysticism to intense personal philosophy and modern humanitarian awakening."
            }
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap gap-2 md:max-w-xl justify-start md:justify-end">
          {eras.map((era) => {
            const Icon = era.icon;
            const isSelected = activeEra === era.id;
            return (
              <button
                key={era.id}
                id={`era-filter-${era.id}`}
                onClick={() => handleEraSelect(era.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/35" 
                    : "bg-stone-900/20 hover:bg-stone-900/45 text-stone-500 hover:text-stone-300 border-stone-900"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{era.name}</span>
                {era.range && <span className="text-[8px] opacity-60">({era.range})</span>}
              </button>
            );
          })}
          
          {isDeewanContext && (selectedEra || selectedPoet) && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-full text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              title="Reset timeline filters"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Timeline Layout */}
      <div className="relative overflow-x-auto pb-4 pt-6 px-2 scrollbar-thin scrollbar-thumb-stone-900" style={{ scrollbarColor: "#1c1917 transparent" }}>
        {/* Horizontal timeline connect line */}
        <div className="absolute top-[148px] left-0 right-0 h-[1.5px] bg-gradient-to-r from-amber-500/10 via-amber-500/30 to-amber-500/10 hidden lg:block" />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-w-max lg:pb-4">
          {filteredPoets.map((poet, idx) => {
            // Check if linked in library
            const isLinked = authors ? authors.some(a => a.id === poet.id || a.name.toLowerCase().includes(poet.name.toLowerCase())) : false;
            
            // Highlight card if selected either as state (Library) or filter (Deewan)
            const isSelected = isDeewanContext 
              ? selectedPoet === poet.name 
              : selectedPoetId === poet.id;

            return (
              <motion.div
                key={poet.id}
                id={`timeline-card-${poet.id}`}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-3"
              >
                {/* Era tag displayed above node on desktop */}
                <div className="hidden lg:flex items-center gap-2 pl-3">
                  <span className="text-[9px] font-mono text-amber-500/60 font-semibold uppercase tracking-widest block max-w-[200px] truncate">
                    {poet.era}
                  </span>
                </div>

                {/* Vertical Connector and Dot representation */}
                <div className="flex items-center gap-4 lg:flex-col lg:gap-2">
                  {/* Timeline Dot */}
                  <div className="flex items-center justify-center lg:h-12 lg:w-full relative">
                    {/* The circle */}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-stone-950 border-stone-800 hover:border-amber-500/40"
                    }`}>
                      <span className="text-[10px] font-mono text-amber-500 font-bold">{idx + 1}</span>
                    </div>
                  </div>

                  {/* Date and Place Indicators */}
                  <div className="flex items-center gap-2 lg:justify-center font-mono text-[10px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-600" />
                      {poet.lifespan}
                    </span>
                    <span className="text-stone-800">•</span>
                    <span className="flex items-center gap-1 max-w-[130px] truncate">
                      <MapPin className="w-3 h-3 text-stone-600" />
                      {poet.birthPlace}
                    </span>
                  </div>
                </div>

                {/* Primary Card */}
                <div 
                  onClick={() => handleSelectPoetCard(poet)}
                  className={`bg-stone-900/30 border rounded-3xl p-5 hover:bg-stone-900/50 transition-all cursor-pointer flex flex-col gap-3 relative overflow-hidden group ${
                    isSelected ? "border-amber-500/45 bg-amber-500/[0.02] shadow-lg" : "border-stone-900/80 hover:border-stone-800"
                  }`}
                >
                  {/* Subtle index glow */}
                  <div className="absolute right-4 top-4 text-[42px] font-serif font-bold text-stone-800/10 select-none group-hover:text-amber-500/5 transition-colors leading-none">
                    {poet.lifespan.split("–")[0].trim().split(" ")[0]}
                  </div>

                  {/* Title Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors text-sm flex items-center gap-1.5">
                        {poet.name}
                      </h4>
                      <span className="font-serif text-sm font-semibold text-amber-500/80 tracking-wide block" dir="rtl">
                        {poet.urduName}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest mt-1 block">
                      {poet.era}
                    </span>
                  </div>

                  {/* Key themes */}
                  <div className="flex flex-wrap gap-1.5">
                    {poet.keyThemes.map((theme, tIdx) => (
                      <span key={tIdx} className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-stone-900/60 border border-stone-850 text-stone-400">
                        {theme}
                      </span>
                    ))}
                  </div>

                  {/* Brief bio summary */}
                  <p className="text-xs text-stone-400 font-serif leading-relaxed line-clamp-3">
                    {poet.narrativeBio}
                  </p>

                  {/* Authentic Couplet Preview */}
                  <div className="bg-stone-950/60 border border-stone-900/60 rounded-2xl p-4 flex flex-col gap-2 relative">
                    <div className="absolute top-2 left-2 text-[9px] font-mono text-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                      <Scroll className="w-2.5 h-2.5" />
                      <span>Signature Verse</span>
                    </div>

                    <div className="pt-3 flex flex-col text-center">
                      <p className="font-serif font-semibold text-stone-300 text-xs md:text-sm whitespace-pre-line leading-loose tracking-wide mt-1.5" dir="rtl">
                        {poet.signatureCouplet.urdu}
                      </p>
                      <p className="text-[10px] font-mono text-stone-500 italic mt-2 line-clamp-1 group-hover:line-clamp-none transition-all">
                        {poet.signatureCouplet.transliteration}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Accordion Detail or profile CTA */}
                  <div className="pt-2 border-t border-stone-950 flex items-center justify-between mt-1">
                    <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                      {isLinked ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                      )}
                      <span>
                        {isDeewanContext 
                          ? (isSelected ? "Filtering Active" : "Click to Filter") 
                          : (isLinked ? "Library Profile Active" : "Historical record")}
                      </span>
                    </span>

                    {!isDeewanContext && isLinked && (
                      <button
                        id={`go-to-poet-${poet.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkToProfile(poet);
                        }}
                        className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                      >
                        <span>Browse Works</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {isDeewanContext && (
                      <button
                        id={`filter-poet-${poet.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkToProfile(poet);
                        }}
                        className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer font-bold ${
                          isSelected 
                            ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400" 
                            : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400"
                        }`}
                      >
                        {isSelected ? "Clear Filter" : "Filter Deewan"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
