import React, { useState } from "react";
import { Search, Compass, Book, Quote, Sparkles, HelpCircle, Heart, Share2, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { DICTIONARY_WORDS } from "../data";
import { WordLookupResult, Sher } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface WordExplorerProps {
  onSaveSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  savedSherIds: string[];
}

export default function WordExplorer({ onSaveSher, onEditInCardCreator, savedSherIds }: WordExplorerProps) {
  const [searchWord, setSearchWord] = useState("");
  const [selectedWord, setSelectedWord] = useState<WordLookupResult | typeof DICTIONARY_WORDS[0]>(DICTIONARY_WORDS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speaking if word changes or component unmounts
  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedWord]);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any active speech
    window.speechSynthesis.cancel();

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Find an Urdu voice, Hindi voice as backup, or English as fallback
    const urduVoice = voices.find(v => v.lang.startsWith("ur") || v.lang.startsWith("hi"));
    const englishVoice = voices.find(v => v.lang.startsWith("en"));

    // Prepare first utterance (Urdu word)
    const wordUtterance = new SpeechSynthesisUtterance();
    if (urduVoice) {
      wordUtterance.text = selectedWord.wordUrdu;
      wordUtterance.voice = urduVoice;
      wordUtterance.lang = urduVoice.lang;
    } else {
      wordUtterance.text = selectedWord.wordRoman;
      if (englishVoice) {
        wordUtterance.voice = englishVoice;
        wordUtterance.lang = englishVoice.lang;
      }
    }

    // Prepare second utterance (Pronunciation and Meanings)
    const detailsText = `, pronounced: ${selectedWord.pronunciation}. The meanings are: ${selectedWord.meanings.join(", ")}.`;
    const detailsUtterance = new SpeechSynthesisUtterance(detailsText);
    if (englishVoice) {
      detailsUtterance.voice = englishVoice;
      detailsUtterance.lang = englishVoice.lang;
    }

    // Chain the utterances
    wordUtterance.onend = () => {
      window.speechSynthesis.speak(detailsUtterance);
    };

    detailsUtterance.onend = () => {
      setIsSpeaking(false);
    };

    wordUtterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsSpeaking(false);
    };

    detailsUtterance.onerror = (e) => {
      console.error("Speech error:", e);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(wordUtterance);
  };

  const handleSearch = async (e: React.FormEvent, customWord?: string) => {
    if (e) e.preventDefault();
    
    const wordToSearch = (customWord || searchWord).trim();
    if (!wordToSearch) return;

    // First check if it exists in pre-curated lists
    const foundCurated = DICTIONARY_WORDS.find(
      (w) => w.wordRoman.toLowerCase() === wordToSearch.toLowerCase() || w.wordUrdu === wordToSearch
    );

    if (foundCurated) {
      setSelectedWord(foundCurated);
      setSearchWord("");
      setErrorMsg(null);
      return;
    }

    // Otherwise lookup via AI
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/gemini/word-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: wordToSearch }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Ustaad couldn't find that word in his dictionary.");
      }

      const data = await response.json();
      setSelectedWord(data);
      setSearchWord("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ustaad is meditating. Please select from the curated word list.");
    } finally {
      setLoading(false);
    }
  };

  const currentPoeticSher: Sher = {
    id: `wd-${selectedWord.wordRoman}`,
    urdu: selectedWord.poeticUsage.sherUrdu,
    roman: selectedWord.poeticUsage.sherRoman,
    english: selectedWord.poeticUsage.sherEnglish,
    poet: selectedWord.poeticUsage.poet
  };

  const isSaved = savedSherIds.includes(currentPoeticSher.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="zauq-word-explorer">
      {/* Search Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Search Input Bar */}
        <div className="bg-stone-900/40 p-5 rounded-3xl border border-stone-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Book className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-sans font-semibold text-stone-100 uppercase tracking-wider">Zauq-e-Lafz (Dictionary)</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Search for any beautiful Urdu word to unlock its romantic, literal meanings and classic couplet usage.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Sukhan, Kaifiyat, Sahar..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="flex-1 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-700 rounded-xl py-2 px-3.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !searchWord.trim()}
              className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-amber-950 border border-amber-500/20 hover:border-transparent transition-all flex items-center justify-center disabled:opacity-40"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Selected pre-curated aesthetic list */}
        <div className="bg-stone-900/20 p-5 rounded-3xl border border-stone-900/60 flex-1">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 mb-4 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Curated Alfaaz (Aesthetic Words)</span>
          </h4>

          <div className="flex flex-col gap-2.5">
            {DICTIONARY_WORDS.map((w) => {
              const isCurrent = selectedWord.wordRoman.toLowerCase() === w.wordRoman.toLowerCase();
              return (
                <button
                  key={w.wordRoman}
                  onClick={(e) => handleSearch(e, w.wordRoman)}
                  className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group ${
                    isCurrent
                      ? "bg-amber-950/20 border-amber-500/30 text-amber-100"
                      : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-serif block font-semibold group-hover:text-amber-200">
                      {w.wordRoman}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {w.meanings[0]}
                    </span>
                  </div>
                  <span className={`text-base font-serif font-urdu transition-colors ${isCurrent ? "text-amber-400" : "text-stone-600 group-hover:text-stone-400"}`}>
                    {w.wordUrdu}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meanings / Poetry Card Panel */}
      <div className="lg:col-span-8 flex flex-col justify-stretch">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-stone-900/10 border border-stone-900/60 rounded-3xl p-12 text-center"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="w-16 h-16 rounded-full bg-amber-950/30 border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl"
                >
                  <Compass className="w-6 h-6 stroke-[1.5]" />
                </motion.div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              </div>
              <h4 className="text-sm font-serif font-semibold text-stone-300 mb-1">Retrieving Lexicon from Imperial Archives...</h4>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                Gemini is researching word origins, pronunciation guides, aesthetic nuances, and selecting the most fitting classical couplet.
              </p>
            </motion.div>
          ) : errorMsg ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-stone-900/10 border border-rose-950/40 text-rose-300 rounded-3xl p-8 text-center"
            >
              <HelpCircle className="w-10 h-10 text-rose-500/60 mb-2" />
              <p className="text-xs max-w-sm leading-relaxed mb-4">{errorMsg}</p>
            </motion.div>
          ) : selectedWord ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              key={selectedWord.wordRoman}
              className="flex-1 bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col gap-6"
            >
              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-amber-500/10 pointer-events-none" />
              <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-amber-500/10 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-amber-500/10 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-amber-500/10 pointer-events-none" />

              {/* Word Title Block */}
              <div className="flex justify-between items-start border-b border-stone-900 pb-5">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-3xl font-serif text-amber-200 font-bold tracking-tight">
                      {selectedWord.wordRoman}
                    </h3>
                    <button
                      onClick={handleSpeak}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isSpeaking
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse animate-duration-1000"
                          : "bg-stone-950/60 border-stone-800 text-stone-400 hover:text-amber-400 hover:border-amber-500/30"
                      }`}
                      title={isSpeaking ? "Stop Speaking" : "Listen to Word & Meaning"}
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1">
                    Pronounced: <strong className="text-stone-300 font-sans italic">{selectedWord.pronunciation}</strong>
                  </span>
                  <span className="text-xs text-amber-400/80 italic font-serif">
                    {selectedWord.etymology}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-4xl text-amber-400/90 font-serif leading-none font-urdu">
                    {selectedWord.wordUrdu}
                  </p>
                </div>
              </div>

              {/* Meanings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-stone-500">M'aani (Connotations)</h4>
                  <ul className="flex flex-col gap-2">
                    {selectedWord.meanings.map((m, idx) => (
                      <li key={idx} className="text-xs text-stone-200 bg-stone-950/40 border border-stone-900 p-3 rounded-xl flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Zauq Perspective</h4>
                  <p className="text-xs text-stone-400 bg-stone-950/20 border border-stone-900 p-3.5 rounded-xl leading-relaxed italic font-serif flex-1">
                    {selectedWord.zauqPerspective}
                  </p>
                </div>
              </div>

              {/* Classic Poetic Usage */}
              <div className="flex flex-col gap-3 mt-4 pt-5 border-t border-stone-900 flex-1 justify-end">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80 flex items-center gap-1.5 mb-1">
                  <Quote className="w-3.5 h-3.5" />
                  <span>Poetic Usage (Sher-e-Hawaala)</span>
                </h4>

                <div className="p-5 rounded-2xl bg-stone-950/50 border border-amber-950/20 relative group hover:border-amber-500/20 transition-all">
                  <p className="text-center text-xl text-amber-200/90 font-serif leading-loose mb-4 font-urdu">
                    {selectedWord.poeticUsage.sherUrdu}
                  </p>
                  <p className="text-center italic text-xs text-stone-400 mb-2 leading-relaxed">
                    {selectedWord.poeticUsage.sherRoman}
                  </p>
                  <p className="text-center text-xs text-stone-300 font-serif max-w-xl mx-auto leading-relaxed mb-4">
                    "{selectedWord.poeticUsage.sherEnglish}"
                  </p>
                  
                  <div className="flex justify-between items-center border-t border-stone-900/60 pt-3 text-[10px] text-stone-500">
                    <span>Poet: <strong className="text-stone-400">{selectedWord.poeticUsage.poet}</strong></span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditInCardCreator(currentPoeticSher)}
                        className="text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Create Card</span>
                      </button>
                      <button
                        onClick={() => onSaveSher(currentPoeticSher)}
                        className="text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                      >
                        <Heart className={`w-3 h-3 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
                        <span>{isSaved ? "Saved" : "Save"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
