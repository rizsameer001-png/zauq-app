import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, 
  User, 
  BookOpen, 
  Play, 
  Pause, 
  Volume2, 
  Tv, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Sparkles, 
  Music, 
  ExternalLink, 
  ChevronRight,
  Video,
  X,
  VolumeX,
  BookMarked,
  Bookmark,
  Library,
  Globe,
  Award,
  FileText,
  Share2,
  Check,
  Download,
  Filter,
  SlidersHorizontal,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Author, Book, BookProgress, BookReview } from "../types";
import { BookReviews } from "./BookReviews";
import PoetTimeline from "./PoetTimeline";
import BookReader from "./BookReader";
import { getMediaFile, getAllCachedKeys } from "../mediaDb";
import { db, handleFirestoreError, OperationType, resolveBookUrl, logUserActivity } from "../firebase";
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

// Memory-safe dynamic image loader for local or remote files
const LocalMediaImage = ({ 
  url, 
  isLocal, 
  className, 
  alt, 
  isAuthor = false 
}: { 
  url?: string; 
  isLocal?: boolean; 
  className?: string; 
  alt?: string; 
  isAuthor?: boolean;
}) => {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const load = async () => {
      if (!url) {
        setLoading(false);
        return;
      }
      try {
        if (isLocal) {
          const id = url.replace("local://", "");
          const blob = await getMediaFile(id);
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          }
        } else {
          // Resolve remote urls relative to the domain
          const resolvedUrl = resolveBookUrl(url);
          if (active) setSrc(resolvedUrl);
        }
      } catch (err) {
        console.error("Failed to load local/remote media:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, isLocal]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-stone-950 border border-stone-900 animate-pulse ${className}`}>
        <div className="w-6 h-6 border border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-900/60 border border-stone-800 text-stone-600 ${className}`}>
        {isAuthor ? <User className="w-10 h-10 text-stone-700" /> : <BookMarked className="w-10 h-10 text-stone-700" />}
      </div>
    );
  }

  return <img src={src} className={className} alt={alt} referrerPolicy="no-referrer" />;
};

