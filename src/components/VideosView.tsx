import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Tv, 
  Mic, 
  MicOff, 
  Search, 
  Sparkles, 
  Volume2, 
  Compass, 
  Clock, 
  User, 
  Info,
  Youtube
} from "lucide-react";
import { ZauqVideo } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { getVideoFile } from "../videoDb";

interface VideosViewProps {
  videos: ZauqVideo[];
  triggerToast: (msg: string) => void;
}

// Simple YouTube embed utility
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  let videoId = "";
  if (url.includes("v=")) {
    const parts = url.split("v=");
    if (parts[1]) {
      videoId = parts[1].split("&")[0];
    }
  } else if (url.includes("youtu.be/")) {
    const parts = url.split("youtu.be/");
    if (parts[1]) {
      videoId = parts[1].split("?")[0];
    }
  } else if (url.includes("youtube.com/embed/")) {
    const parts = url.split("youtube.com/embed/");
    if (parts[1]) {
      videoId = parts[1].split("?")[0];
    }
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
}

export default function VideosView({ videos, triggerToast }: VideosViewProps) {
  const [activeVideo, setActiveVideo] = useState<ZauqVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [localVideoUrl, setLocalVideoUrl] = useState<string>("");
  
  // Voice search state
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Sync default active video on load
  useEffect(() => {
    if (videos.length > 0 && !activeVideo) {
      setActiveVideo(videos[0]);
    }
  }, [videos, activeVideo]);

  // Handle local video loading from IndexedDB if needed
  useEffect(() => {
    let objectUrl = "";
    const loadVideo = async () => {
      if (!activeVideo) {
        setLocalVideoUrl("");
        return;
      }

      if (activeVideo.isLocal || activeVideo.url.startsWith("local://")) {
        try {
          const blob = await getVideoFile(activeVideo.id);
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setLocalVideoUrl(objectUrl);
          } else {
            setLocalVideoUrl("");
          }
        } catch (err) {
          console.error("Failed to load local video file from IndexedDB:", err);
          setLocalVideoUrl("");
        }
      } else if (!activeVideo.url.includes("youtube.com") && !activeVideo.url.includes("youtu.be")) {
        // Direct MP4 link
        setLocalVideoUrl(activeVideo.url);
      } else {
        setLocalVideoUrl("");
      }
    };

    loadVideo();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeVideo]);

  // Extract all categories dynamically
  const categories = ["All", ...Array.from(new Set(videos.map(v => v.category)))];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US"; // also matches common Urdu names/words well in English transliteration

      rec.onstart = () => {
        setIsListening(true);
        setSpokenText("");
        setRecognitionError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        setIsListening(false);
        handleVoiceCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setRecognitionError("Microphone access denied. Please allow microphone permissions.");
        } else {
          setRecognitionError(`Voice error: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError("Web Speech API is not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [videos]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerToast("Voice search not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Perform action based on recognized speech transcript
  const handleVoiceCommand = (transcript: string) => {
    const cleanTranscript = transcript.toLowerCase().trim();
    triggerToast(`Voice Search: "${transcript}"`);

    // Look for phrases like "play nusrat" or just search terms
    let searchTarget = cleanTranscript;
    const playPrefixes = ["play", "search", "show", "find", "watch"];
    for (const prefix of playPrefixes) {
      if (cleanTranscript.startsWith(prefix + " ")) {
        searchTarget = cleanTranscript.substring(prefix.length + 1).trim();
        break;
      }
    }

    // Filter videos by closest match
    const matches = videos.filter(video => 
      video.title.toLowerCase().includes(searchTarget) ||
      video.artist.toLowerCase().includes(searchTarget) ||
      video.category.toLowerCase().includes(searchTarget) ||
      (video.description && video.description.toLowerCase().includes(searchTarget))
    );

    if (matches.length > 0) {
      // Auto play the first matched video
      setActiveVideo(matches[0]);
      setSearchQuery(searchTarget);
      triggerToast(`Autoplay: "${matches[0].title}" ✨`);
    } else {
      setSearchQuery(transcript);
      triggerToast(`No exact match to autoplay. Filtering list for: "${transcript}"`);
    }
  };

  // Filter video collection based on category and search query
  const filteredVideos = videos.filter(video => {
    const matchesCategory = selectedCategory === "All" || video.category === selectedCategory;
    const matchesSearch = 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8 w-full" id="zauq-videos-container">
      
      {/* Search and Speech Recognition Dashboard Banner */}
      <div className="bg-stone-900/30 border border-stone-900 p-5 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        {/* Arch ornament decor */}
        <div className="absolute inset-x-8 inset-y-2 border border-amber-500/5 rounded-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-amber-200 uppercase tracking-wide">
              Zauq-e-Sama'a
            </h2>
            <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mt-0.5">
              Curated classical recitations, sufi qawwalis & sitar performances
            </p>
          </div>
        </div>

        {/* Search controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 md:w-1/2">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search artists, titles, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-600 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Voice Search Activator */}
          <button
            onClick={toggleListening}
            className={`px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-mono font-medium transition-all duration-300 cursor-pointer ${
              isListening
                ? "bg-rose-500 border-rose-400 text-stone-950 shadow-lg shadow-rose-950/20 animate-pulse"
                : "bg-amber-500/15 border-amber-500/25 hover:border-amber-500/50 text-amber-400 hover:text-amber-300"
            }`}
            title="Search and Play with your Voice"
          >
            {isListening ? (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>Listening...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Voice Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Voice Status Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 backdrop-blur-md relative overflow-hidden"
          >
            {/* Visual audio pulse lines */}
            <div className="flex items-center gap-1.5 h-6 mb-1">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <span 
                  key={i} 
                  className="w-1 bg-amber-400 rounded-full animate-pulse" 
                  style={{ 
                    height: `${h * 4}px`, 
                    animationDelay: `${i * 100}ms`,
                    animationDuration: "0.8s"
                  }} 
                />
              ))}
            </div>
            <p className="text-xs text-amber-200 font-serif font-medium">
              "Sama'a Voice Assist Active"
            </p>
            <p className="text-[10px] text-stone-400 max-w-md font-mono">
              Say something like: <span className="text-amber-400 italic">"Play Nusrat"</span>, <span className="text-amber-400 italic">"Sitar Performance"</span>, or <span className="text-amber-400 italic">"Abida Parveen"</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice feedback confirmation */}
      {spokenText && !isListening && (
        <div className="bg-stone-900/40 border border-stone-900 p-3 px-4 rounded-xl text-xs text-stone-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Understood voice search: <strong className="text-amber-200 font-mono">"{spokenText}"</strong></span>
        </div>
      )}

      {/* Voice errors */}
      {recognitionError && (
        <div className="bg-rose-950/20 border border-rose-900/30 p-3 px-4 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <MicOff className="w-4 h-4 flex-shrink-0" />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Theatre playback frame + Playlist Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Theatre Screen (Active Video) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="bg-stone-900/20 border border-stone-900/60 p-4 rounded-3xl relative flex flex-col gap-4 shadow-2xl">
            {activeVideo ? (
              <>
                {/* 16:9 responsive embed container */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-stone-950 shadow-inner group">
                  {localVideoUrl ? (
                    <video
                      key={localVideoUrl}
                      src={localVideoUrl}
                      controls
                      autoPlay
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <iframe
                      src={getYouTubeEmbedUrl(activeVideo.url)}
                      title={activeVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                      id="theatre-iframe"
                    />
                  )}
                  {/* Backdrop golden ambient glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 to-transparent opacity-20 pointer-events-none" />
                </div>

                {/* Video Info Detail */}
                <div className="px-1 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-bold">
                      {activeVideo.category}
                    </span>
                    <span className="text-[9px] text-stone-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Curated Performance</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-stone-100 leading-snug">
                    {activeVideo.title}
                  </h3>

                  <div className="flex items-center gap-2 text-stone-400 text-xs mt-1">
                    <User className="w-3.5 h-3.5 text-amber-500/60" />
                    <span>Artist: <strong className="text-stone-300 font-sans">{activeVideo.artist}</strong></span>
                  </div>

                  {activeVideo.description && (
                    <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-900/60 mt-3 text-xs text-stone-400 leading-relaxed flex gap-2">
                      <Info className="w-4 h-4 text-amber-500/50 mt-0.5 flex-shrink-0" />
                      <p>{activeVideo.description}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-video w-full rounded-2xl bg-stone-950/60 flex flex-col items-center justify-center text-center p-8">
                <Tv className="w-12 h-12 text-stone-700 mb-3" />
                <p className="text-xs text-stone-500 font-serif">No videos found. Curate some in the Admin Panel.</p>
              </div>
            )}
          </div>
        </div>

        {/* Category filtering & Curated Playlist Grid */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Genre Category Filters */}
          <div className="bg-stone-900/20 p-4 rounded-2xl border border-stone-900/60">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-amber-500/80 mb-3 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Gharanas & Styles</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    selectedCategory === cat
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow"
                      : "bg-stone-900/40 border border-transparent text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scollable Playlist queue */}
          <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block px-1">
              Anthology Queue ({filteredVideos.length} items)
            </span>

            {filteredVideos.length === 0 ? (
              <p className="text-xs text-stone-600 text-center py-12 bg-stone-900/10 rounded-2xl border border-dashed border-stone-900">
                No videos match your filters.
              </p>
            ) : (
              filteredVideos.map((video) => {
                const isCurrent = activeVideo?.id === video.id;
                return (
                  <button
                    key={video.id}
                    onClick={() => setActiveVideo(video)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-300 border flex items-start gap-3 group cursor-pointer ${
                      isCurrent
                        ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                        : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                    }`}
                  >
                    {/* Tiny thumbnail frame / icon */}
                    <div className={`w-12 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isCurrent ? "bg-amber-500/20 text-amber-300" : "bg-stone-950 text-stone-600 group-hover:bg-stone-950/80 group-hover:text-amber-400/80"
                    }`}>
                      {isCurrent ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/70">
                        {video.category}
                      </span>
                      <span className="text-xs font-serif block font-medium group-hover:text-amber-200 transition-colors truncate">
                        {video.title}
                      </span>
                      <span className="text-[9px] font-sans text-stone-500 truncate">
                        {video.artist}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
