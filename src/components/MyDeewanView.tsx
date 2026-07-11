import React, { useState, useEffect } from "react";
import { Sher } from "../types";
import { BookOpen, Search, Trash2, Heart, Plus, Sparkles, Share2, Copy, Check, Feather, Cloud, CloudOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface MyDeewanViewProps {
  savedShers: Sher[];
  onRemoveSher: (id: string) => void;
  onAddCustomSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  user: any;
  onSignIn: () => void;
}

export default function MyDeewanView({ 
  savedShers, 
  onRemoveSher, 
  onAddCustomSher, 
  onEditInCardCreator,
  user,
  onSignIn
}: MyDeewanViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedSherId, setCopiedSherId] = useState<string | null>(null);

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  // New composition state
  const [newUrdu, setNewUrdu] = useState("");
  const [newRoman, setNewRoman] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const [newPoet, setNewPoet] = useState("");

  const filteredShers = savedShers.filter((s) => {
    return (
      s.urdu.includes(searchQuery) ||
      s.roman.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.poet.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCopy = (sher: Sher) => {
    const textToCopy = `${sher.urdu}\n\n${sher.roman}\n\n"${sher.english}"\n— ${sher.poet}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSherId(sher.id);
    setTimeout(() => setCopiedSherId(null), 2000);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrdu.trim()) return;

    const newSher: Sher = {
      id: `custom-${Date.now()}`,
      urdu: newUrdu,
      roman: newRoman,
      english: newEnglish,
      poet: newPoet.trim() || "You (Sikh-e-Sukhān)",
      isUserAdded: true
    };

    onAddCustomSher(newSher);
    
    // Reset form
    setNewUrdu("");
    setNewRoman("");
    setNewEnglish("");
    setNewPoet("");
    setShowAddForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="zauq-notebook-diary">
      {/* Controls & Add Composition (Left) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Cloud Sync Status */}
        <div className="bg-stone-900/40 p-4 rounded-2xl border border-stone-900/80 backdrop-blur-md flex flex-col gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Cloud className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-400 font-serif leading-none">Cloud Synced ☁️</p>
                <p className="text-[10px] text-stone-500 leading-normal mt-1">Your Deewan is securely backed up in Firestore.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <CloudOff className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-stone-300 font-serif leading-none">Offline Notebook Mode</p>
                  <p className="text-[10px] text-stone-500 leading-normal mt-1">Stored locally. Sign in to access your Deewan on any device!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignIn}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 hover:border-transparent text-amber-400 hover:text-amber-950 text-[10px] font-mono uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer font-bold"
              >
                <Sparkles className="w-3 h-3 text-current" />
                <span>Sync with Google Cloud</span>
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-stone-900/40 p-4 rounded-2xl border border-stone-900/80 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search my notebook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Toggle Form Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
            showAddForm
              ? "bg-stone-900 border-stone-800 text-stone-300"
              : "bg-amber-500/10 hover:bg-amber-500 border-amber-500/20 hover:border-transparent text-amber-400 hover:text-amber-950 shadow-md"
          }`}
        >
          {showAddForm ? (
            <span>Close Editor</span>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Compose Original Sher</span>
            </>
          )}
        </button>

        {/* New Composition form block */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddSubmit}
              className="bg-stone-900/20 p-5 rounded-3xl border border-stone-900/60 flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 pb-2 border-b border-stone-900">
                <Feather className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80">Bayaz-e-Sukhan (New Composition)</h4>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Urdu script text (Required)</label>
                <textarea
                  required
                  value={newUrdu}
                  onChange={(e) => setNewUrdu(e.target.value)}
                  placeholder="لکھیں اپنا کلام..."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 text-amber-200 text-center text-base placeholder-stone-800 rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/30 font-serif resize-none font-urdu"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Roman spelling</label>
                <input
                  type="text"
                  value={newRoman}
                  onChange={(e) => setNewRoman(e.target.value)}
                  placeholder="e.g. Likhein apna kalaam..."
                  className="w-full bg-stone-950 border border-stone-800 text-stone-350 placeholder-stone-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30 font-serif italic text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">English translation</label>
                <input
                  type="text"
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  placeholder="Translation..."
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 placeholder-stone-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Poet name</label>
                <input
                  type="text"
                  value={newPoet}
                  onChange={(e) => setNewPoet(e.target.value)}
                  placeholder="Defaults to: You (Sikh-e-Sukhān)"
                  className="w-full bg-stone-950 border border-stone-800 text-stone-300 placeholder-stone-850 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs flex items-center justify-center gap-1 transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Deewan Notebook</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Diary Stream List (Right) */}
      <div className="lg:col-span-8 flex flex-col justify-stretch">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Mera Deewan ({filteredShers.length} Shers)</span>
          </span>
        </div>

        {filteredShers.length === 0 ? (
          <div className="bg-stone-900/10 border border-stone-900/60 rounded-3xl p-16 text-center flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-stone-700 mb-4 stroke-[1.5]" />
            <h3 className="text-sm font-serif font-semibold text-stone-400 mb-1">Your Personal Deewan is Empty</h3>
            <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
              Explore the classical anthology, duel in Beit-Bazi, or compose original poetry to populate your persistent digital notebook!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[600px] pr-2">
            <AnimatePresence>
              {filteredShers.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-stone-950/40 p-5 rounded-2xl border border-stone-900/70 hover:border-amber-950/30 transition-all flex flex-col justify-between group relative"
                >
                  {/* Custom Compose Stamp indicator */}
                  {s.isUserAdded && (
                    <span className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest">
                      Custom
                    </span>
                  )}

                  {/* Poetry content */}
                  <div className="flex flex-col gap-4 text-center">
                    <p className="text-lg text-amber-200/90 leading-loose font-serif font-urdu">
                      {s.urdu}
                    </p>
                    {s.roman && (
                      <p className="italic text-[10px] text-stone-400">
                        {s.roman}
                      </p>
                    )}
                    {s.english && (
                      <p className="text-xs text-stone-300 font-serif leading-relaxed px-2">
                        "{s.english}"
                      </p>
                    )}
                  </div>

                  {/* footer info & actions */}
                  <div className="mt-5 pt-3 border-t border-stone-900/60 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-stone-500">
                      Poet: <strong className="text-stone-400">{s.poet}</strong>
                    </span>

                    <div className="flex gap-2">
                      {/* Recite (Speech Synthesis) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (currentSpeakingId === s.id && isSpeaking) {
                            stop();
                          } else {
                            speak(s.id, s.urdu);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          currentSpeakingId === s.id && isSpeaking
                            ? "bg-amber-500 text-stone-950 hover:bg-amber-400 animate-pulse"
                            : "bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300"
                        }`}
                        title={currentSpeakingId === s.id && isSpeaking ? "Stop recitation" : "Recite Urdu Couplet"}
                      >
                        {currentSpeakingId === s.id && isSpeaking ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(s)}
                        className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 transition-colors"
                        title="Copy text"
                      >
                        {copiedSherId === s.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Card Designer */}
                      <button
                        onClick={() => onEditInCardCreator(s)}
                        className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 transition-colors"
                        title="Open in card designer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveSher(s.id)}
                        className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-950/20 text-stone-500 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-950/20"
                        title="Remove from notebook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