// Premium Custom Audio Player Component
const CustomAudioPlayer = ({ 
  audioUrl, 
  isLocal, 
  title,
  initialProgress,
  onAudioProgressUpdate
}: { 
  audioUrl: string; 
  isLocal?: boolean; 
  title: string;
  initialProgress?: number;
  onAudioProgressUpdate?: (percent: number) => void;
}) => {
  const [src, setSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPctRef = useRef(0);
  const initialTimeSetRef = useRef(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadAudio = async () => {
      setLoading(true);
      try {
        if (isLocal) {
          const id = audioUrl.replace("local://", "");
          const blob = await getMediaFile(id);
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          }
        } else {
          if (active) setSrc(audioUrl);
        }
      } catch (err) {
        console.error("Failed to load local audio:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAudio();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioUrl, isLocal]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback failed:", err));
    }
  };

  useEffect(() => {
    initialTimeSetRef.current = false;
    lastPctRef.current = initialProgress || 0;
  }, [audioUrl, initialProgress]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const currTime = audioRef.current.currentTime;
    setCurrentTime(currTime);

    if (duration > 0 && onAudioProgressUpdate) {
      const pct = Math.floor((currTime / duration) * 100);
      if (pct !== lastPctRef.current) {
        lastPctRef.current = pct;
        onAudioProgressUpdate(pct);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    setDuration(dur);

    if (initialProgress && initialProgress > 0 && !initialTimeSetRef.current && dur > 0) {
      initialTimeSetRef.current = true;
      const startAt = (initialProgress / 100) * dur;
      const clampedStartAt = Math.min(dur - 1, Math.max(0, startAt));
      audioRef.current.currentTime = clampedStartAt;
      setCurrentTime(clampedStartAt);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const muteState = !isMuted;
    setIsMuted(muteState);
    audioRef.current.muted = muteState;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="bg-stone-900/40 border border-stone-900 rounded-xl p-4 flex items-center justify-center">
        <div className="w-5 h-5 border border-amber-500/30 border-t-amber-500 rounded-full animate-spin mr-2" />
        <span className="text-[10px] font-mono text-stone-500">Resolving Classical Audio...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-stone-850 rounded-2xl p-4 shadow-lg">
      <audio 
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex flex-col gap-3">
        {/* Track info & Audio waves */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-serif font-medium text-stone-300">{title} Recitation</span>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-0.5 h-3">
              <span className="w-0.5 bg-amber-500 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
              <span className="w-0.5 bg-amber-500 rounded-full animate-[bounce_1s_infinite_300ms] h-2/3" />
              <span className="w-0.5 bg-amber-500 rounded-full animate-[bounce_1s_infinite_500ms] h-full" />
              <span className="w-0.5 bg-amber-500 rounded-full animate-[bounce_1s_infinite_200ms] h-1/2" />
            </div>
          )}
        </div>

        {/* Play control, timeline, time indicators */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <div className="flex-1 w-full flex items-center gap-2">
            <span className="text-[10px] font-mono text-stone-500 min-w-[32px]">{formatTime(currentTime)}</span>
            <input 
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-amber-500 bg-stone-950 rounded-lg h-1.5 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-stone-500 min-w-[32px]">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleMute} className="text-stone-400 hover:text-stone-200 cursor-pointer">
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-500/80" />}
            </button>
            <input 
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-amber-500 bg-stone-950 rounded-lg h-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium Book Video Player inside a Modal
const VideoModal = ({ 
  videoUrl, 
  videoType, 
  title, 
  onClose 
}: { 
  videoUrl: string; 
  videoType?: "youtube" | "direct" | "upload"; 
  title: string; 
  onClose: () => void;
}) => {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadVideo = async () => {
      setLoading(true);
      try {
        if (videoType === "upload") {
          if (videoUrl.startsWith("http")) {
            if (active) setSrc(videoUrl);
          } else {
            const id = videoUrl.replace("local://", "");
            const blob = await getMediaFile(id);
            if (blob && active) {
              objectUrl = URL.createObjectURL(blob);
              setSrc(objectUrl);
            }
          }
        } else if (videoType === "youtube") {
          // Parse YouTube embed URL
          let embedId = videoUrl;
          if (videoUrl.includes("watch?v=")) {
            embedId = videoUrl.split("watch?v=")[1]?.split("&")[0] || "";
          } else if (videoUrl.includes("youtu.be/")) {
            embedId = videoUrl.split("youtu.be/")[1]?.split("?")[0] || "";
          }
          if (active) setSrc(`https://www.youtube.com/embed/${embedId}`);
        } else {
          if (active) setSrc(videoUrl);
        }
      } catch (err) {
        console.error("Failed to load local video:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVideo();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [videoUrl, videoType]);

  return (
    <div className="fixed inset-0 bg-stone-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-stone-900 border border-stone-850 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl relative"
      >
        <div className="flex items-center justify-between border-b border-stone-850 p-4 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="text-xs font-serif font-semibold text-amber-200 tracking-wide uppercase">{title} Cinematic</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-850 flex items-center justify-center text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-stone-950">
          {loading ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center border border-stone-900 rounded-2xl bg-stone-950 gap-2">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-stone-600 uppercase">Resolving Cinematic Broadcast...</span>
            </div>
          ) : videoType === "youtube" ? (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-900">
              <iframe
                src={`${src}?autoplay=1`}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-900 bg-black">
              <video 
                src={src} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Extended interactive book detail modal
const BookDetailModal = ({ 
  book, 
  author, 
  onClose, 
  onPlayVideo,
  triggerToast,
  user,
  bookProgress,
  onUpdateProgress,
  autoResumeReader,
  onReaderClose
}: { 
  book: Book; 
  author: Author; 
  onClose: () => void; 
  onPlayVideo: (url: string, type: "youtube" | "direct" | "upload", title: string) => void;
  triggerToast: (msg: string) => void;
  user: FirebaseUser | null;
  bookProgress?: BookProgress;
  onUpdateProgress: (readPercent: number, listenPercent: number, currentPage?: number, totalPages?: number) => void;
  autoResumeReader?: boolean;
  onReaderClose?: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [localReadProgress, setLocalReadProgress] = useState(bookProgress?.readProgress || 0);
  const [localListenProgress, setLocalListenProgress] = useState(bookProgress?.listenProgress || 0);
  const [activeReaderFile, setActiveReaderFile] = useState<any | null>(null);

  useEffect(() => {
    if (bookProgress) {
      setLocalReadProgress(bookProgress.readProgress || 0);
      setLocalListenProgress(bookProgress.listenProgress || 0);
    }
  }, [bookProgress]);

  useEffect(() => {
    if (autoResumeReader && book.files && book.files.length > 0) {
      const readableFile = book.files.find(f => f.type === "pdf" || f.type === "epub") || book.files[0];
      if (readableFile) {
        setActiveReaderFile(readableFile);
      }
    }
  }, [autoResumeReader, book.files]);

  // Helper to extract rich metadata for display
  const getBookMetadata = (b: Book) => {
    const id = b.id.toLowerCase();
    if (id.includes("ghalib")) {
      return {
        era: "Mughal Court (19th Century)",
        language: "Urdu & Persian (Farsi)",
        theme: "Philosophical, Sufi Metaphysics, Mysticism",
        versesCount: "~1,500 Couplets",
        binding: "Premium Gold-Embossed Hardcover",
        pages: "312 Pages",
        difficulty: "Advanced (High-Classical)",
        publisher: "Nami Press, Cawnpore"
      };
    } else if (id.includes("iqbal") || id.includes("jibril")) {
      return {
        era: "Early 20th Century",
        language: "Urdu & Persian",
        theme: "Selfhood (Khudi), Spiritual Renaissance, Activism",
        versesCount: "~2,200 Couplets",
        binding: "Classic Leather-Bound Collector's Edition",
        pages: "420 Pages",
        difficulty: "Intermediate to Advanced",
        publisher: "Karimi Press, Lahore"
      };
    } else if (id.includes("faiz") || id.includes("nuskha")) {
      return {
        era: "Modern Progressive Era (Mid-20th Century)",
        language: "Urdu",
        theme: "Revolutionary Struggle, Romantic Socialist Realism",
        versesCount: "~1,800 Couplets",
        binding: "Earthy Linen Softcover",
        pages: "280 Pages",
        difficulty: "Intermediate (Accessible Modern)",
        publisher: "Maktaba-e-Karwan, Lahore"
      };
    } else {
      return {
        era: "Classical Revival Collection",
        language: "Urdu",
        theme: "Ghazal, Nazm & Classical Verse",
        versesCount: "~1,200 Couplets",
        binding: "Laminated Hardback",
        pages: "250 Pages",
        difficulty: "Intermediate",
        publisher: "Zauq Adab Publications"
      };
    }
  };

  const metadata = getBookMetadata(book);

  const handleCopyCitation = () => {
    const citation = `"${book.title}" by ${author.name} (Adab Library Collection)`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    triggerToast("Book citation copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFile = async (file: any) => {
    if (!file || !file.url) {
      triggerToast("Invalid book file URL or resource path. ❌");
      return;
    }

    const resolvedUrl = resolveBookUrl(file.url);
    const isLocal = file.isLocal || file.url.startsWith("local://");

    if (isLocal) {
      const id = file.url.replace("local://", "");
      try {
        const cachedBlob = await getMediaFile(id);
        if (!cachedBlob) {
          triggerToast("Offline file not found. Please upload it again. ❌");
          return;
        }
      } catch (err) {
        console.error("IndexedDB error checking file:", err);
        triggerToast("Failed to retrieve offline document. ⚠️");
        return;
      }
    } else {
      triggerToast("Connecting to document server... ⏳");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(resolvedUrl, { 
          method: "HEAD", 
          signal: controller.signal 
        }).catch(async () => {
          // Fallback to GET with same AbortController
          return await fetch(resolvedUrl, { method: "GET", signal: controller.signal });
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          triggerToast("Document not found on the server (404). ❌");
          return;
        } else if (response.status >= 500) {
          triggerToast("The document server reported an error (500). ❌");
          return;
        }
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          triggerToast("Document loading timed out, but trying to open anyway... ⚠️");
        } else {
          console.warn("Network or CORS issue checking URL reachability:", fetchErr);
          // Many CDNs or storage buckets block cross-origin HEAD/GET requests, 
          // so if there's a CORS issue we still allow attempting to open the book.
        }
      }
    }

    // Pass the resolved URL to the book reader
    setActiveReaderFile({
      ...file,
      url: resolvedUrl
    });
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-stone-950 border border-stone-850 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl relative flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left Sidebar - Cover and citation */}
        <div className="w-full md:w-1/3 bg-stone-900/20 p-6 border-b md:border-b-0 md:border-r border-stone-900 flex flex-col items-center justify-between gap-5 flex-shrink-0 overflow-y-auto">
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Book Cover */}
            <div className="w-40 h-56 rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-xl relative group">
              <LocalMediaImage 
                url={book.coverImageUrl} 
                isLocal={book.isLocalCover} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                alt={book.title}
                isAuthor={false}
              />
            </div>
            <span className="text-[8.5px] font-mono text-stone-500 bg-stone-900/40 px-2 py-1 rounded border border-stone-900/80 truncate w-full text-center block select-all" title={resolveBookUrl(book.coverImageUrl)}>
              Cover Path: {resolveBookUrl(book.coverImageUrl) || "None"}
            </span>

            {/* Author Profile Quick-Link */}
            <div className="bg-stone-950/50 border border-stone-900 rounded-2xl p-3 w-full flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-stone-800 bg-stone-950 flex-shrink-0">
                <LocalMediaImage 
                  url={author.imageUrl} 
                  isLocal={author.isLocalImage} 
                  className="w-full h-full object-cover" 
                  alt={author.name}
                  isAuthor
                />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block">Author</span>
                <span className="text-xs font-serif font-bold text-amber-500 truncate block">{author.name}</span>
              </div>
            </div>
          </div>

          {/* Copy Citation Action */}
          <button
            onClick={handleCopyCitation}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/20 text-stone-300 hover:text-amber-400 rounded-xl py-2.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Citation Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-stone-400" />
                <span>Copy Citation</span>
              </>
            )}
          </button>
        </div>

        {/* Right Main Body - Metadata & Media */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 relative">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-stone-900/60 hover:bg-stone-850 border border-stone-850 flex items-center justify-center text-stone-400 hover:text-stone-100 transition-all cursor-pointer z-20"
          >
            <X className="w-4.5 h-4.5" />
          </button>

          {/* Title & Author Headings */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1 pr-8">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider uppercase font-semibold">Classical Edition</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800 tracking-wider uppercase">{metadata.difficulty}</span>
              {book.averageRating !== undefined && book.averageRating > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-400 text-[9px] font-mono font-bold">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{book.averageRating} / 5.0 ({book.reviewsCount || 0} {book.reviewsCount === 1 ? "review" : "reviews"})</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-100 leading-tight">
              {book.title}
            </h2>
            <p className="text-xs text-stone-400 font-serif mt-1">
              Anthology of verses by the legendary <span className="text-amber-500/90">{author.name}</span>.
            </p>
          </div>

          {/* Full Description */}
          <div>
            <h4 className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-2.5">Historical Summary & Overview</h4>
            <div className="p-4 rounded-2xl bg-stone-900/10 border border-stone-900/60 font-serif text-stone-300 text-xs md:text-sm leading-relaxed whitespace-pre-line">
              {book.description || "A foundational masterpiece compiling the elegant compositions of this literary titan. This edition preserves the delicate rhyming structures and profound wordplay of the original classical texts."}
            </div>
          </div>

          {/* Extended Metadata Grid */}
          <div>
            <h4 className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3">Edition Metadata & Philology</h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Language */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Language</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium">{metadata.language}</span>
              </div>

              {/* Era */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Era / Period</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium">{metadata.era}</span>
              </div>

              {/* Theme */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1 col-span-2">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Philosophical Theme</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium leading-tight">{metadata.theme}</span>
              </div>

              {/* Verses count */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Verses Count</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium">{metadata.versesCount}</span>
              </div>

              {/* Pages & Binding */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Format & Binding</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium truncate" title={`${metadata.pages}, ${metadata.binding}`}>{metadata.pages} • {metadata.binding}</span>
              </div>

              {/* Publisher */}
              <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1 col-span-2">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500/60" />
                  <span>Historical Publisher</span>
                </span>
                <span className="text-xs text-stone-200 font-serif font-medium">{metadata.publisher}</span>
              </div>

              {/* Genre and Literary Period (Admin Defined) */}
              {(book.genre || book.literaryPeriod) && (
                <div className="col-span-2 grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-stone-900/40">
                  {book.genre && (
                    <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                        Literary Genre
                      </span>
                      <span className="text-xs text-amber-500/90 font-serif font-medium">{book.genre}</span>
                    </div>
                  )}
                  {book.literaryPeriod && (
                    <div className="bg-stone-900/20 border border-stone-900/40 rounded-2xl p-3 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                        Literary Period
                      </span>
                      <span className="text-xs text-amber-500/90 font-serif font-medium">{book.literaryPeriod}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Adab Progress Tracker Card */}
          <div className="bg-gradient-to-br from-stone-900/40 via-stone-950/60 to-stone-900/30 border border-stone-900/80 rounded-2xl p-5 flex flex-col gap-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <h4 className="text-[10px] font-mono text-stone-300 uppercase tracking-widest font-semibold">My Study & Devotion Progress</h4>
              </div>
              {!user && (
                <span className="text-[9px] font-mono text-stone-500 uppercase bg-stone-900/50 px-2 py-0.5 rounded-md border border-stone-850">
                  Guest Mode (Local Cache)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reading Progress Selector */}
              <div className="bg-stone-950/60 border border-stone-900 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-medium text-stone-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>Reading Progress</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                    {localReadProgress}%
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={localReadProgress}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setLocalReadProgress(val);
                    onUpdateProgress(val, localListenProgress);
                  }}
                  className="w-full accent-amber-500 bg-stone-900 h-1.5 rounded-lg cursor-pointer"
                />
                
                <div className="flex justify-between text-[8px] font-mono text-stone-600 mt-1">
                  <span>UNREAD</span>
                  <span>50%</span>
                  <span>COMPLETED</span>
                </div>
              </div>

              {/* Listening Progress Selector */}
              <div className="bg-stone-950/60 border border-stone-900 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-medium text-stone-300 flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-500" />
                    <span>Listening Progress</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                    {localListenProgress}%
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={localListenProgress}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setLocalListenProgress(val);
                    onUpdateProgress(localReadProgress, val);
                  }}
                  className="w-full accent-emerald-500 bg-stone-900 h-1.5 rounded-lg cursor-pointer"
                />
                
                <div className="flex justify-between text-[8px] font-mono text-stone-600 mt-1">
                  <span>UNHEARD</span>
                  <span>50%</span>
                  <span>COMPLETED</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons & last updated timestamp */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-900/50">
              {bookProgress?.lastUpdated ? (
                <span className="text-[9px] font-mono text-stone-600">
                  Last revised: {new Date(bookProgress.lastUpdated.seconds ? bookProgress.lastUpdated.seconds * 1000 : bookProgress.lastUpdated).toLocaleString()}
                </span>
              ) : (
                <span className="text-[9px] font-mono text-stone-600">No progress logged yet.</span>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setLocalReadProgress(0);
                    setLocalListenProgress(0);
                    onUpdateProgress(0, 0);
                    triggerToast("Progress reset successfully.");
                  }}
                  disabled={localReadProgress === 0 && localListenProgress === 0}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg border border-stone-900 bg-stone-950 hover:bg-stone-900 text-stone-500 hover:text-stone-300 text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setLocalReadProgress(100);
                    setLocalListenProgress(100);
                    onUpdateProgress(100, 100);
                    triggerToast("Noble studies complete! Marked as completed. 🎉");
                  }}
                  disabled={localReadProgress === 100 && localListenProgress === 100}
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Completed</span>
                </button>
              </div>
            </div>
          </div>

          {/* Media Player Controls */}
          {(book.audioUrl || book.videoUrl) && (
            <div className="flex flex-col gap-4 border-t border-stone-900 pt-5 mt-2">
              <h4 className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Multimedia Broadcasts</h4>
              
              {book.audioUrl && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1 px-1">
                    <Music className="w-3.5 h-3.5 text-amber-500" />
                    <span>Listen Classical Audio Recitation</span>
                  </span>
                  <CustomAudioPlayer 
                    audioUrl={book.audioUrl} 
                    isLocal={book.isLocalAudio} 
                    title={book.title} 
                    initialProgress={bookProgress?.listenProgress || 0}
                    onAudioProgressUpdate={(pct) => {
                      setLocalListenProgress(pct);
                      onUpdateProgress(localReadProgress, pct);
                    }}
                  />
                  <span className="text-[8.5px] font-mono text-stone-500 bg-stone-900/30 px-2 py-1 rounded border border-stone-900/60 truncate block select-all mt-1" title={resolveBookUrl(book.audioUrl)}>
                    Audio Path: {resolveBookUrl(book.audioUrl) || "None"}
                  </span>
                </div>
              )}

              {book.videoUrl && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1 px-1">
                    <Video className="w-3.5 h-3.5 text-amber-500" />
                    <span>Watch Cinematic Video Performance</span>
                  </span>
                  <button
                    onClick={() => onPlayVideo(book.videoUrl!, book.videoType || "youtube", book.title)}
                    className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 rounded-2xl px-4 py-3.5 text-xs font-semibold tracking-wide cursor-pointer transition-all active:scale-[0.98] w-full"
                  >
                    <Tv className="w-4 h-4 text-amber-500" />
                    <span>Launch Cinematic Video Player</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PDF/EPUB Publications Download section */}
          {book.files && book.files.length > 0 && (
            <div className="flex flex-col gap-3.5 border-t border-stone-900 pt-5 mt-2">
              <h4 className="text-[10px] font-mono text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Literary Documents & eBook Publications</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {book.files.map((file) => {
                  const isPdf = file.type === "pdf";
                  return (
                    <button
                      key={file.id}
                      onClick={() => handleOpenFile(file)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/20 border border-stone-900/60 hover:bg-amber-500/5 hover:border-amber-500/30 text-stone-300 hover:text-amber-400 text-left transition-all group cursor-pointer"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${isPdf ? "bg-rose-500/10 text-rose-400 border border-rose-500/10" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"}`}>
                        {file.type.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-serif font-bold text-xs leading-tight block truncate group-hover:text-amber-200">{file.name}</span>
                        <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wide block mt-0.5">
                          {isPdf ? "PDF Document" : "EPUB eBook Edition"}
                        </span>
                        <span className="text-[8px] font-mono text-amber-500/70 block truncate mt-0.5 select-all" title={resolveBookUrl(file.url)}>
                          Path: {resolveBookUrl(file.url) || "None"}
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-stone-500 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Book Reviews & Commentary Section */}
          <BookReviews 
            bookId={book.id} 
            user={user} 
            triggerToast={triggerToast} 
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {activeReaderFile && (
          <BookReader
            book={book}
            file={activeReaderFile}
            progress={bookProgress}
            user={user}
            onUpdateProgress={onUpdateProgress}
            onClose={() => {
              setActiveReaderFile(null);
              onReaderClose?.();
            }}
            triggerToast={triggerToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface LibraryProps {
  authors: Author[];
  books: Book[];
  triggerToast: (msg: string) => void;
  user?: FirebaseUser | null;
  autoOpenBook?: Book | null;
  onClearAutoOpenBook?: () => void;
}

export default function LibraryView({ 
  authors, 
  books, 
  triggerToast, 
  user,
  autoOpenBook,
  onClearAutoOpenBook
}: LibraryProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<{ url: string; type: "youtube" | "direct" | "upload"; title: string } | null>(null);
  const [selectedBookForModal, setSelectedBookForModal] = useState<Book | null>(null);
  const [autoResumeForModal, setAutoResumeForModal] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [cachedKeys, setCachedKeys] = useState<string[]>([]);

  const refreshCacheKeys = async () => {
    try {
      const keys = await getAllCachedKeys();
      setCachedKeys(keys);
    } catch (e) {
      console.error("Failed to query cache keys:", e);
    }
  };

  useEffect(() => {
    refreshCacheKeys();
  }, [books]);

  const isBookCached = (b: Book) => {
    if (!b.files || b.files.length === 0) return false;
    return b.files.some(file => {
      const fileId = file.url?.replace("local://", "") || "";
      const possibleKeys = [
        fileId,
        file.id,
        `file_${b.id}_${file.id}`,
        `file_book_${b.id}_${file.id}`,
        `file_book_${b.id}_file_${file.id}`,
        `file_${b.id}_file_${file.id}`,
        `file_${file.id}`
      ];
      return possibleKeys.some(k => k && cachedKeys.includes(k));
    });
  };
  
  const [viewMode, setViewMode] = useState<"authors" | "books" | "timeline">("authors");
  const [selectedFilterAuthorId, setSelectedFilterAuthorId] = useState<string>("all");
  const [selectedFilterFormat, setSelectedFilterFormat] = useState<string>("all");
  const [selectedFilterTheme, setSelectedFilterTheme] = useState<string>("all");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>("all");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");

  // Dynamically extract unique genres and literary periods defined by the admin
  const dynamicGenres = useMemo(() => {
    const genresSet = new Set<string>();
    books.forEach(b => {
      if (b.genre && b.genre.trim()) {
        genresSet.add(b.genre.trim());
      }
    });
    return Array.from(genresSet).sort();
  }, [books]);

  const dynamicPeriods = useMemo(() => {
    const periodsSet = new Set<string>();
    books.forEach(b => {
      if (b.literaryPeriod && b.literaryPeriod.trim()) {
        periodsSet.add(b.literaryPeriod.trim());
      }
    });
    return Array.from(periodsSet).sort();
  }, [books]);

  // Compute recently read books with active reading progress
  const recentlyReadBooks = useMemo(() => {
    return books
      .filter(book => {
        const prog = progressMap[book.id];
        return prog && prog.readProgress > 0 && book.files && book.files.length > 0;
      })
      .sort((a, b) => {
        const dateA = new Date(progressMap[a.id]?.lastUpdated || 0).getTime();
        const dateB = new Date(progressMap[b.id]?.lastUpdated || 0).getTime();
        return dateB - dateA;
      });
  }, [books, progressMap]);

  // Handle auto-opening books passed from parent (e.g. homepage clicks)
  useEffect(() => {
    if (autoOpenBook) {
      setSelectedBookForModal(autoOpenBook);
      if (onClearAutoOpenBook) {
        onClearAutoOpenBook();
      }
    }
  }, [autoOpenBook, onClearAutoOpenBook]);

  const saveDebounceRef = useRef<Record<string, any>>({});

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveDebounceRef.current).forEach(clearTimeout);
    };
  }, []);

  // Listen and sync book study progress
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem("zauq_book_progress");
      if (stored) {
        try {
          setProgressMap(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse local book progress:", e);
        }
      } else {
        setProgressMap({});
      }
      return;
    }

    const collectionPath = `users/${user.uid}/book_progress`;
    const q = collection(db, collectionPath);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, BookProgress> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        map[docSnap.id] = {
          bookId: data.bookId,
          userId: data.userId,
          readProgress: data.readProgress || 0,
          listenProgress: data.listenProgress || 0,
          currentPage: data.currentPage || 1,
          totalPages: data.totalPages || 100,
          lastUpdated: data.lastUpdated ? (data.lastUpdated.toDate ? data.lastUpdated.toDate() : data.lastUpdated) : new Date()
        };
      });
      setProgressMap(map);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionPath);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProgress = (
    bookId: string, 
    readPercent: number, 
    listenPercent: number,
    currentPage?: number,
    totalPages?: number
  ) => {
    const readVal = Math.min(100, Math.max(0, readPercent));
    const listenVal = Math.min(100, Math.max(0, listenPercent));

    // Update local state immediately for a fluid, lag-free UX response
    setProgressMap(prev => {
      const current = prev[bookId];
      return {
        ...prev,
        [bookId]: {
          bookId,
          userId: user ? user.uid : "offline",
          readProgress: readVal,
          listenProgress: listenVal,
          currentPage: currentPage !== undefined ? currentPage : (current?.currentPage || 1),
          totalPages: totalPages !== undefined ? totalPages : (current?.totalPages || 100),
          lastUpdated: new Date()
        }
      };
    });

    // Throttled debounce write to avoid rate limits and Firestore quota depletion
    if (saveDebounceRef.current[bookId]) {
      clearTimeout(saveDebounceRef.current[bookId]);
    }

    saveDebounceRef.current[bookId] = setTimeout(async () => {
      // Re-read from state to ensure we have correct values or use explicit args
      const latestProg = progressMap[bookId];
      const finalPage = currentPage !== undefined ? currentPage : (latestProg?.currentPage || 1);
      const finalTotal = totalPages !== undefined ? totalPages : (latestProg?.totalPages || 100);

      if (user) {
        const collectionPath = `users/${user.uid}/book_progress`;
        try {
          await setDoc(doc(db, collectionPath, bookId), {
            bookId,
            userId: user.uid,
            readProgress: readVal,
            listenProgress: listenVal,
            currentPage: finalPage,
            totalPages: finalTotal,
            lastUpdated: serverTimestamp()
          });
          logUserActivity("update_progress", `Updated progress for book ID ${bookId}: Read ${readVal}%, Listen ${listenVal}%`);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, collectionPath);
        }
      } else {
        const stored = localStorage.getItem("zauq_book_progress");
        let localMap: Record<string, any> = {};
        if (stored) {
          try { localMap = JSON.parse(stored); } catch(e){}
        }
        const updatedMap = {
          ...localMap,
          [bookId]: {
            bookId,
            userId: "offline",
            readProgress: readVal,
            listenProgress: listenVal,
            currentPage: finalPage,
            totalPages: finalTotal,
            lastUpdated: new Date().toISOString()
          }
        };
        localStorage.setItem("zauq_book_progress", JSON.stringify(updatedMap));
      }
    }, 1200);
  };

  // Clear query when switching selection
  const handleAuthorClick = (author: Author) => {
    setSelectedAuthor(author);
    setSearchQuery("");
  };

  // Back button handler
  const handleBack = () => {
    setSelectedAuthor(null);
    setSearchQuery("");
  };

  // Filter logic
  const filteredAuthors = authors.filter(author => 
    author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (author.bio && author.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (author.birthPlace && author.birthPlace.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredBooks = books.filter(book => {
    // 1. Author Filter
    if (selectedAuthor) {
      if (book.authorId !== selectedAuthor.id) return false;
    } else if (selectedFilterAuthorId !== "all") {
      if (book.authorId !== selectedFilterAuthorId) return false;
    }

    // 2. Format Filter
    if (selectedFilterFormat !== "all") {
      if (selectedFilterFormat === "pdf") {
        const hasPdf = book.files?.some(f => f.type === "pdf");
        if (!hasPdf) return false;
      } else if (selectedFilterFormat === "epub") {
        const hasEpub = book.files?.some(f => f.type === "epub");
        if (!hasEpub) return false;
      } else if (selectedFilterFormat === "audio") {
        if (!book.audioUrl) return false;
      } else if (selectedFilterFormat === "video") {
        if (!book.videoUrl) return false;
      }
    }

    // 3. Theme/Genre Filter
    if (selectedFilterTheme !== "all") {
      const bookId = book.id.toLowerCase();
      const title = book.title.toLowerCase();
      const desc = (book.description || "").toLowerCase();
      
      if (selectedFilterTheme === "philosophical") {
        const isPhilosophical = bookId.includes("ghalib") || title.includes("diwan") || desc.includes("philosophical") || desc.includes("mystic") || desc.includes("philosophy");
        if (!isPhilosophical) return false;
      } else if (selectedFilterTheme === "spiritual") {
        const isSpiritual = bookId.includes("iqbal") || bookId.includes("jibril") || title.includes("bal") || desc.includes("spiritual") || desc.includes("khudi") || desc.includes("selfhood");
        if (!isSpiritual) return false;
      } else if (selectedFilterTheme === "revolutionary") {
        const isRevolutionary = bookId.includes("faiz") || bookId.includes("nuskha") || desc.includes("revolutionary") || desc.includes("struggle") || desc.includes("socialist") || desc.includes("progressive");
        if (!isRevolutionary) return false;
      } else if (selectedFilterTheme === "classical") {
        const isClassicalGhazal = !bookId.includes("faiz") && !bookId.includes("nuskha") && !bookId.includes("iqbal") && !bookId.includes("jibril") && !bookId.includes("ghalib");
        if (!isClassicalGhazal) return false;
      }
    }

    // 3b. Admin-Defined Genre Filter
    if (selectedGenreFilter !== "all") {
      if (book.genre !== selectedGenreFilter) return false;
    }

    // 3c. Admin-Defined Literary Period/Era Filter
    if (selectedPeriodFilter !== "all") {
      if (book.literaryPeriod !== selectedPeriodFilter) return false;
    }

    // 4. Search Query (Matches title, description, or poet's name, or file names)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const authorObj = authors.find(a => a.id === book.authorId);
      const authorName = authorObj ? authorObj.name.toLowerCase() : "";
      const matchesTitle = book.title.toLowerCase().includes(query);
      const matchesDesc = book.description?.toLowerCase().includes(query) || false;
      const matchesAuthor = authorName.includes(query);
      const matchesFiles = book.files?.some(f => f.name.toLowerCase().includes(query)) || false;

      if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesFiles) return false;
    }

    return true;
  });

  const selectedAuthorBooks = filteredBooks;

  return (
    <section className="flex flex-col gap-6 max-w-5xl mx-auto w-full" id="zauq-library-panel">
      
      {/* Cinematic Header block */}
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-900/60 via-stone-950/80 to-stone-900/40 border border-stone-900 rounded-3xl p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.015] rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-amber-500">Adab Library</h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider uppercase font-semibold">Classic Catalogue</span>
              </div>
              <p className="text-xs text-stone-400 font-serif mt-0.5">Explore classic biographies, published editions, narrated audio, and video anthologies.</p>
            </div>
          </div>

          {/* Search bar */}
          {!selectedAuthor && viewMode === "timeline" ? (
            <div className="w-full md:w-72" />
          ) : (
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder={selectedAuthor ? `Search in ${selectedAuthor.name}'s books...` : (viewMode === "books" ? "Search publications by title, poet..." : "Search classical authors...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-900 focus:border-amber-500/35 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-stone-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
      </div>

      {/* Continue Reading / Bookmark Shelf */}
      {!selectedAuthor && recentlyReadBooks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-900/10 border border-stone-900/60 rounded-3xl p-5 flex flex-col gap-3 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">Continue Reading</h3>
            </div>
            <span className="text-[9px] font-mono text-stone-500">RESUME YOUR LAST BOOKMARK</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentlyReadBooks.slice(0, 3).map(book => {
              const bookAuthor = authors.find(a => a.id === book.authorId);
              const authorName = bookAuthor ? bookAuthor.name : "Classical Author";
              const prog = progressMap[book.id];
              return (
                <div 
                  key={`recent-${book.id}`}
                  onClick={() => {
                    setAutoResumeForModal(true);
                    setSelectedBookForModal(book);
                  }}
                  className="bg-stone-950/40 border border-stone-900/80 hover:border-amber-500/25 rounded-2xl p-4 flex gap-3 items-center group cursor-pointer transition-all hover:bg-stone-950/70"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden border border-stone-850 bg-stone-950 flex-shrink-0">
                    <LocalMediaImage 
                      url={book.coverImageUrl} 
                      isLocal={book.isLocalCover} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={book.title}
                      isAuthor={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors truncate">{book.title}</h4>
                    <p className="text-[10px] text-amber-500/80 font-mono font-medium truncate mb-2">by {authorName}</p>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[8px] font-mono text-stone-500">
                        <span>PAGE {prog.currentPage || 1} OF {prog.totalPages || 100}</span>
                        <span className="text-amber-400 font-bold">{prog.readProgress}%</span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${prog.readProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Premium View Tabs */}
      {!selectedAuthor && (
        <div className="flex items-center justify-between border-b border-stone-900/60 pb-1">
          <div className="flex gap-6">
            <button
              onClick={() => {
                setViewMode("authors");
                setSearchQuery("");
              }}
              className={`pb-2.5 text-xs font-mono uppercase tracking-widest transition-all relative flex items-center gap-2 cursor-pointer ${
                viewMode === "authors" 
                  ? "text-amber-500 font-bold" 
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Browse Authors</span>
              {viewMode === "authors" && (
                <motion.div 
                  layoutId="libraryTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" 
                />
              )}
            </button>
            <button
              onClick={() => {
                setViewMode("books");
                setSearchQuery("");
              }}
              className={`pb-2.5 text-xs font-mono uppercase tracking-widest transition-all relative flex items-center gap-2 cursor-pointer ${
                viewMode === "books" 
                  ? "text-amber-500 font-bold" 
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>All Publications</span>
              {viewMode === "books" && (
                <motion.div 
                  layoutId="libraryTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" 
                />
              )}
            </button>
            <button
              onClick={() => {
                setViewMode("timeline");
                setSearchQuery("");
              }}
              className={`pb-2.5 text-xs font-mono uppercase tracking-widest transition-all relative flex items-center gap-2 cursor-pointer ${
                viewMode === "timeline" 
                  ? "text-amber-500 font-bold" 
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Poet Timeline</span>
              {viewMode === "timeline" && (
                <motion.div 
                  layoutId="libraryTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" 
                />
              )}
            </button>
          </div>
          
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider hidden sm:block">
            {viewMode === "authors" 
              ? `${filteredAuthors.length} Poets Available` 
              : viewMode === "books" 
                ? `${filteredBooks.length} Editions Filtered` 
                : "Classical Eras Catalogued"}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!selectedAuthor ? (
          viewMode === "authors" ? (
            // AUTHOR GRID VIEW
            <motion.div
              key="authors-grid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredAuthors.length > 0 ? (
                filteredAuthors.map((author) => {
                  const authorBooksCount = books.filter(b => b.authorId === author.id).length;
                  return (
                    <motion.div
                      key={author.id}
                      onClick={() => handleAuthorClick(author)}
                      whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                      className="group bg-stone-900/40 hover:bg-stone-900/70 border border-stone-900/60 rounded-3xl p-5 cursor-pointer transition-all flex flex-col gap-4 relative overflow-hidden shadow-md"
                    >
                      {/* Background faint glow */}
                      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/[0.01] rounded-full blur-2xl group-hover:bg-amber-500/[0.02] transition-colors" />

                      <div className="flex items-start gap-4">
                        {/* Author Portrait */}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-800 bg-stone-950">
                          <LocalMediaImage 
                            url={author.imageUrl} 
                            isLocal={author.isLocalImage} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            alt={author.name}
                            isAuthor
                          />
                        </div>

                        {/* Author credentials */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors truncate">
                            {author.name}
                          </h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-500/60" />
                              <span>{author.activeYears || "Classic Era"}</span>
                            </span>
                            <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-500/60" />
                              <span className="truncate">{author.birthPlace || "South Asia"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Biography snippet */}
                      <p className="text-xs text-stone-400 font-serif leading-relaxed line-clamp-3">
                        {author.bio || "No biography details available for this master of literature."}
                      </p>

                      {/* Integrated Top-Level Library Progress Indicator */}
                      {(() => {
                        const authorBooks = books.filter(b => b.authorId === author.id);
                        let totalRead = 0;
                        let totalListen = 0;
                        let activeCount = 0;

                        authorBooks.forEach((b) => {
                          const prog = progressMap[b.id];
                          if (prog) {
                            totalRead += (prog.readProgress || 0);
                            totalListen += (prog.listenProgress || 0);
                            if ((prog.readProgress || 0) > 0 || (prog.listenProgress || 0) > 0) {
                              activeCount++;
                            }
                          }
                        });

                        const avgRead = authorBooks.length > 0 ? Math.round(totalRead / authorBooks.length) : 0;
                        const avgListen = authorBooks.length > 0 ? Math.round(totalListen / authorBooks.length) : 0;

                        if (activeCount === 0) return null;

                        return (
                          <div className="bg-stone-950/40 rounded-2xl p-3 border border-stone-900/60 flex flex-col gap-2 mt-1">
                            {avgRead > 0 && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[8px] font-mono text-stone-500">
                                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    <span>READING</span>
                                  </span>
                                  <span className="text-amber-400 font-bold">{avgRead}%</span>
                                </div>
                                <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${avgRead}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {avgListen > 0 && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[8px] font-mono text-stone-500">
                                  <span className="flex items-center gap-1 font-semibold text-emerald-500">
                                    <Music className="w-2.5 h-2.5" />
                                    <span>LISTENING</span>
                                  </span>
                                  <span className="text-emerald-400 font-bold">{avgListen}%</span>
                                </div>
                                <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${avgListen}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Action Footer */}
                      <div className="mt-auto pt-4 border-t border-stone-900/60 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80 bg-amber-500/[0.05] border border-amber-500/10 rounded-lg px-2 py-1">
                          {authorBooksCount} {authorBooksCount === 1 ? "Book" : "Books"}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-stone-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                          <span>Open Library</span>
                          <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center bg-stone-900/10 border border-dashed border-stone-900 rounded-3xl">
                  <User className="w-8 h-8 text-stone-700 mx-auto mb-2" />
                  <p className="text-xs font-mono text-stone-500 uppercase tracking-widest">No Authors Match Your Query</p>
                </div>
              )}
            </motion.div>
          ) : viewMode === "books" ? (
            // ALL PUBLICATIONS DIRECT CATALOG VIEW
            <motion.div
              key="all-publications-catalog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Filter controls row */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-900/40 border border-stone-900/60 rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between animate-fade-in"
              >
                <div className="flex items-center gap-2 text-stone-300 text-xs font-mono">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500/80" />
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Refine Publications</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                  {/* Filter Author Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Poet / Author</label>
                    <select
                      value={selectedFilterAuthorId}
                      onChange={(e) => setSelectedFilterAuthorId(e.target.value)}
                      className="bg-stone-950 border border-stone-900 rounded-2xl text-stone-300 text-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500/40 w-full"
                    >
                      <option value="all">All Classical Poets</option>
                      {authors.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Format Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Format / Media</label>
                    <select
                      value={selectedFilterFormat}
                      onChange={(e) => setSelectedFilterFormat(e.target.value)}
                      className="bg-stone-950 border border-stone-900 rounded-2xl text-stone-300 text-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500/40 w-full"
                    >
                      <option value="all">All Formats</option>
                      <option value="pdf">PDF E-Books</option>
                      <option value="epub">EPUB eBooks</option>
                      <option value="audio">Audio Recitations</option>
                      <option value="video">Cinematic Performance</option>
                    </select>
                  </div>

                  {/* Filter Theme Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Literary Theme</label>
                    <select
                      value={selectedFilterTheme}
                      onChange={(e) => setSelectedFilterTheme(e.target.value)}
                      className="bg-stone-950 border border-stone-900 rounded-2xl text-stone-300 text-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500/40 w-full"
                    >
                      <option value="all">All Themes</option>
                      <option value="philosophical">Philosophical / Sufi</option>
                      <option value="spiritual">Selfhood & Spiritual</option>
                      <option value="revolutionary">Revolutionary Struggle</option>
                      <option value="classical">Classical Ghazal / Love</option>
                    </select>
                  </div>

                  {/* Filter Genre Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Genre / Category</label>
                    <select
                      value={selectedGenreFilter}
                      onChange={(e) => setSelectedGenreFilter(e.target.value)}
                      className="bg-stone-950 border border-stone-900 rounded-2xl text-stone-300 text-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500/40 w-full"
                    >
                      <option value="all">All Genres</option>
                      {dynamicGenres.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Period Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Literary Period</label>
                    <select
                      value={selectedPeriodFilter}
                      onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                      className="bg-stone-950 border border-stone-900 rounded-2xl text-stone-300 text-xs px-3 py-2 cursor-pointer focus:outline-none focus:border-amber-500/40 w-full"
                    >
                      <option value="all">All Periods</option>
                      {dynamicPeriods.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters CTA */}
                {(selectedFilterAuthorId !== "all" || selectedFilterFormat !== "all" || selectedFilterTheme !== "all" || selectedGenreFilter !== "all" || selectedPeriodFilter !== "all" || searchQuery !== "") && (
                  <button
                    onClick={() => {
                      setSelectedFilterAuthorId("all");
                      setSelectedFilterFormat("all");
                      setSelectedFilterTheme("all");
                      setSelectedGenreFilter("all");
                      setSelectedPeriodFilter("all");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-mono text-amber-500 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 px-3 py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap self-stretch md:self-auto flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </motion.div>

              {/* Books catalog grid */}
              {filteredBooks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredBooks.map((book) => {
                    const bookAuthor = authors.find(a => a.id === book.authorId);
                    const authorName = bookAuthor ? bookAuthor.name : "Classical Author";
                    return (
                      <motion.div 
                        key={book.id}
                        onClick={() => setSelectedBookForModal(book)}
                        whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.3)" }}
                        className="bg-stone-900/30 border border-stone-900/80 hover:bg-stone-900/60 rounded-3xl p-5 flex flex-col gap-4 shadow-md relative overflow-hidden transition-all group cursor-pointer"
                      >
                        <div className="flex gap-4">
                          {/* Book Cover */}
                          <div className="w-20 h-28 md:w-24 md:h-32 rounded-2xl overflow-hidden border border-stone-850 bg-stone-950 flex-shrink-0 shadow-md">
                            <LocalMediaImage 
                              url={book.coverImageUrl} 
                              isLocal={book.isLocalCover} 
                              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                              alt={book.title}
                              isAuthor={false}
                            />
                          </div>

                          {/* Book metadata */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h3 className="text-sm font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors truncate">
                                {book.title}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-amber-500/80 font-semibold block mt-0.5">
                                  by {authorName}
                                </span>
                                {book.averageRating !== undefined && book.averageRating > 0 && (
                                  <div className="flex items-center gap-0.5 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/15 text-amber-400 text-[9px] font-mono mt-0.5 font-bold">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                    <span>{book.averageRating} ({book.reviewsCount || 0})</span>
                                  </div>
                                )}
                                {isBookCached(book) && (
                                  <div className="flex items-center gap-0.5 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/15 text-emerald-450 text-[9px] font-mono mt-0.5 font-bold">
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>Offline Ready</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-stone-400 font-serif mt-2 leading-relaxed line-clamp-3">
                                {book.description || "Classic anthology compiling the elegant verses of this author."}
                              </p>

                              {(book.genre || book.literaryPeriod) && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {book.genre && (
                                    <span className="text-[8px] font-mono uppercase tracking-widest bg-stone-900 text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                                      {book.genre}
                                    </span>
                                  )}
                                  {book.literaryPeriod && (
                                    <span className="text-[8px] font-mono uppercase tracking-widest bg-amber-500/5 text-amber-500/70 px-2 py-0.5 rounded border border-amber-500/10">
                                      {book.literaryPeriod}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Badges/Indicators of media */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap font-mono">
                              {book.audioUrl && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <Music className="w-2.5 h-2.5 text-amber-500/80" />
                                  <span>Audio Recitation</span>
                                </span>
                              )}
                              {book.videoUrl && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                  <Video className="w-2.5 h-2.5 text-amber-500/80" />
                                  <span>Performance Video</span>
                                </span>
                              )}
                              {book.files && book.files.length > 0 && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                  <FileText className="w-2.5 h-2.5 text-blue-400/80" />
                                  <span>{book.files.length} {book.files.length === 1 ? "File" : "Files"} ({book.files.map(f => f.type.toUpperCase()).join("/")})</span>
                                </span>
                              )}
                              {!book.audioUrl && !book.videoUrl && (!book.files || book.files.length === 0) && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-500 border border-stone-850 flex items-center gap-1">
                                  <BookOpen className="w-2.5 h-2.5 text-stone-600" />
                                  <span>Classic Text</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Integrated Dual Progress Indicators */}
                        {progressMap[book.id] && (progressMap[book.id].readProgress > 0 || progressMap[book.id].listenProgress > 0) && (
                          <div className="bg-stone-950/40 rounded-2xl p-3 border border-stone-900 flex flex-col gap-2 mt-1">
                            {progressMap[book.id].readProgress > 0 && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[9px] font-mono text-stone-500">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-2.5 h-2.5 text-amber-500" />
                                    <span>READ PROGRESS</span>
                                  </span>
                                  <span className="text-amber-400 font-semibold">
                                    {progressMap[book.id].currentPage && progressMap[book.id].totalPages ? (
                                      `Page ${progressMap[book.id].currentPage} of ${progressMap[book.id].totalPages} (${progressMap[book.id].readProgress}%)`
                                    ) : (
                                      `${progressMap[book.id].readProgress}%`
                                    )}
                                  </span>
                                </div>
                                <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${progressMap[book.id].readProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {progressMap[book.id].listenProgress > 0 && (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[9px] font-mono text-stone-500">
                                  <span className="flex items-center gap-1">
                                    <Music className="w-2.5 h-2.5 text-emerald-500" />
                                    <span>LISTEN PROGRESS</span>
                                  </span>
                                  <span className="text-emerald-400 font-semibold">{progressMap[book.id].listenProgress}%</span>
                                </div>
                                <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${progressMap[book.id].listenProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Integrated CTA Footer bar */}
                        <div className="mt-auto pt-3 border-t border-stone-950/60 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          {book.files && book.files.length > 0 ? (
                            <button
                              id={`continue-reading-${book.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAutoResumeForModal(true);
                                setSelectedBookForModal(book);
                              }}
                              className="text-[10px] font-mono uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 font-bold shadow-sm cursor-pointer"
                            >
                              {progressMap[book.id] && progressMap[book.id].readProgress > 0 ? (
                                <>
                                  <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <span>Resume p. {progressMap[book.id].currentPage || 1}</span>
                                </>
                              ) : (
                                <>
                                  <BookOpen className="w-3 h-3 text-amber-500" />
                                  <span>Start Reading</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                              Classical Edition
                            </span>
                          )}
                          <button
                            id={`explore-edition-${book.id}`}
                            onClick={() => {
                              setAutoResumeForModal(false);
                              setSelectedBookForModal(book);
                            }}
                            className="text-[10px] font-mono uppercase text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors font-semibold cursor-pointer"
                          >
                            <span>Explore Edition</span>
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center bg-stone-900/10 border border-dashed border-stone-900 rounded-3xl w-full">
                  <BookOpen className="w-8 h-8 text-stone-700 mx-auto mb-2" />
                  <p className="text-xs font-mono text-stone-500 uppercase tracking-widest">No publications match your filter query</p>
                </div>
              )}
            </motion.div>
          ) : (
            // HISTORICAL POET TIMELINE VIEW
            <motion.div
              key="poet-historical-timeline"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <PoetTimeline 
                authors={authors} 
                onSelectAuthor={(author) => setSelectedAuthor(author)} 
                triggerToast={triggerToast} 
              />
            </motion.div>
          )
        ) : (
          // AUTHOR PROFILE & BOOKS DETAIL VIEW
          <motion.div
            key="author-profile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6"
          >
            {/* Back button */}
            <button
              onClick={handleBack}
              className="self-start flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-400 hover:text-amber-400 transition-colors bg-stone-900/40 hover:bg-stone-900/80 border border-stone-850 px-3.5 py-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Authors</span>
            </button>

            {/* Author Showcase Banner Card */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border border-stone-850 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/[0.015] rounded-full blur-[100px] pointer-events-none" />

              <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                {/* Profile Portrait */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-stone-800 bg-stone-950 flex-shrink-0 shadow-lg">
                  <LocalMediaImage 
                    url={selectedAuthor.imageUrl} 
                    isLocal={selectedAuthor.isLocalImage} 
                    className="w-full h-full object-cover" 
                    alt={selectedAuthor.name}
                    isAuthor
                  />
                </div>

                {/* Info Credentials */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-500">{selectedAuthor.name}</h1>
                    <span className="text-[10px] font-mono text-stone-500 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 flex items-center gap-1 mt-1 md:mt-0">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>{selectedAuthor.activeYears || "Classic Era"}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-stone-500 text-xs font-mono">
                    <MapPin className="w-3.5 h-3.5 text-amber-500/80" />
                    <span>Birthplace: <strong className="text-stone-300 font-normal">{selectedAuthor.birthPlace || "N/A"}</strong></span>
                  </div>

                  <p className="text-xs md:text-sm text-stone-300 font-serif leading-relaxed mt-4 border-t border-stone-900 pt-4">
                    {selectedAuthor.bio || "No biography details available."}
                  </p>
                </div>
              </div>
            </div>

            {/* Book Catalog Heading */}
            <div className="flex items-center justify-between border-b border-stone-900 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500/80" />
                <h2 className="text-sm font-serif font-bold text-stone-200 tracking-wide uppercase">Publications & Anthologies</h2>
              </div>
              <span className="text-[10px] font-mono text-stone-500">{selectedAuthorBooks.length} {selectedAuthorBooks.length === 1 ? "edition" : "editions"} found</span>
            </div>

            {/* Books catalog grid */}
            {selectedAuthorBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedAuthorBooks.map((book) => (
                  <motion.div 
                    key={book.id}
                    onClick={() => setSelectedBookForModal(book)}
                    whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.3)" }}
                    className="bg-stone-900/30 border border-stone-900/80 hover:bg-stone-900/60 rounded-3xl p-5 flex flex-col gap-4 shadow-md relative overflow-hidden transition-all group cursor-pointer"
                  >
                    <div className="flex gap-4">
                      {/* Book Cover */}
                      <div className="w-20 h-28 md:w-24 md:h-32 rounded-2xl overflow-hidden border border-stone-850 bg-stone-950 flex-shrink-0 shadow-md">
                        <LocalMediaImage 
                          url={book.coverImageUrl} 
                          isLocal={book.isLocalCover} 
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                          alt={book.title}
                          isAuthor={false}
                        />
                      </div>

                      {/* Book metadata */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <h3 className="text-sm font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors truncate">
                              {book.title}
                            </h3>
                            {book.averageRating !== undefined && book.averageRating > 0 && (
                              <div className="flex items-center gap-0.5 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/15 text-amber-400 text-[9px] font-mono font-bold flex-shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>{book.averageRating} ({book.reviewsCount || 0})</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 font-serif mt-2 leading-relaxed line-clamp-3">
                            {book.description || "Classic anthology compiling the elegant verses of this author."}
                          </p>

                          {(book.genre || book.literaryPeriod) && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {book.genre && (
                                <span className="text-[8px] font-mono uppercase tracking-widest bg-stone-900 text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                                  {book.genre}
                                </span>
                              )}
                              {book.literaryPeriod && (
                                <span className="text-[8px] font-mono uppercase tracking-widest bg-amber-500/5 text-amber-500/70 px-2 py-0.5 rounded border border-amber-500/10">
                                  {book.literaryPeriod}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Badges/Indicators of media */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap font-mono">
                          {book.audioUrl && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Music className="w-2.5 h-2.5 text-amber-500/80" />
                              <span>Audio Recitation</span>
                            </span>
                          )}
                          {book.videoUrl && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Video className="w-2.5 h-2.5 text-amber-500/80" />
                              <span>Performance Video</span>
                            </span>
                          )}
                          {!book.audioUrl && !book.videoUrl && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-500 border border-stone-850 flex items-center gap-1">
                              <BookOpen className="w-2.5 h-2.5 text-stone-600" />
                              <span>Classic Text</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                     {/* Integrated Dual Progress Indicators */}
                    {progressMap[book.id] && (progressMap[book.id].readProgress > 0 || progressMap[book.id].listenProgress > 0) && (
                      <div className="bg-stone-950/40 rounded-2xl p-3 border border-stone-900 flex flex-col gap-2 mt-1">
                        {progressMap[book.id].readProgress > 0 && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[9px] font-mono text-stone-500">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-2.5 h-2.5 text-amber-500" />
                                <span>READ PROGRESS</span>
                              </span>
                              <span className="text-amber-400 font-semibold">
                                {progressMap[book.id].currentPage && progressMap[book.id].totalPages ? (
                                  `Page ${progressMap[book.id].currentPage} of ${progressMap[book.id].totalPages} (${progressMap[book.id].readProgress}%)`
                                ) : (
                                  `${progressMap[book.id].readProgress}%`
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-300" 
                                style={{ width: `${progressMap[book.id].readProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {progressMap[book.id].listenProgress > 0 && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[9px] font-mono text-stone-500">
                              <span className="flex items-center gap-1">
                                <Music className="w-2.5 h-2.5 text-emerald-500" />
                                <span>LISTEN PROGRESS</span>
                              </span>
                              <span className="text-emerald-400 font-semibold">{progressMap[book.id].listenProgress}%</span>
                            </div>
                            <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                                style={{ width: `${progressMap[book.id].listenProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Integrated CTA Footer bar */}
                    <div className="mt-auto pt-3 border-t border-stone-950/60 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      {book.files && book.files.length > 0 ? (
                        <button
                          id={`continue-reading-${book.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutoResumeForModal(true);
                            setSelectedBookForModal(book);
                          }}
                          className="text-[10px] font-mono uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 font-bold shadow-sm cursor-pointer"
                        >
                          {progressMap[book.id] && progressMap[book.id].readProgress > 0 ? (
                            <>
                              <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span>Resume p. {progressMap[book.id].currentPage || 1}</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3 text-amber-500" />
                              <span>Start Reading</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                          Classical Edition
                        </span>
                      )}
                      <button
                        id={`explore-edition-${book.id}`}
                        onClick={() => {
                          setAutoResumeForModal(false);
                          setSelectedBookForModal(book);
                        }}
                        className="text-[10px] font-mono uppercase text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors font-semibold cursor-pointer"
                      >
                        <span>Explore Edition</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-stone-900/10 border border-dashed border-stone-900 rounded-3xl">
                <BookOpen className="w-8 h-8 text-stone-700 mx-auto mb-2" />
                <p className="text-xs font-mono text-stone-500 uppercase tracking-widest">No books available for this author</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Book Details Modal Portal */}
      <AnimatePresence>
        {selectedBookForModal && (
          <BookDetailModal 
            book={selectedBookForModal}
            author={selectedAuthor || authors.find(a => a.id === selectedBookForModal.authorId) || { id: "unknown", name: "Classical Author" }}
            onClose={() => { setSelectedBookForModal(null); setAutoResumeForModal(false); }}
            onPlayVideo={(url, type, title) => setActiveVideo({ url, type, title })}
            triggerToast={triggerToast}
            user={user || null}
            bookProgress={progressMap[selectedBookForModal.id]}
            onUpdateProgress={(readPct, listenPct, currentPage, totalPages) => handleUpdateProgress(selectedBookForModal.id, readPct, listenPct, currentPage, totalPages)}
            autoResumeReader={autoResumeForModal}
            onReaderClose={refreshCacheKeys}
          />
        )}
      </AnimatePresence>

      {/* Embedded Video Overlay Portal */}
      <AnimatePresence>
        {activeVideo && (
          <VideoModal 
            videoUrl={activeVideo.url} 
            videoType={activeVideo.type} 
            title={activeVideo.title} 
            onClose={() => setActiveVideo(null)} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}
