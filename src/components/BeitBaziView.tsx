import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Sparkles, Send, RefreshCw, Trophy, Crown, HelpCircle, ArrowRight, Heart, Share2, Volume2, VolumeX } from "lucide-react";
import { BeitBaziTurn, Sher } from "../types";
import { STARTER_SHERS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface BeitBaziViewProps {
  onSaveSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  savedSherIds: string[];
}

export default function BeitBaziView({ onSaveSher, onEditInCardCreator, savedSherIds }: BeitBaziViewProps) {
  const [turns, setTurns] = useState<BeitBaziTurn[]>([]);
  const [userCouplet, setUserCouplet] = useState("");
  const [loading, setLoading] = useState(false);
  const [gameScore, setGameScore] = useState({ rounds: 0, points: 0 });
  const [nextRequiredLetter, setNextRequiredLetter] = useState<string>("A"); // Initial or prompt-based
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  // Stop speaking on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const handleSubmit = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToSubmit = (customText || userCouplet).trim();
    if (!textToSubmit) return;

    setLoading(true);
    setErrorMsg(null);
    setUserCouplet("");

    // Append user turn immediately
    const userTurn: BeitBaziTurn = {
      sender: "user",
      coupletUrdu: textToSubmit,
      coupletRoman: "", // filled by bot or ignored
      coupletEnglish: "",
      poet: "You (Sikh-e-Sukhān)",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedTurns = [...turns, userTurn];
    setTurns(updatedTurns);

    try {
      const response = await fetch("/api/gemini/beit-bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCouplet: textToSubmit,
          history: updatedTurns.slice(-6) // Send recent turns for context
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to retrieve poetic response.");
      }

      const botReply = await response.json();

      // Append bot turn
      const botTurn: BeitBaziTurn = {
        sender: "bot",
        coupletUrdu: botReply.botCoupletUrdu,
        coupletRoman: botReply.botCoupletRoman,
        coupletEnglish: botReply.botCoupletEnglish,
        detectedLetterUrdu: botReply.detectedLetterUrdu,
        detectedLetterEnglish: botReply.detectedLetterEnglish,
        poet: botReply.poet,
        explanation: botReply.explanation,
        dialogue: botReply.dialogue,
        nextLetter: botReply.nextStartingLetter,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTurns((prev) => [...prev, botTurn]);
      setNextRequiredLetter(botReply.nextStartingLetter || "A");
      setGameScore((prev) => ({
        rounds: prev.rounds + 1,
        points: prev.points + 15
      }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ustaad is meditating. Please try again.");
      // Remove last user turn so they can re-submit
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTurns([]);
    setNextRequiredLetter("A");
    setGameScore({ rounds: 0, points: 0 });
    setErrorMsg(null);
  };

  // Provide starter suggestions matching the required next letter
  // (We filter STARTER_SHERS loosely, or just show them all to help the user start)
  const suggestions = STARTER_SHERS.filter((s) => {
    if (nextRequiredLetter === "A") return true;
    const letter = nextRequiredLetter.toUpperCase();
    return (
      s.roman.toUpperCase().startsWith(letter) || 
      s.roman.toUpperCase().includes(" " + letter) ||
      letter === "A" // fallback
    );
  }).slice(0, 3);

  // If no specific matching starter suggestions, fallback to first 3 starters
  const displaySuggestions = suggestions.length > 0 ? suggestions : STARTER_SHERS.slice(0, 3);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="zauq-beitbazi-arena">
      {/* Game Stats & Sidebar */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        {/* Scorecard */}
        <div className="bg-gradient-to-br from-amber-950/20 via-stone-900/40 to-stone-900/60 p-6 rounded-3xl border border-amber-500/10 shadow-xl relative overflow-hidden">
          {/* Sparkle background accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-sans font-semibold text-stone-100 uppercase tracking-wider">Mushaira Scorecard</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-950/50 p-4 rounded-2xl border border-stone-900 text-center">
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Rounds Dualed</span>
              <span className="text-2xl font-serif text-amber-200 font-semibold">{gameScore.rounds}</span>
            </div>
            <div className="bg-stone-950/50 p-4 rounded-2xl border border-stone-900 text-center">
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Sukhan Points</span>
              <span className="text-2xl font-serif text-amber-400 font-semibold">{gameScore.points}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Rank: <strong className="text-amber-200">Shair-e-Nau (Novice Poet)</strong></span>
            </div>
            <button
              onClick={handleReset}
              className="text-stone-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restart Duel</span>
            </button>
          </div>
        </div>

        {/* Dynamic Required Letter Indicator */}
        <div className="bg-stone-900/30 p-5 rounded-3xl border border-stone-900 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2">Next Required Letter</span>
          
          <motion.div
            key={nextRequiredLetter}
            initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            className="w-16 h-16 rounded-full bg-amber-950/40 border-2 border-amber-500/40 flex items-center justify-center shadow-xl shadow-amber-950/40 mb-3"
          >
            <span className="text-2xl font-serif font-bold text-amber-300 tracking-wider">
              {nextRequiredLetter}
            </span>
          </motion.div>

          <p className="text-xs text-stone-400 px-4 leading-relaxed">
            Your next couplet should phonetically start with or feature the letter <strong className="text-amber-300 font-serif">"{nextRequiredLetter}"</strong>.
          </p>
        </div>

        {/* Help / Couplet suggestions */}
        <div className="bg-stone-900/20 p-5 rounded-3xl border border-stone-900/60">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Imdaad (Couplet Suggestions)</span>
          </h4>
          <p className="text-[11px] text-stone-500 mb-4">
            If you get stuck or don't know a couplet matching the required letter, tap any of these classical lines to submit instantly:
          </p>

          <div className="flex flex-col gap-3">
            {displaySuggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (loading) return;
                  setUserCouplet(s.urdu);
                  handleSubmit(undefined, s.urdu);
                }}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl bg-stone-950/60 hover:bg-amber-950/10 border border-stone-900 hover:border-amber-500/20 transition-all text-xs flex flex-col gap-1 group"
              >
                <p className="text-amber-200/80 font-serif line-clamp-1 group-hover:text-amber-300 transition-colors">
                  {s.urdu}
                </p>
                <div className="flex justify-between items-center text-[10px] text-stone-500">
                  <span>{s.poet}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Duel Chat-Arena */}
      <div className="xl:col-span-8 flex flex-col h-[600px] bg-stone-900/30 border border-stone-900 rounded-3xl overflow-hidden relative">
        {/* Arena Header */}
        <div className="p-4 border-b border-stone-900 bg-stone-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-sans font-semibold text-stone-200 uppercase tracking-widest">Zauq Poetic Duel Room</h3>
              <p className="text-[10px] text-stone-500 leading-none">Powered by Gemini AI Poet laureate</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-stone-500">Urdu Nasta'liq Enabled</span>
        </div>

        {/* Turns Logs Stream */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-stone-800">
          {turns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-stone-500" />
              </div>
              <h4 className="text-sm font-serif font-semibold text-stone-300 mb-1">Initiate the Bait-Bazi</h4>
              <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
                Submit your favorite couplet (Sher) in Urdu script, Devanagari, or Roman spelling. The AI will analyze it, detect the last letter, and strike back with a matching classic!
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {turns.map((turn, index) => {
                const isUser = turn.sender === "user";
                const hasDetails = turn.explanation || turn.dialogue;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"}`}
                  >
                    {/* Poet Name Label */}
                    <div className="flex items-center gap-2 mb-1.5 px-1 text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                      <span>{turn.poet} • {turn.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const id = `bb-${index}`;
                          if (currentSpeakingId === id && isSpeaking) {
                            stop();
                          } else {
                            speak(id, turn.coupletUrdu);
                          }
                        }}
                        className={`hover:text-amber-400 transition-colors cursor-pointer p-0.5 rounded flex items-center justify-center ${
                          currentSpeakingId === `bb-${index}` && isSpeaking ? "text-amber-400 font-bold animate-pulse" : ""
                        }`}
                        title={currentSpeakingId === `bb-${index}` && isSpeaking ? "Stop recitation" : "Listen to recitation"}
                      >
                        {currentSpeakingId === `bb-${index}` && isSpeaking ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Speech Card */}
                    <div className={`p-4 md:p-5 rounded-2xl border ${
                      isUser
                        ? "bg-stone-900 border-stone-800 text-stone-100 rounded-tr-none"
                        : "bg-stone-950 border-amber-950/40 text-stone-200 rounded-tl-none shadow-xl"
                    }`}>
                      {/* poetry text */}
                      <p className={`text-lg md:text-xl text-center leading-loose tracking-wide whitespace-pre-line select-text font-serif ${
                        isUser ? "text-stone-100" : "text-amber-200 font-urdu"
                      }`}>
                        {turn.coupletUrdu}
                      </p>

                      {/* Roman & Translation for Bot */}
                      {!isUser && (
                        <div className="mt-4 pt-4 border-t border-stone-900/60 flex flex-col gap-2.5">
                          {turn.coupletRoman && (
                            <p className="text-center italic text-xs text-stone-400">
                              {turn.coupletRoman}
                            </p>
                          )}
                          {turn.coupletEnglish && (
                            <p className="text-center text-xs text-stone-300 font-serif">
                              "{turn.coupletEnglish}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Extra dialogue/explanation expansion for Bot replies */}
                    {!isUser && hasDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 ml-3 p-3.5 bg-stone-900/30 rounded-xl border border-stone-900 text-xs text-stone-400 max-w-xl leading-relaxed flex flex-col gap-2"
                      >
                        {/* Letter stamp bubble */}
                        {turn.detectedLetterUrdu && (
                          <div className="flex items-center gap-1.5 border-b border-stone-900/60 pb-2 mb-1">
                            <div className="w-5 h-5 rounded bg-amber-950/50 border border-amber-500/30 text-[10px] font-serif text-amber-400 flex items-center justify-center font-bold">
                              {turn.detectedLetterUrdu}
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider">
                              Ustaad detected letter: <strong className="text-amber-300 font-sans">{turn.detectedLetterEnglish} ({turn.detectedLetterUrdu})</strong>
                            </span>
                          </div>
                        )}

                        {turn.dialogue && (
                          <p className="text-amber-200/80 italic font-serif">
                            "{turn.dialogue}"
                          </p>
                        )}
                        {turn.explanation && (
                          <p className="text-stone-400">
                            <strong className="text-stone-300">Tashreeh:</strong> {turn.explanation}
                          </p>
                        )}

                        {/* Interactive bar */}
                        <div className="flex justify-end gap-3.5 pt-2 border-t border-stone-900/60 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              const id = `bb-${index}`;
                              if (currentSpeakingId === id && isSpeaking) {
                                stop();
                              } else {
                                speak(id, turn.coupletUrdu);
                              }
                            }}
                            className={`text-[10px] flex items-center gap-1 cursor-pointer ${
                              currentSpeakingId === `bb-${index}` && isSpeaking
                                ? "text-amber-400 font-semibold"
                                : "text-stone-400 hover:text-amber-400"
                            }`}
                            title={currentSpeakingId === `bb-${index}` && isSpeaking ? "Stop recitation" : "Recite Urdu Couplet"}
                          >
                            {currentSpeakingId === `bb-${index}` && isSpeaking ? (
                              <>
                                <VolumeX className="w-3 h-3 animate-pulse text-amber-400" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Recite</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => onEditInCardCreator({
                              id: `bb-${index}`,
                              urdu: turn.coupletUrdu,
                              roman: turn.coupletRoman,
                              english: turn.coupletEnglish,
                              poet: turn.poet
                            })}
                            className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Create Card</span>
                          </button>
                          <button
                            onClick={() => onSaveSher({
                              id: `bb-${index}`,
                              urdu: turn.coupletUrdu,
                              roman: turn.coupletRoman,
                              english: turn.coupletEnglish,
                              poet: turn.poet
                            })}
                            className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Heart className={`w-3 h-3 ${savedSherIds.includes(`bb-${index}`) ? "fill-amber-400 text-amber-400" : ""}`} />
                            <span>Save to Diary</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {loading && (
            <div className="self-start flex flex-col items-start max-w-[80%]">
              <span className="text-[10px] font-mono text-stone-500 mb-1.5">Ustaad is crafting...</span>
              <div className="bg-stone-950 border border-stone-900 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [0.6, 1.1, 0.6] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-2 h-2 rounded-full bg-amber-500" />
                  <motion.div animate={{ scale: [0.6, 1.1, 0.6] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-2 h-2 rounded-full bg-amber-400" />
                  <motion.div animate={{ scale: [0.6, 1.1, 0.6] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-2 h-2 rounded-full bg-amber-600" />
                </div>
                <span className="text-xs text-stone-400 font-serif italic">Rhyming the words, tuning the bahar...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-950/20 border border-rose-950/40 text-rose-300 p-4 rounded-xl text-xs text-center max-w-md mx-auto">
              {errorMsg}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Arena Form Footer */}
        <form onSubmit={handleSubmit} className="p-4 bg-stone-950/60 border-t border-stone-900 flex items-center gap-3">
          <input
            type="text"
            placeholder={loading ? "Ustaad is searching his vocabulary..." : `Enter couplet starting with ${nextRequiredLetter}...`}
            value={userCouplet}
            onChange={(e) => setUserCouplet(e.target.value)}
            disabled={loading}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !userCouplet.trim()}
            className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-amber-950 border border-amber-500/20 hover:border-transparent transition-all flex items-center justify-center disabled:opacity-40 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 disabled:hover:border-amber-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
