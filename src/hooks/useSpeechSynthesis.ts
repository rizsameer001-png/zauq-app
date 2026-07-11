import { useState, useEffect, useCallback, useRef } from "react";

export interface SpeechSynthesisOptions {
  rate?: number; // Speed: 0.1 to 10
  pitch?: number; // Pitch: 0 to 2
  volume?: number; // Volume: 0 to 1
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize and check support
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSupported(true);
      synthRef.current = window.speechSynthesis;
      
      const updateVoices = () => {
        if (synthRef.current) {
          const availableVoices = synthRef.current.getVoices();
          setVoices(availableVoices);
        }
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  // Monitor speaking status
  useEffect(() => {
    const interval = setInterval(() => {
      if (synthRef.current) {
        const speaking = synthRef.current.speaking;
        const paused = synthRef.current.paused;
        setIsSpeaking(speaking);
        setIsPaused(paused);
        if (!speaking) {
          setCurrentSpeakingId(null);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const stop = useCallback(() => {
    if (!supported || !synthRef.current) return;
    synthRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSpeakingId(null);
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported || !synthRef.current) return;
    synthRef.current.pause();
    setIsPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported || !synthRef.current) return;
    synthRef.current.resume();
    setIsPaused(false);
  }, [supported]);

  const speak = useCallback((
    id: string,
    text: string,
    options: SpeechSynthesisOptions = {}
  ) => {
    if (!supported || !synthRef.current) return;

    // Stop any active recitation first
    synthRef.current.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure options
    utterance.rate = options.rate ?? 0.82; // Slower, more rhythmic, poetic speed
    utterance.pitch = options.pitch ?? 0.95; // Deep, soul-stirring pitch
    utterance.volume = options.volume ?? 1.0;

    // Find the absolute best matching voice
    // 1. Look for Urdu native (ur-PK, ur-IN, etc.)
    // 2. Look for Hindi native (hi-IN, which shares phonetic roots and recites Urdu beautifully)
    // 3. Look for Arabic/Persian/other if suitable, but usually fallback to standard
    const systemVoices = synthRef.current.getVoices();
    let bestVoice = systemVoices.find(v => v.lang.toLowerCase().startsWith("ur"));
    
    if (!bestVoice) {
      bestVoice = systemVoices.find(v => v.lang.toLowerCase().startsWith("hi"));
    }
    
    if (!bestVoice) {
      // Find default Google or standard voice
      bestVoice = systemVoices.find(v => v.default);
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      // Fallback explicitly to ur language tag anyway so browser tries local assets
      utterance.lang = "ur-PK";
    }

    // Set handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentSpeakingId(id);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSpeakingId(null);
    };

    synthRef.current.speak(utterance);
  }, [supported]);

  return {
    supported,
    voices,
    isSpeaking,
    isPaused,
    currentSpeakingId,
    speak,
    stop,
    pause,
    resume
  };
}
