import React, { useState, useEffect } from "react";
import { Music, Sparkles, Volume2, Info, Sunrise, Sun, Sunset, Moon, Compass, VolumeX } from "lucide-react";
import { CourtAmbientSynthInstance, RAGA_PRESETS } from "../audio";
import { motion, AnimatePresence } from "motion/react";

export default function SitarRoom() {
  const [activeString, setActiveString] = useState<number | null>(null);
  const [isSynthRunning, setIsSynthRunning] = useState(() => CourtAmbientSynthInstance.getActiveState());
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [selectedRagaId, setSelectedRagaId] = useState<string>(() => CourtAmbientSynthInstance.getActiveRagaId());

  // Auto sync check to match current system time of day
  useEffect(() => {
    if (!isAutoSync) return;

    const checkTimeAndSetRaga = () => {
      const hour = new Date().getHours();
      let detectedId = "bhairavi";
      if (hour >= 6 && hour < 12) {
        detectedId = "ahir_bhairav";
      } else if (hour >= 12 && hour < 17) {
        detectedId = "bilaval";
      } else if (hour >= 17 && hour < 20) {
        detectedId = "yaman";
      } else {
        detectedId = "bhairavi";
      }

      if (detectedId !== selectedRagaId) {
        setSelectedRagaId(detectedId);
        CourtAmbientSynthInstance.setRaga(detectedId);
      }
    };

    checkTimeAndSetRaga();
    const interval = setInterval(checkTimeAndSetRaga, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isAutoSync, selectedRagaId]);

  // Keep state updated in case synth is controlled elsewhere or starts up
  useEffect(() => {
    const checkState = setInterval(() => {
      setIsSynthRunning(CourtAmbientSynthInstance.getActiveState());
    }, 1000);
    return () => clearInterval(checkState);
  }, []);

  const handlePluck = (id: number) => {
    setActiveString(id);
    CourtAmbientSynthInstance.playInteractiveNote(id);
    // Refresh synth running state
    setIsSynthRunning(true);
    setTimeout(() => {
      setActiveString((curr) => (curr === id ? null : curr));
    }, 800);
  };

  const handleToggleSynth = async () => {
    if (isSynthRunning) {
      CourtAmbientSynthInstance.stop();
      setIsSynthRunning(false);
    } else {
      await CourtAmbientSynthInstance.start();
      setIsSynthRunning(true);
    }
  };

  const handleSelectRaga = (ragaId: string) => {
    setIsAutoSync(false);
    setSelectedRagaId(ragaId);
    CourtAmbientSynthInstance.setRaga(ragaId);
  };

  // Get active raga configurations
  const activeRaga = RAGA_PRESETS.find(r => r.id === selectedRagaId) || RAGA_PRESETS[3];

  // Dynamically build strings based on active raga's Just Intonation ratios and notes
  const dynamicStrings = activeRaga.scaleDegrees.map((deg, idx) => {
    const frequencyHz = Math.round(activeRaga.rootHz * 2 * deg);
    return {
      id: idx,
      note: activeRaga.noteNames[idx] || "Sa",
      frequency: `${frequencyHz} Hz`,
      ratio: deg.toFixed(3),
    };
  });

  const getRagaIcon = (id: string) => {
    switch (id) {
      case "ahir_bhairav":
        return <Sunrise className="w-4 h-4 text-amber-400" />;
      case "bilaval":
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case "yaman":
        return <Sunset className="w-4 h-4 text-purple-400" />;
      default:
        return <Moon className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Setup styling gradients for the glow elements based on raga
  const getGlowStyles = () => {
    switch (activeRaga.glowColor) {
      case "amber":
        return {
          bg: "bg-gradient-to-br from-stone-950 via-amber-950/20 to-stone-900/60",
          border: "border-amber-900/30",
          topBlob: "bg-amber-500/10",
          bottomBlob: "bg-orange-500/10"
        };
      case "yellow":
        return {
          bg: "bg-gradient-to-br from-stone-950 via-yellow-950/15 to-stone-900/70",
          border: "border-yellow-900/30",
          topBlob: "bg-yellow-500/10",
          bottomBlob: "bg-amber-500/5"
        };
      case "purple":
        return {
          bg: "bg-gradient-to-br from-stone-950 via-purple-950/20 to-stone-900/60",
          border: "border-purple-900/30",
          topBlob: "bg-purple-500/10",
          bottomBlob: "bg-indigo-500/10"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-stone-950 via-indigo-950/25 to-black",
          border: "border-indigo-900/30",
          topBlob: "bg-indigo-500/15",
          bottomBlob: "bg-purple-950/15"
        };
    }
  };

  const glow = getGlowStyles();

  return (
    <div 
      className={`${glow.bg} ${glow.border} transition-all duration-1000 rounded-3xl p-6 border shadow-2xl relative overflow-hidden`} 
      id="zauq-sitar-room"
    >
      {/* Decorative Miniature/Floral Background Accents */}
      <div className={`absolute top-0 right-0 w-44 h-44 ${glow.topBlob} rounded-full blur-3xl pointer-events-none transition-all duration-1000`} />
      <div className={`absolute bottom-0 left-0 w-44 h-44 ${glow.bottomBlob} rounded-full blur-3xl pointer-events-none transition-all duration-1000`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-900/60 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="text-lg font-sans font-medium text-stone-100 tracking-tight flex items-center gap-2">
              Sitar-e-Khizana 
              <span className="text-[11px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Ambient Mode
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Tap or hover over the brass strings to perform. The courtroom drone dynamically shifts melodies matching natural cycles.
          </p>
        </div>
        
        {/* Tanpura Drone Control */}
        <button
          onClick={handleToggleSynth}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
            isSynthRunning
              ? "bg-amber-500 text-stone-950 border-amber-400 hover:bg-amber-400 shadow-lg shadow-amber-500/10"
              : "bg-stone-900 text-stone-400 hover:text-amber-400 border-stone-800 hover:border-amber-500/20"
          }`}
          title={isSynthRunning ? "Mute Tanpura Background Drone" : "Start Courtroom Drone Atmosphere"}
        >
          {isSynthRunning ? (
            <>
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>Drone Playing</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Drone Silenced</span>
            </>
          )}
        </button>
      </div>

      {/* Ambient Control Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        {/* Sync Indicator Column */}
        <div className="lg:col-span-1 bg-stone-900/60 border border-stone-900/80 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Court Alignment</span>
            <div className="flex items-center gap-2">
              <Compass className={`w-4 h-4 ${isAutoSync ? "text-emerald-400 animate-spin" : "text-stone-500"}`} style={{ animationDuration: isAutoSync ? "8s" : "0s" }} />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-200">
                {isAutoSync ? "Auto Time-Sync" : "Manual Raga"}
              </span>
            </div>
            <p className="text-[10px] text-stone-500 font-serif mt-2 leading-relaxed">
              Auto-sync aligns the tuning of the Sitar with the planetary hour.
            </p>
          </div>

          <button
            onClick={() => setIsAutoSync(!isAutoSync)}
            className={`mt-4 w-full py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all cursor-pointer ${
              isAutoSync
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-stone-950 border-stone-800 text-stone-400 hover:text-amber-400 hover:border-amber-500/20"
            }`}
          >
            {isAutoSync ? "Lock Manual Mode" : "Sync with Time"}
          </button>
        </div>

        {/* Preset Selector Grid */}
        <div className="lg:col-span-3 bg-stone-900/40 border border-stone-900/40 p-4 rounded-2xl">
          <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-2">Select Court Melodic Cycle (Raga)</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {RAGA_PRESETS.map((r) => {
              const isActive = selectedRagaId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRaga(r.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer relative overflow-hidden ${
                    isActive
                      ? "bg-stone-900/90 border-amber-500/40 shadow-md shadow-amber-500/5 text-stone-100"
                      : "bg-stone-950/60 border-stone-900 text-stone-400 hover:border-stone-800 hover:text-stone-200"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    {getRagaIcon(r.id)}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping absolute top-3 right-3" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-serif font-semibold block leading-tight text-amber-200/90">
                      {r.name.split(" ")[1]}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500 block truncate mt-0.5">
                      {r.timeOfDay.split(" ")[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Raga Metadata HUD */}
      <div className="bg-stone-950/90 border border-stone-900 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-sans font-medium text-amber-300">{activeRaga.name}</span>
            <span className="text-xs text-stone-500 font-mono">({activeRaga.hindiName})</span>
          </div>
          <p className="text-xs text-stone-400 font-serif leading-relaxed">
            {activeRaga.description}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-5 border-t md:border-t-0 md:border-l border-stone-900 pt-3 md:pt-0 md:pl-5 font-mono text-[10px] uppercase tracking-wider text-stone-500">
          <div>
            <span className="block text-stone-600">Base Pitch</span>
            <span className="text-amber-400 font-bold">{activeRaga.rootHz} Hz</span>
          </div>
          <div>
            <span className="block text-stone-600">Scale Type</span>
            <span className="text-stone-300 font-bold">Just Intonation</span>
          </div>
        </div>
      </div>

      {/* Sitar Body Frame */}
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 rounded-2xl p-6 border border-amber-900/10 relative z-10 transition-colors duration-1000">
        {/* Sitar Wooden Bridge Lines */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-stone-950 border-b border-amber-500/10 rounded-t-xl" />
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-stone-950 border-t border-amber-500/10 rounded-b-xl" />

        {/* Strings Container */}
        <div className="flex justify-between items-stretch h-80 relative px-2 md:px-10 py-4">
          {/* Bridge overlay */}
          <div className="absolute top-4 left-0 right-0 h-1.5 bg-stone-800 shadow" />
          <div className="absolute bottom-4 left-0 right-0 h-1.5 bg-stone-800 shadow" />

          {dynamicStrings.map((str) => {
            const isPlucked = activeString === str.id;
            
            return (
              <div
                key={str.id}
                className="flex flex-col items-center justify-between h-full relative cursor-pointer group"
                onClick={() => handlePluck(str.id)}
                onMouseEnter={() => handlePluck(str.id)}
                style={{ width: `${100 / dynamicStrings.length}%` }}
              >
                {/* Note Label (Top) */}
                <div className="text-center select-none z-10">
                  <span className={`text-xs font-mono font-semibold block transition-colors duration-200 ${
                    isPlucked ? "text-amber-400" : "text-stone-500 group-hover:text-stone-300"
                  }`}>
                    {str.note}
                  </span>
                  <span className="text-[8px] text-stone-600 block leading-tight font-mono tracking-wider">
                    {str.frequency}
                  </span>
                </div>

                {/* Sitar String Line */}
                <div className="absolute top-6 bottom-6 left-1/2 -translate-x-1/2 w-4 flex justify-center items-center">
                  {/* String Core Line */}
                  <motion.div
                    animate={isPlucked ? {
                      x: [0, -6, 5, -4, 3, -1, 0],
                      scaleX: [1, 1.3, 0.9, 1.1, 0.95, 1],
                    } : {}}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className={`h-full w-[1.5px] rounded transition-all duration-300 ${
                      isPlucked 
                        ? "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 shadow-lg shadow-amber-500/50 w-[2.5px]" 
                        : "bg-gradient-to-b from-stone-700 via-amber-700/60 to-stone-700 group-hover:from-amber-600/70 group-hover:to-amber-600/70"
                    }`}
                  />
                  {/* Glowing Pluck Aura */}
                  {isPlucked && (
                    <motion.div
                      initial={{ opacity: 0.6, scaleY: 0.8 }}
                      animate={{ opacity: 0, scaleY: 1 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-y-0 w-4 bg-amber-500/10 rounded-full filter blur-[2px]"
                    />
                  )}
                </div>

                {/* Ratio Label (Bottom) */}
                <div className="text-center select-none z-10">
                  <span className={`text-[10px] font-mono transition-colors duration-200 ${
                    isPlucked ? "text-amber-400" : "text-stone-600 group-hover:text-stone-400"
                  }`}>
                    {str.ratio}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tuning/Usage Information Banner */}
      <div className="mt-5 flex items-start gap-2.5 bg-stone-900/40 border border-stone-900/60 p-3.5 rounded-xl relative z-10">
        <Info className="w-4 h-4 text-amber-500/80 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-stone-400 leading-relaxed">
          <span className="text-amber-200 font-medium">Court Tip:</span> Swipe your finger or mouse cursor across the strings to play an arpeggio sweep. The interactive strings and background performance align with classical Indian scale ratios to maximize tranquility.
        </div>
      </div>
    </div>
  );
}
