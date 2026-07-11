import React, { useState, useEffect } from "react";
import { Sparkles, Feather, Send, BookOpen, PenTool, CheckCircle, Info, RefreshCw, Heart, Share2, Volume2, VolumeX } from "lucide-react";
import { PoetryAssistResponse, Sher } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface UstaadViewProps {
  onSaveSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  savedSherIds: string[];
}

export default function UstaadView({ onSaveSher, onEditInCardCreator, savedSherIds }: UstaadViewProps) {
  const [mode, setMode] = useState<"complete" | "criticism" | "rhymes">("complete");
  const [poetryInput, setPoetryInput] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PoetryAssistResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poetryInput.trim() && !promptInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResponse(null);

    try {
      const res = await fetch("/api/gemini/poetry-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incompletePoetry: poetryInput,
          prompt: promptInput,
          mode: mode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to receive Ustaad's wisdom.");
      }

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ustaad is resting in the gardens. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPoetryInput("");
    setPromptInput("");
    setResponse(null);
    setErrorMsg(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="zauq-ustaad-mentor">
      {/* Sidebar - Settings and Input Desk */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Desk Header */}
        <div className="bg-stone-900/40 p-5 rounded-3xl border border-stone-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-sans font-semibold text-stone-100 uppercase tracking-wider">Ustaad-e-Zauq (Writing Desk)</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Choose your mentorship service and compose your thoughts. Let Ustaad polish your verses with classical courtly standards.
          </p>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => { setMode("complete"); setResponse(null); }}
              className={`p-2.5 rounded-xl text-center text-xs font-serif transition-all border flex flex-col items-center gap-1.5 ${
                mode === "complete"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <Feather className="w-4 h-4 text-amber-500" />
              <span className="font-sans font-medium tracking-tight text-[10px] uppercase">Complete Line</span>
            </button>

            <button
              onClick={() => { setMode("criticism"); setResponse(null); }}
              className={`p-2.5 rounded-xl text-center text-xs font-serif transition-all border flex flex-col items-center gap-1.5 ${
                mode === "criticism"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <CheckCircle className="w-4 h-4 text-amber-500" />
              <span className="font-sans font-medium tracking-tight text-[10px] uppercase">Islaah (Review)</span>
            </button>

            <button
              onClick={() => { setMode("rhymes"); setResponse(null); }}
              className={`p-2.5 rounded-xl text-center text-xs font-serif transition-all border flex flex-col items-center gap-1.5 ${
                mode === "rhymes"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span className="font-sans font-medium tracking-tight text-[10px] uppercase">Qafia (Rhymes)</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="bg-stone-900/20 p-5 rounded-3xl border border-stone-900/60 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-2">
              {mode === "complete" && "Enter your first line (Misra-e-Ula)"}
              {mode === "criticism" && "Enter your full couplet (Sher)"}
              {mode === "rhymes" && "Enter target word or rhyme concept"}
            </label>
            <textarea
              value={poetryInput}
              onChange={(e) => setPoetryInput(e.target.value)}
              placeholder={
                mode === "complete" ? "Layi hayat aye qaza le chali chale..." :
                mode === "criticism" ? "Layi hayat aye qaza le chali chale\nApni khushi na aye na apni khushi chale..." :
                "Nazar (Beauty, Sight, Gazing)..."
              }
              rows={mode === "criticism" ? 3 : 2}
              className="w-full bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-700 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-serif resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-2">
              Add Guidance / Context (Optional)
            </label>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g., Make it romantic, use a Ghalib-like tone, or explain the bahar..."
              className="w-full bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-700 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="w-1/3 py-2.5 rounded-xl border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              disabled={loading || (!poetryInput.trim() && !promptInput.trim())}
              className="w-2/3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 hover:border-transparent text-amber-400 hover:text-amber-950 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-amber-500/10 disabled:opacity-40 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 disabled:hover:border-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Consult Ustaad</span>
            </button>
          </div>
        </form>

        {/* Informational Hint */}
        <div className="bg-stone-900/10 border border-stone-900/40 p-4 rounded-2xl flex gap-2">
          <Info className="w-4 h-4 text-amber-500/80 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-stone-500 leading-relaxed">
            <span className="text-stone-400 font-semibold block mb-0.5">Poetry Rules (Shayari):</span>
            A perfect couplet (Sher) consists of two lines (Misra). It follows a specific meter (Behr) and incorporates a rhyme (Qafia) and a repeating refrain (Radeef). Ustaad-e-Zauq helps you perfect these classical boundaries!
          </div>
        </div>
      </div>

      {/* Main Panel: Ustaad's Feedback Desk */}
      <div className="lg:col-span-7 flex flex-col justify-stretch">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-stone-900/10 border border-stone-900/60 rounded-3xl p-12 text-center"
            >
              <div className="relative mb-6">
                {/* Inkpot pulsing visual */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-16 h-16 rounded-full bg-amber-950/30 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-2xl"
                >
                  <PenTool className="w-6 h-6 stroke-[1.5]" />
                </motion.div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              </div>
              <h4 className="text-sm font-serif font-semibold text-stone-300 mb-1">Ustaad Zauq is Dipping the Quill...</h4>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                Analyzing your lines, calibrating the syllable weights (Behr), and sourcing the classical dictionary for refinements.
              </p>
            </motion.div>
          ) : errorMsg ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center bg-stone-900/10 border border-rose-950/40 text-rose-300 rounded-3xl p-8 text-center"
            >
              <p className="text-xs max-w-sm leading-relaxed mb-4">{errorMsg}</p>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 hover:text-white"
              >
                Clear and Retry
              </button>
            </motion.div>
          ) : response ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col gap-6"
            >
              {/* Traditional Seal decoration */}
              <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-amber-900/20 border border-amber-500/20 flex items-center justify-center text-[10px] font-serif font-bold text-amber-400 select-none">
                ذ
              </div>

              {/* Ustaad Header */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 mb-1 block">
                  Ustaad-e-Zauq Responds
                </span>
                <h4 className="text-base font-serif font-semibold text-stone-200">
                  {response.title}
                </h4>
              </div>

              {/* Courtly Greeting */}
              <div className="bg-amber-950/10 border border-amber-500/10 p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                <p className="text-xs text-amber-200/80 leading-relaxed italic font-serif">
                  "{response.ustadsWords}"
                </p>
              </div>

              {/* Core Analysis */}
              <div className="flex flex-col gap-2">
                <h5 className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Tashreeh & Islaah (Poetic Analysis)</h5>
                <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/30 border border-stone-900 p-4 rounded-xl">
                  {response.analysis}
                </p>
              </div>

              {/* Suggestions / Alternatives List */}
              <div className="flex flex-col gap-3 flex-1">
                <h5 className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Suggested Compositions</h5>
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px] pr-2">
                  {response.suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-stone-950/45 border border-stone-900/70 flex flex-col gap-3 group relative hover:border-amber-950/40 transition-colors"
                    >
                      {/* suggested line in Urdu */}
                      <p className="text-center text-xl text-amber-200/90 font-serif leading-loose font-urdu">
                        {s.urdu}
                      </p>
                      {s.roman && (
                        <p className="text-center italic text-xs text-stone-400">
                          {s.roman}
                        </p>
                      )}
                      {s.english && (
                        <p className="text-center text-xs text-stone-300 font-serif">
                          "{s.english}"
                        </p>
                      )}
                      {s.poeticContext && (
                        <p className="text-[10px] text-stone-500 leading-relaxed bg-stone-900/30 p-2.5 rounded-lg border border-stone-900/50">
                          <strong className="text-stone-400 font-sans">Why this works:</strong> {s.poeticContext}
                        </p>
                      )}

                      {/* actions */}
                      <div className="flex justify-end gap-3.5 pt-2 border-t border-stone-900/50 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            const id = `us-${idx}`;
                            if (currentSpeakingId === id && isSpeaking) {
                              stop();
                            } else {
                              speak(id, s.urdu);
                            }
                          }}
                          className={`text-[10px] flex items-center gap-1 cursor-pointer ${
                            currentSpeakingId === `us-${idx}` && isSpeaking
                              ? "text-amber-400 font-semibold"
                              : "text-stone-400 hover:text-amber-400"
                          }`}
                          title={currentSpeakingId === `us-${idx}` && isSpeaking ? "Stop recitation" : "Recite Urdu Couplet"}
                        >
                          {currentSpeakingId === `us-${idx}` && isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Recite</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onEditInCardCreator({
                            id: `us-${idx}`,
                            urdu: s.urdu,
                            roman: s.roman,
                            english: s.english,
                            poet: "Ustaad-e-Zauq"
                          })}
                          className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Create Card</span>
                        </button>
                        <button
                          onClick={() => onSaveSher({
                            id: `us-${idx}`,
                            urdu: s.urdu,
                            roman: s.roman,
                            english: s.english,
                            poet: "Ustaad-e-Zauq"
                          })}
                          className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Heart className={`w-3 h-3 ${savedSherIds.includes(`us-${idx}`) ? "fill-amber-400 text-amber-400" : ""}`} />
                          <span>Save to Notebook</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-stone-900/10 border border-stone-900/60 rounded-3xl p-16 text-center"
            >
              <Feather className="w-12 h-12 text-stone-700 mb-4 stroke-[1.5]" />
              <h3 className="text-base font-serif font-semibold text-stone-400 mb-2">The Inkwell Awaits</h3>
              <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
                Choose a mode in the sidebar, type your verse, and click "Consult Ustaad" to receive deep artistic review and completion options.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
