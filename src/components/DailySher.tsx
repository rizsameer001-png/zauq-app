import React, { useState, useEffect } from "react";
import { 
  Quote, 
  Sparkles, 
  Heart, 
  Palette, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  BookOpen,
  Volume2,
  Bell,
  BellOff,
  Clock
} from "lucide-react";
import { Sher, Ghazal } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useLocalNotification } from "../hooks/useLocalNotification";

interface DailySherProps {
  ghazals: Ghazal[];
  onSaveSher: (sher: Sher) => void;
  savedSherIds: string[];
  onRemoveSher?: (id: string) => void;
  onEditInCardCreator: (sher: Sher) => void;
  dailyCouplets?: any[];
}

export default function DailySher({
  ghazals,
  onSaveSher,
  savedSherIds,
  onRemoveSher,
  onEditInCardCreator,
  dailyCouplets = []
}: DailySherProps) {
  const [currentSher, setCurrentSher] = useState<Sher | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();
  const {
    permission: notifPermission,
    config: notifConfig,
    requestPermission: requestNotifPermission,
    saveConfig: saveNotifConfig,
    triggerTestNotification
  } = useLocalNotification(ghazals);

  const handleRecite = () => {
    if (!currentSher) return;
    if (currentSpeakingId === currentSher.id && isSpeaking) {
      stop();
    } else {
      speak(currentSher.id, currentSher.urdu);
    }
  };

  // Extract all shers across all available ghazals
  const getAllShers = (): Sher[] => {
    const list: Sher[] = [];
    ghazals.forEach((g) => {
      if (g.shers && g.shers.length > 0) {
        g.shers.forEach((s) => {
          list.push({
            ...s,
            poet: s.poet || g.poet
          });
        });
      }
    });
    return list;
  };

  // Select a deterministic daily sher based on current date
  const getDeterministicDailySher = (shersList: Sher[]): Sher | null => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");
    const dateStrFormatted = `${year}-${month}-${date}`;
    const dateStrLegacy = `${year}-${today.getMonth() + 1}-${today.getDate()}`;

    // 1. If dailyCouplets has a pinned record for today, use it!
    if (dailyCouplets && dailyCouplets.length > 0) {
      const pinned = dailyCouplets.find(c => c.activeDate === dateStrFormatted || c.activeDate === dateStrLegacy);
      if (pinned) {
        return pinned;
      }

      // 2. Otherwise, select deterministically from dailyCouplets list
      let hash = 0;
      for (let i = 0; i < dateStrFormatted.length; i++) {
        hash = (hash << 5) - hash + dateStrFormatted.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dailyCouplets.length;
      return dailyCouplets[index];
    }

    if (shersList.length === 0) return null;
    
    // Hash function to get a consistent number from the date string
    let hash = 0;
    for (let i = 0; i < dateStrLegacy.length; i++) {
      hash = (hash << 5) - hash + dateStrLegacy.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    const index = Math.abs(hash) % shersList.length;
    return shersList[index];
  };

  // Initialize or re-evaluate when ghazals list changes
  useEffect(() => {
    const shers = getAllShers();
    if ((shers.length > 0 || (dailyCouplets && dailyCouplets.length > 0)) && !isRandomMode) {
      const daily = getDeterministicDailySher(shers);
      setCurrentSher(daily);
    }
  }, [ghazals, dailyCouplets, isRandomMode]);

  if (!currentSher) return null;

  const isSaved = savedSherIds.includes(currentSher.id);

  // Toggle Favorite
  const handleToggleFavorite = () => {
    if (isSaved) {
      if (onRemoveSher) onRemoveSher(currentSher.id);
    } else {
      onSaveSher(currentSher);
    }
  };

  // Copy couplet text
  const handleCopy = () => {
    const textToCopy = `${currentSher.urdu}\n\n${currentSher.roman || ""}\n\n"${currentSher.english || ""}"\n— ${currentSher.poet}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Get Another Random Sher
  const handleGetRandomSher = () => {
    const shers = getAllShers();
    if (shers.length <= 1) return;
    
    // Pick one that is different from current
    let randomSher = currentSher;
    let attempts = 0;
    while (randomSher.id === currentSher.id && attempts < 10) {
      const randIdx = Math.floor(Math.random() * shers.length);
      randomSher = shers[randIdx];
      attempts++;
    }
    
    setCurrentSher(randomSher);
    setIsRandomMode(true);
    setShowExplanation(false);
  };

  // Reset back to today's stable daily couplet
  const handleResetToDaily = () => {
    const shers = getAllShers();
    const daily = getDeterministicDailySher(shers);
    if (daily) {
      setCurrentSher(daily);
      setIsRandomMode(false);
      setShowExplanation(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full relative overflow-hidden rounded-3xl border border-amber-500/10 bg-gradient-to-b from-stone-900/60 to-stone-950/40 p-6 md:p-8 backdrop-blur-md shadow-2xl"
      id="zauq-daily-sher-banner"
    >
      {/* Decorative Golden Arch Silhouette Border Overlay */}
      <div className="absolute inset-2 border border-amber-500/[0.03] rounded-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none" />

      {/* Top Meta Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Quote className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80 font-bold block">
              {isRandomMode ? "Aesthetic Discovery" : "Daily Couplet Selection"}
            </span>
            <span className="text-xs font-serif text-stone-400">
              {isRandomMode ? "Selected at random" : "Featured Sher of the Day"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRandomMode && (
            <button
              onClick={handleResetToDaily}
              className="px-3 py-1.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 text-amber-400 hover:text-amber-300 text-[10px] font-mono uppercase border border-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Today's Featured</span>
            </button>
          )}

          <button
            onClick={handleGetRandomSher}
            className="px-3 py-1.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-stone-200 text-[10px] font-mono uppercase border border-stone-800 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Discover another random couplet"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Discover Another</span>
          </button>
        </div>
      </div>

      {/* Main Core Couplet Display */}
      <div className="flex flex-col items-center text-center gap-6 py-4 relative z-10">
        {/* Large Aesthetic Urdu Calligraphy */}
        <motion.p 
          key={currentSher.urdu}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-2xl md:text-3.5xl font-urdu text-amber-100/90 leading-[1.8] font-bold font-serif whitespace-pre-line tracking-wide drop-shadow-md select-all"
          dir="rtl"
        >
          {currentSher.urdu}
        </motion.p>

        {/* Translation Meta block */}
        <div className="flex flex-col gap-1.5 max-w-2xl px-4">
          {currentSher.roman && (
            <p className="text-xs md:text-sm italic text-stone-400/85 tracking-wide leading-relaxed font-serif">
              {currentSher.roman}
            </p>
          )}
          {currentSher.english && (
            <p className="text-sm md:text-base text-stone-300 tracking-wide font-serif leading-relaxed mt-1">
              "{currentSher.english}"
            </p>
          )}
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 font-semibold mt-3">
            — {currentSher.poet}
          </p>
        </div>
      </div>

      {/* Action Tray */}
      <div className="flex flex-wrap justify-between items-center border-t border-stone-900 pt-5 mt-4 relative z-10 gap-4">
        {/* Explanation / Tashreeh expand button */}
        {currentSher.explanation && (
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-stone-400 hover:text-amber-400 text-xs font-serif font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Ustaad's Commentary / Tashreeh</span>
            {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Utilities */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Daily Reminder Scheduler Button */}
          <button
            onClick={() => setShowNotificationSettings(!showNotificationSettings)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              notifConfig.enabled
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
                : "bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-amber-400 border-stone-850 hover:border-amber-500/20"
            }`}
            title="Schedule Daily Reminders"
          >
            {notifConfig.enabled ? (
              <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>

          {/* Recite TTS Button */}
          <button
            onClick={handleRecite}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              currentSher && currentSpeakingId === currentSher.id && isSpeaking
                ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400"
                : "bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-amber-400 border-stone-850 hover:border-amber-500/20"
            }`}
            title={currentSher && currentSpeakingId === currentSher.id && isSpeaking ? "Stop recitation" : "Listen to Urdu recitation"}
          >
            <Volume2 className={`w-4 h-4 ${currentSher && currentSpeakingId === currentSher.id && isSpeaking ? "animate-pulse" : ""}`} />
          </button>

          {/* Card creator customizer link */}
          <button
            onClick={() => onEditInCardCreator(currentSher)}
            className="p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-amber-400 border border-stone-850 hover:border-amber-500/20 transition-all cursor-pointer"
            title="Design a customized poetry card"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Copy action */}
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-amber-400 border border-stone-850 hover:border-amber-500/20 transition-all cursor-pointer"
            title="Copy couplet details to clipboard"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Favorite heart icon */}
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer text-xs font-mono uppercase tracking-wider font-bold ${
              isSaved
                ? "bg-rose-950/20 border-rose-900/50 text-rose-400 hover:bg-rose-950/40"
                : "bg-stone-900/60 hover:bg-stone-900 text-stone-400 hover:text-rose-400 border-stone-850 hover:border-rose-500/10"
            }`}
            title={isSaved ? "Saved in notebook" : "Save to Mera Deewan notebook"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-current text-rose-400" : ""}`} />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Explanation Panel */}
      <AnimatePresence>
        {showExplanation && currentSher.explanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            <div className="bg-stone-950/60 border border-amber-500/5 rounded-2xl p-5 mt-1">
              <h5 className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Philosophical Commentary / Tashreeh</span>
              </h5>
              <p className="text-xs text-stone-400 font-serif leading-relaxed italic whitespace-pre-line">
                {currentSher.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Notification Scheduling Panel */}
      <AnimatePresence>
        {showNotificationSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            <div className="bg-stone-950/80 border border-amber-500/10 rounded-2xl p-5 md:p-6 mt-1 flex flex-col md:flex-row gap-5 items-start justify-between">
              <div className="flex-1 text-left">
                <h5 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5 font-bold">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>Daily Reminders • یاد دہانی</span>
                </h5>
                <p className="text-stone-400 text-xs font-serif leading-relaxed">
                  Set a daily reminder time. Receive system notifications presenting today's featured poetry couplet directly on your device, even if you are not currently in the application.
                </p>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 mt-3 font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-stone-500">Permission:</span>
                  {notifPermission === "granted" ? (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Active 🟢</span>
                  ) : notifPermission === "denied" ? (
                    <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">Blocked 🔴</span>
                  ) : (
                    <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Not Requested ⚪</span>
                  )}
                </div>
              </div>

              {/* Controls Column */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3.5 w-full md:w-auto shrink-0 justify-end items-stretch sm:items-center md:items-stretch">
                <div className="flex items-center gap-3">
                  {/* Daily Active Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifConfig.enabled}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        if (checked && notifPermission !== "granted") {
                          const result = await requestNotifPermission();
                          if (result === "granted") {
                            saveNotifConfig({ ...notifConfig, enabled: true });
                          }
                        } else {
                          saveNotifConfig({ ...notifConfig, enabled: checked });
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-stone-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-amber-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-stone-400 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-stone-950 peer-checked:after:border-amber-300"></div>
                    <span className="ml-2 text-xs font-mono font-bold uppercase tracking-wider text-stone-300 select-none">
                      {notifConfig.enabled ? "Reminder On" : "Reminder Off"}
                    </span>
                  </label>
                </div>

                {/* Hour and Minute Clock Picker */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-850 text-stone-400">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="time"
                    value={notifConfig.time}
                    disabled={!notifConfig.enabled}
                    onChange={(e) => {
                      saveNotifConfig({
                        ...notifConfig,
                        time: e.target.value
                      });
                    }}
                    className="bg-stone-900/80 border border-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-amber-200 text-xs font-mono px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer w-full sm:w-auto"
                  />
                </div>

                {/* Instant Test Alert */}
                <button
                  onClick={triggerTestNotification}
                  disabled={notifPermission !== "granted" && notifConfig.enabled}
                  className="px-4 py-2 text-center text-xs font-mono uppercase tracking-widest bg-stone-900 hover:bg-stone-850 text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed border border-stone-800 hover:border-amber-500/20 rounded-xl transition-all cursor-pointer font-bold"
                >
                  Test Notification
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
