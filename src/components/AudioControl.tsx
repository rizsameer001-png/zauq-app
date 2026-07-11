import React, { useState, useEffect } from "react";
import { Play, Square, Music, Volume2, Sparkles } from "lucide-react";
import { CourtAmbientSynthInstance } from "../audio";
import { motion } from "motion/react";

export default function AudioControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setIsPlaying(CourtAmbientSynthInstance.getActiveState());
    
    // Automatically show tooltip to entice users to enable ambient sound
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 4000);
    
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 9000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleToggle = async () => {
    if (isPlaying) {
      CourtAmbientSynthInstance.stop();
      setIsPlaying(false);
    } else {
      await CourtAmbientSynthInstance.start();
      setIsPlaying(true);
      setShowTooltip(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" id="zauq-audio-widget">
      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="mb-3 max-w-xs bg-amber-950/95 border border-amber-500/40 text-amber-100 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md"
        >
          <div className="flex items-center gap-1.5 font-medium mb-1 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zauq-e-Samaat (Courtly Ambient)</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed">
            Enhance your reading. Toggle native synthesis for a Tanpura drone and soft Sitar plucks.
          </p>
        </motion.div>
      )}

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 border backdrop-blur-md ${
          isPlaying
            ? "bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-amber-950/40"
            : "bg-stone-900/90 border-stone-800 text-stone-400 hover:text-amber-200 hover:border-amber-900/50"
        }`}
      >
        {isPlaying ? (
          <div className="flex items-center gap-1.5">
            {/* Minimal Animated Equalizer */}
            <div className="flex items-end gap-0.5 h-3.5 w-4.5 overflow-hidden">
              <motion.div
                animate={{ height: ["20%", "100%", "20%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="w-1 bg-amber-400 rounded-t-full"
              />
              <motion.div
                animate={{ height: ["40%", "80%", "40%"] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                className="w-1 bg-amber-500 rounded-t-full"
              />
              <motion.div
                animate={{ height: ["10%", "90%", "10%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-1 bg-amber-300 rounded-t-full"
              />
            </div>
            <span className="text-xs font-mono tracking-wider text-amber-400 font-medium uppercase">Court Melody ON</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-medium tracking-wide uppercase">Ambient Off</span>
          </div>
        )}

        <div className={`p-1 rounded-full ${isPlaying ? "bg-amber-500/20 text-amber-300" : "bg-stone-800 text-stone-500"}`}>
          {isPlaying ? <Square className="w-3 h-3 fill-amber-300" /> : <Play className="w-3 h-3 fill-stone-500" />}
        </div>
      </motion.button>
    </div>
  );
}
