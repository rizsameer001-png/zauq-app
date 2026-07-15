import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, BookOpen, Quote, Sparkles, Feather, Heart, FileText, ChevronRight, Share2, Copy, Trash2, Check, Volume2, History, Download, Palette, Type, Star, Globe, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { CURATED_GHAZALS, CLASSIC_POETS } from "../data";
import PoetTimeline, { getPoetEra } from "./PoetTimeline";
import { Sher, Ghazal, Book } from "../types";
import { motion, AnimatePresence } from "motion/react";
import DailySher from "./DailySher";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getMediaFile } from "../mediaDb";
import SherInterpretationModal from "./SherInterpretationModal";

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
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (isLocal && url) {
      const key = isAuthor ? `author_${url}` : `cover_${url}`;
      getMediaFile(key)
        .then((blob) => {
          if (blob && active) {
            const localUrl = URL.createObjectURL(blob);
            setBlobUrl(localUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to load local media:", err);
        });
    }
    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, isLocal, isAuthor]);

  const defaultPlaceholder = isAuthor 
    ? "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=200"
    : "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300";

  return (
    <img 
      src={isLocal ? (blobUrl || defaultPlaceholder) : (url || defaultPlaceholder)} 
      className={className} 
      alt={alt || ""} 
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = defaultPlaceholder;
      }}
    />
  );
};

interface DeewanViewProps {
  onSaveSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  savedSherIds: string[];
  savedShers?: Sher[];
  onRemoveSher?: (id: string) => void;
  poets?: any[];
  ghazals?: Ghazal[];
  dailyCouplets?: any[];
  books?: Book[];
  onOpenBook?: (book: Book) => void;
  initialPoet?: string | null;
  initialGhazal?: Ghazal | null;
  onClearInitialPoet?: () => void;
  onClearInitialGhazal?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: (val: boolean) => void;
}

export default function DeewanView({ 
  onSaveSher, 
  onEditInCardCreator, 
  savedSherIds,
  savedShers = [],
  onRemoveSher,
  poets = CLASSIC_POETS,
  ghazals = CURATED_GHAZALS,
  dailyCouplets = [],
  books = [],
  onOpenBook,
  initialPoet,
  initialGhazal,
  onClearInitialPoet,
  onClearInitialGhazal,
  isFocusMode = false,
  onToggleFocusMode
}: DeewanViewProps) {
  const [activeSection, setActiveSection] = useState<"anthology" | "saved">("anthology");
  const [selectedSavedSher, setSelectedSavedSher] = useState<Sher | null>(null);
  const [selectedPoet, setSelectedPoet] = useState<string | null>(null);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedGhazalState, setSelectedGhazalState] = useState<Ghazal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSherId, setCopiedSherId] = useState<string | null>(null);
  const [interpretationSher, setInterpretationSher] = useState<Sher | null>(null);

  // Focus initial poet/ghazal passed via prop from global search
  useEffect(() => {
    if (initialPoet) {
      setSelectedPoet(initialPoet);
      setActiveSection("anthology");
      // Reset selected era/genre to avoid filter clashes
      setSelectedEra(null);
      setSelectedGenre(null);
      if (onClearInitialPoet) onClearInitialPoet();
    }
  }, [initialPoet, onClearInitialPoet]);

  useEffect(() => {
    if (initialGhazal) {
      setSelectedGhazalState(initialGhazal);
      setActiveSection("anthology");
      // Make sure the selected poet is set correctly if needed
      setSelectedPoet(initialGhazal.poet);
      setSelectedEra(null);
      setSelectedGenre(null);
      if (onClearInitialGhazal) onClearInitialGhazal();
    }
  }, [initialGhazal, onClearInitialGhazal]);

  // Export card modal states
  const [exportSher, setExportSher] = useState<Sher | null>(null);
  const [exportTheme, setExportTheme] = useState<"charcoal" | "parchment" | "crimson" | "teal" | "gold">("charcoal");
  const [exportFont, setExportFont] = useState<"nastaliq" | "naskh" | "diwani" | "serif" | "sans" | "mono">("nastaliq");
  const [exportBorder, setExportBorder] = useState<"none" | "simple" | "elegant" | "classic-floral">("elegant");
  const [isGenerating, setIsGenerating] = useState(false);

  const exportCardRef = useRef<HTMLDivElement>(null);

  // Persistent read/explored shers state
  const [readSherIds, setReadSherIds] = useState<string[]>(() => {
    const stored = localStorage.getItem("zauq_read_shers");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse read shers:", e);
      }
    }
    return [];
  });

  const [recentlyViewed, setRecentlyViewed] = useState<Sher[]>(() => {
    const stored = localStorage.getItem("zauq_recently_viewed");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse recently viewed:", e);
      }
    }
    return [];
  });

  const interactWithSher = (sher: Sher) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((s) => s.id !== sher.id);
      const next = [sher, ...filtered].slice(0, 5);
      localStorage.setItem("zauq_recently_viewed", JSON.stringify(next));
      return next;
    });
    window.dispatchEvent(new CustomEvent("zauq_recently_viewed_update"));
  };

  useEffect(() => {
    const handleStorageUpdate = () => {
      const stored = localStorage.getItem("zauq_recently_viewed");
      if (stored) {
        try {
          setRecentlyViewed(JSON.parse(stored));
        } catch (e) {}
      } else {
        setRecentlyViewed([]);
      }
    };
    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("zauq_recently_viewed_update", handleStorageUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("zauq_recently_viewed_update", handleStorageUpdate);
    };
  }, []);

  const handleQuickAccess = (sher: Sher) => {
    const parentGhazal = ghazals.find((g) => g.shers.some((s) => s.id === sher.id));
    if (parentGhazal) {
      setSelectedGhazal(parentGhazal);
      setActiveSection("anthology");
      
      setTimeout(() => {
        const el = document.getElementById(`sher-card-${sher.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-amber-500", "ring-offset-2", "ring-offset-stone-950");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-amber-500", "ring-offset-2", "ring-offset-stone-950");
          }, 2000);
        }
      }, 150);
    } else {
      setActiveSection("saved");
      setSelectedSavedSher(sher);
    }
  };

  const toggleReadSher = (sherId: string) => {
    setReadSherIds((prev) => {
      const next = prev.includes(sherId)
        ? prev.filter((id) => id !== sherId)
        : [...prev, sherId];
      localStorage.setItem("zauq_read_shers", JSON.stringify(next));
      return next;
    });
  };

  const getGhazalProgress = (g: Ghazal) => {
    const total = g.shers.length;
    if (total === 0) return { count: 0, total: 0, percentage: 0 };
    const count = g.shers.filter((s) => readSherIds.includes(s.id)).length;
    return {
      count,
      total,
      percentage: Math.round((count / total) * 100),
    };
  };

  const { speak, stop, isSpeaking, currentSpeakingId } = useSpeechSynthesis();

  const handleRecite = (sher: Sher) => {
    interactWithSher(sher);
    if (currentSpeakingId === sher.id && isSpeaking) {
      stop();
    } else {
      speak(sher.id, sher.urdu);
      // Auto-mark as read when user listens to recitation
      if (!readSherIds.includes(sher.id)) {
        setReadSherIds((prev) => {
          const next = [...prev, sher.id];
          localStorage.setItem("zauq_read_shers", JSON.stringify(next));
          return next;
        });
      }
    }
  };

  // Combine props.ghazals (loaded from Firestore) with local starter entries
  const combinedGhazals = useMemo(() => {
    const list = [...ghazals];
    CURATED_GHAZALS.forEach((local) => {
      if (!list.some((g) => g.id === local.id)) {
        list.push(local);
      }
    });
    return list;
  }, [ghazals]);

  // Filter books that have PDF attachments to display on homepage
  const pdfBooks = useMemo(() => {
    return books.filter((b) => b.files?.some((f) => f.type === "pdf"));
  }, [books]);

  // Filter Ghazals based on selected poet, era, genre and search query
  const filteredGhazals = useMemo(() => {
    return combinedGhazals.filter((g) => {
      const matchesPoet = selectedPoet ? g.poet === selectedPoet : true;
      const matchesEra = selectedEra ? getPoetEra(g.poet) === selectedEra : true;
      const matchesGenre = selectedGenre
        ? g.category?.toLowerCase() === selectedGenre.toLowerCase()
        : true;
      const matchesSearch = searchQuery
        ? g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.poet.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.shers.some((s) => s.urdu.includes(searchQuery) || s.roman.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesPoet && matchesEra && matchesGenre && matchesSearch;
    });
  }, [combinedGhazals, selectedPoet, selectedEra, selectedGenre, searchQuery]);

  // Selected Ghazal is memoized to automatically fall back to the first element in filteredGhazals if the current selection doesn't match the active filters
  const selectedGhazal = useMemo(() => {
    if (selectedGhazalState && filteredGhazals.some((g) => g.id === selectedGhazalState.id)) {
      return selectedGhazalState;
    }
    return filteredGhazals[0] || null;
  }, [selectedGhazalState, filteredGhazals]);

  const setSelectedGhazal = (g: Ghazal | null) => setSelectedGhazalState(g);

  // Filter saved Shers based on selected poet, era, genre and search query
  const filteredSavedShers = useMemo(() => {
    return savedShers.filter((s) => {
      const matchesPoet = selectedPoet ? s.poet.toLowerCase().includes(selectedPoet.toLowerCase()) : true;
      const matchesEra = selectedEra ? getPoetEra(s.poet) === selectedEra : true;
      const matchesGenre = selectedGenre
        ? s.category?.toLowerCase() === selectedGenre.toLowerCase() || (selectedGenre === "Sher" && !s.category)
        : true;
      const matchesSearch = searchQuery
        ? s.urdu.includes(searchQuery) ||
          s.roman.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.poet.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesPoet && matchesEra && matchesGenre && matchesSearch;
    });
  }, [savedShers, selectedPoet, selectedEra, selectedGenre, searchQuery]);

  const handleCopy = (sher: Sher) => {
    interactWithSher(sher);
    const textToCopy = `${sher.urdu}\n\n${sher.roman}\n\n"${sher.english}"\n— ${sher.poet}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSherId(sher.id);
    setTimeout(() => setCopiedSherId(null), 2000);
  };

  const handleExportPNG = async () => {
    if (!exportCardRef.current || !exportSher) return;
    try {
      setIsGenerating(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      
      const link = document.createElement("a");
      const sanitizedPoet = exportSher.poet.replace(/\s+/g, "_").toLowerCase();
      link.download = `zauq_sher_${sanitizedPoet}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export PNG failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!exportCardRef.current || !exportSher) return;
    try {
      setIsGenerating(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      
      const el = exportCardRef.current;
      const width = el.clientWidth;
      const height = el.clientHeight;
      
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [width, height],
      });
      
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      const sanitizedPoet = exportSher.poet.replace(/\s+/g, "_").toLowerCase();
      pdf.save(`zauq_sher_${sanitizedPoet}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Export PDF failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate overall progress across all ghazals
  const allShers = combinedGhazals.reduce((acc, g) => [...acc, ...g.shers], [] as Sher[]);
  const totalAllShers = allShers.length;
  const readAllShers = allShers.filter((s) => readSherIds.includes(s.id)).length;
  const overallPercentage = totalAllShers > 0 ? Math.round((readAllShers / totalAllShers) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 w-full" id="zauq-deewan-wrapper">
      {/* Deterministic Daily Couplet Banner */}
      <DailySher
        ghazals={combinedGhazals}
        dailyCouplets={dailyCouplets}
        onSaveSher={(sher) => {
          interactWithSher(sher);
          onSaveSher(sher);
        }}
        savedSherIds={savedSherIds}
        onRemoveSher={onRemoveSher}
        onEditInCardCreator={(sher) => {
          interactWithSher(sher);
          onEditInCardCreator(sher);
        }}
      />

      {/* Poet Timeline Interactive Chart & Era Filter */}
      <PoetTimeline
        poets={poets}
        ghazals={combinedGhazals}
        selectedPoet={selectedPoet}
        onSelectPoet={setSelectedPoet}
        selectedEra={selectedEra}
        onSelectEra={setSelectedEra}
      />

      {/* Featured Literary Sections: Sher and Mersiya */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="zauq-home-genre-sections">
        {/* Standalone Couplets Section */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-3xl border border-stone-900 bg-gradient-to-br from-stone-900/40 to-stone-950/60 p-6 md:p-8 flex flex-col justify-between gap-6 shadow-lg group"
        >
          {/* Subtle floral crown/accent on background */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.01] rounded-full blur-xl pointer-events-none" />
          <div className="absolute inset-2 border border-amber-500/[0.02] rounded-2xl pointer-events-none" />

          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
                Aasnaf • Standalone Couplet
              </span>
              <span className="font-urdu text-xl text-amber-500/85">شعر</span>
            </div>
            <h3 className="text-2xl font-serif text-stone-100 font-bold group-hover:text-amber-300 transition-colors">
              Guldasta-e-Sher (Standalone Couplets)
            </h3>
            <p className="text-sm text-stone-400 font-serif leading-relaxed">
              Explore standalone romantic and philosophical couplets. These self-contained gems deliver the ultimate punch of classical Urdu aesthetics in just two elegant lines.
            </p>

            {/* Micro Calligraphic Preview */}
            <div className="bg-stone-950/40 border border-stone-900/80 p-5 rounded-2xl text-center my-2">
              <p className="text-lg md:text-xl font-serif text-stone-200 font-urdu leading-relaxed whitespace-pre-line" dir="rtl">
                عشق پر زور نہیں ہے یہ وہ آتش غالب{"\n"}کہ لگائے نہ لگے اور بجھائے نہ بنے
              </p>
              <p className="text-xs font-mono uppercase tracking-wider text-stone-500 mt-3 font-semibold">— Mirza Ghalib</p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedGenre("Sher");
              const targetG = combinedGhazals.find(g => g.category === "Sher");
              if (targetG) {
                setSelectedGhazalState(targetG);
              }
              setTimeout(() => {
                const el = document.getElementById("zauq-deewan-explorer");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/40 text-xs md:text-sm font-mono uppercase tracking-widest font-bold transition-all cursor-pointer text-center relative z-10"
          >
            Explore Standalone Couplets
          </button>
        </motion.div>

        {/* Mersiya Section */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-3xl border border-stone-900 bg-gradient-to-br from-stone-900/40 to-stone-950/60 p-6 md:p-8 flex flex-col justify-between gap-6 shadow-lg group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.01] rounded-full blur-xl pointer-events-none" />
          <div className="absolute inset-2 border border-amber-500/[0.02] rounded-2xl pointer-events-none" />

          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
                Aasnaf • Elegiac Poetry
              </span>
              <span className="font-urdu text-xl text-amber-500/85">مرثیہ</span>
            </div>
            <h3 className="text-2xl font-serif text-stone-100 font-bold group-hover:text-amber-300 transition-colors">
              Mersiya-e-Anis (Elegiac Poetry)
            </h3>
            <p className="text-sm text-stone-400 font-serif leading-relaxed">
              Experience the supreme nobility, moral values, and high tragedy of classical elegies. Portraying patience, courage, and truth in matchless epic descriptions.
            </p>

            {/* Micro Calligraphic Preview */}
            <div className="bg-stone-950/40 border border-stone-900/80 p-5 rounded-2xl text-center my-2">
              <p className="text-lg md:text-xl font-serif text-stone-200 font-urdu leading-relaxed whitespace-pre-line" dir="rtl">
                رنگِ چہرہ جو اڑا تھا وہ بحال اب تو ہوا{"\n"}شکرِ حق دل کو مرے چین و ملال اب تو ہوا
              </p>
              <p className="text-xs font-mono uppercase tracking-wider text-stone-500 mt-3 font-semibold">— Mir Babar Ali Anis</p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedGenre("Mersiya");
              const targetG = combinedGhazals.find(g => g.category === "Mersiya");
              if (targetG) {
                setSelectedGhazalState(targetG);
              }
              setTimeout(() => {
                const el = document.getElementById("zauq-deewan-explorer");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/40 text-xs md:text-sm font-mono uppercase tracking-widest font-bold transition-all cursor-pointer text-center relative z-10"
          >
            Explore Elegiac Poetry
          </button>
        </motion.div>
      </div>

      {/* Kutub-e-Adab Shelf Section */}
      {pdfBooks.length > 0 && (
        <div className="flex flex-col gap-5 border border-stone-900 rounded-3xl p-6 bg-gradient-to-br from-stone-950/80 via-stone-900/10 to-stone-950/80 relative overflow-hidden shadow-xl" id="zauq-home-publications-shelf">
          {/* Decorative background circle */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none" />
          <div className="absolute inset-2 border border-amber-500/[0.015] rounded-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10 pb-2 border-b border-stone-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs md:text-sm font-mono uppercase tracking-widest text-amber-500 font-bold block">
                  Kutub-e-Adab
                </span>
                <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-100 flex items-center gap-1.5 mt-0.5">
                  Publications Shelf
                </h3>
              </div>
            </div>
            <p className="text-sm text-stone-400 font-serif max-w-md md:text-right leading-relaxed">
              Explore publications, digital editions, and historical compilations. Click on any publication to read its PDF in your library.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pdfBooks.map((book) => {
              return (
                <div 
                  key={book.id}
                  onClick={() => onOpenBook && onOpenBook(book)}
                  className="bg-stone-900 border border-stone-800 hover:border-amber-500/30 hover:bg-stone-900 rounded-2xl p-3 flex flex-col gap-3 group cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Book Cover */}
                  <div className="aspect-[3/4.2] w-full rounded-xl overflow-hidden border border-stone-850 bg-stone-950 flex-shrink-0 relative shadow-md">
                    <LocalMediaImage 
                      url={book.coverImageUrl} 
                      isLocal={book.isLocalCover} 
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      alt={book.title}
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-stone-950/65 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 p-2">
                      <span className="text-xs font-mono uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Download className="w-2.5 h-2.5" />
                        <span>Read PDF</span>
                      </span>
                    </div>
                  </div>

                  {/* Book Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors truncate">
                        {book.title}
                      </h4>
                      {book.genre && (
                        <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mt-0.5 truncate">
                          {book.genre}
                        </span>
                      )}
                    </div>
                    {book.averageRating !== undefined && book.averageRating > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 text-amber-400 text-xs font-mono font-bold">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>{book.averageRating} ({book.reviewsCount || 0})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="zauq-deewan-explorer">
      {/* Sidebar: Poet filter and Ghazal list */}
      <div className={`lg:col-span-4 flex flex-col gap-6 ${isFocusMode && selectedGhazal ? "hidden" : ""}`}>
        {/* Toggle between Anthology and Saved Shers */}
        <div className="grid grid-cols-2 p-1 bg-stone-950/80 border border-stone-900 rounded-2xl">
          <button
            onClick={() => {
              setActiveSection("anthology");
              setSearchQuery("");
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold font-serif tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSection === "anthology"
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Anthology</span>
          </button>
          <button
            onClick={() => {
              setActiveSection("saved");
              setSearchQuery("");
              setSelectedSavedSher(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold font-serif tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSection === "saved"
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Saved ({savedShers.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-stone-900/40 p-4 rounded-2xl border border-stone-900/80 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder={activeSection === "saved" ? "Search saved couplets, poets..." : "Search Ghazals, couplets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Poetry Genre / Type Filter */}
        <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex flex-col gap-3">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-amber-500" />
            <span>Asnaf-e-SuKhan (Poetry Genres)</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              { id: null, label: "All Poetry" },
              { id: "Ghazal", label: "Ghazal" },
              { id: "Sher", label: "Sher (Couplet)" },
              { id: "Mersiya", label: "Mersiya" },
              { id: "Nazm", label: "Nazm" },
              { id: "Rubai", label: "Rubai" }
            ].map((genre) => (
              <button
                key={genre.label}
                onClick={() => setSelectedGenre(genre.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  selectedGenre === genre.id
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-md"
                    : "bg-stone-900/60 border border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Poet Quick Filter */}
        <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 mb-3 flex items-center gap-1.5">
            <Feather className="w-3.5 h-3.5" />
            <span>Mashaaheer (Poet Masters)</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPoet(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedPoet === null
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-md shadow-amber-950/20"
                  : "bg-stone-900/60 border border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              All Poets
            </button>
            {poets.map((poet) => (
              <button
                key={poet.name}
                onClick={() => setSelectedPoet(poet.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedPoet === poet.name
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-md"
                    : "bg-stone-900/60 border border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                {poet.name.split(" ").slice(-1)[0]} {/* just last name */}
              </button>
            ))}
          </div>
        </div>

        {/* Recently Viewed Shers */}
        {recentlyViewed.length > 0 && (
          <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/85 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-500" />
                <span>Guzashta (Recently Viewed)</span>
              </h4>
              <button 
                onClick={() => {
                  setRecentlyViewed([]);
                  localStorage.removeItem("zauq_recently_viewed");
                }}
                className="text-[9px] font-mono text-stone-500 hover:text-rose-400 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {recentlyViewed.map((sher) => (
                <button
                  key={sher.id}
                  onClick={() => handleQuickAccess(sher)}
                  className="w-full text-left p-2.5 rounded-xl bg-stone-950/40 border border-stone-900/50 hover:border-amber-500/35 hover:bg-stone-900/20 text-stone-400 hover:text-stone-200 transition-all flex flex-col gap-1 cursor-pointer group"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[8.5px] font-mono uppercase tracking-widest text-stone-500 group-hover:text-amber-500/70 transition-colors">
                      {sher.poet}
                    </span>
                    <ChevronRight className="w-3 h-3 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs font-serif truncate dir-rtl text-right w-full text-amber-200/85 group-hover:text-amber-200 font-urdu leading-relaxed">
                    {sher.urdu}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate group-hover:text-stone-400 transition-colors italic">
                    {sher.roman || sher.english}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ghazals / Saved Selector List */}
        {activeSection === "anthology" ? (
          <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 max-h-[450px] overflow-y-auto">
            {/* Overall Reading Progress Tracker */}
            <div className="bg-stone-950/50 border border-stone-900/85 p-3.5 rounded-xl mb-5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Safar-e-Zauq (Explored)</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {overallPercentage}%
                </span>
              </div>
              <div>
                <div className="w-full h-1 bg-stone-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[9px] text-stone-500 font-serif italic">
                    {readAllShers} of {totalAllShers} couplets read
                  </span>
                  {overallPercentage === 100 && (
                    <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1 rounded-sm">
                      Completed Deewan! 📖
                    </span>
                  )}
                </div>
              </div>
            </div>

            <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kutub-e-Ghazal (Ghazal Anthology)</span>
            </h4>

            {filteredGhazals.length === 0 ? (
              <p className="text-xs text-stone-600 text-center py-8">No matching Ghazals found.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredGhazals.map((ghazal) => {
                  const isSelected = selectedGhazal?.id === ghazal.id;
                  const progress = getGhazalProgress(ghazal);
                  const isGhazalCompleted = progress.percentage === 100;
                  
                  return (
                    <button
                      key={ghazal.id}
                      onClick={() => setSelectedGhazal(ghazal)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 border flex flex-col gap-2 group cursor-pointer ${
                        isSelected
                          ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-lg shadow-amber-950/30"
                          : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 block mb-1">
                            {ghazal.poet}
                          </span>
                          <span className="text-xs font-serif block font-medium group-hover:text-amber-200 transition-colors">
                            {ghazal.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isGhazalCompleted ? (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded-md flex items-center gap-0.5" title="Completed Ghazal!">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : progress.count > 0 ? (
                            <span className="text-[9px] font-mono text-stone-500">
                              {progress.percentage}%
                            </span>
                          ) : null}
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400 group-hover:translate-x-0.5"}`} />
                        </div>
                      </div>

                      {/* Mini progress bar under ghazal block */}
                      {progress.total > 0 && (
                        <div className="w-full mt-1">
                          <div className="w-full h-0.5 bg-stone-950/80 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isGhazalCompleted ? "bg-amber-400" : "bg-amber-500/40"}`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 max-h-[400px] overflow-y-auto">
            <h4 className="text-xs font-mono uppercase tracking-widest text-amber-500/80 mb-4 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              <span>Saved Couplets Collection</span>
            </h4>

            {filteredSavedShers.length === 0 ? (
              <p className="text-xs text-stone-600 text-center py-8">
                {savedShers.length === 0
                  ? "Your collection is empty. Go save some couplets!"
                  : "No matching saved Shers found."}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setSelectedSavedSher(null)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 border flex items-center justify-between group cursor-pointer ${
                    selectedSavedSher === null
                      ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-lg shadow-amber-950/30"
                      : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 block mb-1">
                      View All
                    </span>
                    <span className="text-xs font-serif block font-medium group-hover:text-amber-200 transition-colors">
                      Show Feed Grid
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedSavedSher === null ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400 group-hover:translate-x-0.5"}`} />
                </button>

                {filteredSavedShers.map((sher) => {
                  const isSelected = selectedSavedSher?.id === sher.id;
                  return (
                    <button
                      key={sher.id}
                      onClick={() => setSelectedSavedSher(sher)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 border flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-lg shadow-amber-950/30"
                          : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/70 block mb-1">
                          {sher.poet}
                        </span>
                        <span className="text-xs font-serif block font-medium group-hover:text-amber-200 transition-colors truncate">
                          {sher.roman || sher.urdu}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400 group-hover:translate-x-0.5"}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Panel: Reading Stage */}
      <div className={`${isFocusMode && selectedGhazal ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-6`}>
        {activeSection === "saved" ? (
          selectedSavedSher ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              key={selectedSavedSher.id}
              className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl relative overflow-hidden flex-1"
            >
              {/* Elegant Vintage Corner Accents */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500/20 rounded-tl pointer-events-none" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500/20 rounded-tr pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500/20 rounded-bl pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500/20 rounded-br pointer-events-none" />

              <button
                onClick={() => setSelectedSavedSher(null)}
                className="text-[10px] font-mono uppercase tracking-wider text-amber-500 hover:text-amber-400 mb-6 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                ← View All Saved Shers
              </button>

              <div className="max-w-xl mx-auto flex flex-col gap-6 py-6 px-4 md:px-8 bg-stone-950/30 border border-stone-900/40 rounded-2xl relative">
                {selectedSavedSher.isUserAdded && (
                  <span className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest">
                    Custom
                  </span>
                )}

                {/* Urdu Calligraphy Box */}
                <div className="text-center py-4 border-b border-stone-900/40 select-text">
                  <p className="text-2xl md:text-3xl text-stone-200 font-serif leading-loose tracking-wide whitespace-pre-line dir-rtl font-urdu">
                    {selectedSavedSher.urdu}
                  </p>
                </div>

                {/* Roman Transliteration */}
                {selectedSavedSher.roman && (
                  <div className="text-center italic text-xs text-stone-400 leading-relaxed">
                    {selectedSavedSher.roman}
                  </div>
                )}

                {/* English Translation */}
                {selectedSavedSher.english && (
                  <div className="text-center text-sm text-stone-200 font-serif leading-relaxed">
                    "{selectedSavedSher.english}"
                  </div>
                )}

                {/* Poet credit */}
                <div className="text-center text-[10px] font-mono uppercase tracking-widest text-stone-500">
                  Poet: <strong className="text-stone-350">{selectedSavedSher.poet}</strong>
                </div>

                {/* Tashreeh (Explanation) */}
                {selectedSavedSher.explanation && (
                  <div className="mt-2 text-xs bg-stone-950/45 border border-stone-900/60 p-3.5 rounded-xl text-stone-400 leading-relaxed flex gap-2">
                    <FileText className="w-4 h-4 text-amber-500/60 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-stone-300 font-sans block mb-1">Tashreeh (Philosophy):</strong>
                      {selectedSavedSher.explanation}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-900/40">
                  <button
                    onClick={() => handleRecite(selectedSavedSher)}
                    className={`p-2 rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                      currentSpeakingId === selectedSavedSher.id && isSpeaking
                        ? "bg-amber-500 text-stone-950 border border-amber-400 hover:bg-amber-400"
                        : "bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40"
                    }`}
                    title={currentSpeakingId === selectedSavedSher.id && isSpeaking ? "Stop recitation" : "Recite Urdu verse"}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${currentSpeakingId === selectedSavedSher.id && isSpeaking ? "animate-pulse" : ""}`} />
                    <span>{currentSpeakingId === selectedSavedSher.id && isSpeaking ? "Reciting..." : "Listen"}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(selectedSavedSher)}
                    className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSherId === selectedSavedSher.id ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={() => {
                      interactWithSher(selectedSavedSher);
                      onEditInCardCreator(selectedSavedSher);
                    }}
                    className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Create Card</span>
                  </button>

                  <button
                    onClick={() => {
                      setExportSher(selectedSavedSher);
                    }}
                    className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Export Card as PNG or PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => {
                      interactWithSher(selectedSavedSher);
                      setInterpretationSher(selectedSavedSher);
                    }}
                    className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Consult Gemini AI Poetic Tafseer / Interpretation"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>AI Tafseer</span>
                  </button>

                  {onRemoveSher && (
                    <button
                      onClick={() => {
                        onRemoveSher(selectedSavedSher.id);
                        setSelectedSavedSher(null);
                      }}
                      className="p-2 rounded-lg bg-stone-900 text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-950/20 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-stone-900/30 p-4 rounded-2xl border border-stone-900">
                <span className="text-xs font-mono uppercase tracking-widest text-stone-400 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  <span>My Saved Shers Collection ({filteredSavedShers.length})</span>
                </span>
              </div>

              {filteredSavedShers.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-stone-900/10 border border-stone-900/60 rounded-3xl p-16 text-center">
                  <BookOpen className="w-12 h-12 text-stone-600 mb-4 stroke-[1.5]" />
                  <h3 className="text-sm font-medium text-stone-400 mb-2">No Saved Shers Match Your Query</h3>
                  <p className="text-xs text-stone-500 max-w-sm">
                    Try searching for other keywords, checking poet filters, or explore the anthology to save new couplets!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[650px] overflow-y-auto pr-1">
                  {filteredSavedShers.map((sher) => {
                    const isSaved = savedSherIds.includes(sher.id);
                    return (
                      <motion.div
                        key={sher.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-stone-950/40 p-5 rounded-2xl border border-stone-900/70 hover:border-amber-950/30 transition-all flex flex-col justify-between group relative"
                      >
                        {sher.isUserAdded && (
                          <span className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest">
                            Custom
                          </span>
                        )}

                        <div className="flex flex-col gap-4 text-center">
                          <p className="text-lg text-stone-200 leading-loose font-serif font-urdu">
                            {sher.urdu}
                          </p>
                          {sher.roman && (
                            <p className="italic text-[10px] text-stone-400">
                              {sher.roman}
                            </p>
                          )}
                          {sher.english && (
                            <p className="text-xs text-stone-300 font-serif leading-relaxed px-2">
                              "{sher.english}"
                            </p>
                          )}
                        </div>

                        <div className="mt-5 pt-3 border-t border-stone-900/60 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-stone-500">
                            Poet: <strong className="text-stone-400">{sher.poet}</strong>
                          </span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                interactWithSher(sher);
                                setSelectedSavedSher(sher);
                              }}
                              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-400 hover:text-amber-300 transition-all text-[10px] flex items-center gap-1 font-serif cursor-pointer"
                              title="View Detail"
                            >
                              <span>Read</span>
                            </button>

                            <button
                              onClick={() => handleRecite(sher)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                                currentSpeakingId === sher.id && isSpeaking
                                  ? "bg-amber-500 text-stone-950 hover:bg-amber-400"
                                  : "bg-stone-900 text-stone-500 hover:text-amber-300 hover:bg-stone-950"
                              }`}
                              title={currentSpeakingId === sher.id && isSpeaking ? "Stop recitation" : "Listen to Urdu recitation"}
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${currentSpeakingId === sher.id && isSpeaking ? "animate-pulse" : ""}`} />
                            </button>

                            <button
                              onClick={() => handleCopy(sher)}
                              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Copy text"
                            >
                              {copiedSherId === sher.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => onEditInCardCreator(sher)}
                              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Open in card designer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setExportSher(sher)}
                              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 transition-colors cursor-pointer"
                              title="Export Card as PNG or PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onRemoveSher && (
                              <button
                                onClick={() => onRemoveSher(sher.id)}
                                className="p-1.5 rounded-lg bg-stone-900 hover:bg-rose-950/20 text-stone-500 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-950/20 cursor-pointer"
                                title="Remove from collection"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : selectedGhazal ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedGhazal.id}
            className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl relative overflow-hidden flex-1"
          >
            {/* Elegant Vintage Corner Accents */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500/20 rounded-tl pointer-events-none" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500/20 rounded-tr pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500/20 rounded-bl pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500/20 rounded-br pointer-events-none" />

            {/* Top Reader Navigation & Focus bar */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-900/40 relative z-10" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setSelectedGhazalState(null);
                  if (onToggleFocusMode) onToggleFocusMode(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-400 hover:text-amber-400 hover:bg-stone-900/40 transition-all cursor-pointer"
                title="Back to Ghazal list"
              >
                <ChevronLeft className="w-4 h-4 text-amber-500/70" />
                <span>Back to List</span>
              </button>

              <button
                onClick={() => {
                  if (onToggleFocusMode) onToggleFocusMode(!isFocusMode);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  isFocusMode 
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20"
                    : "text-stone-400 hover:text-amber-400 hover:bg-stone-900/40"
                }`}
                title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode (hides navigation, footer, and sidebar)"}
              >
                {isFocusMode ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-amber-500/70" />}
                <span>{isFocusMode ? "Focus On" : "Focus Mode"}</span>
              </button>
            </div>

            {/* Ghazal Header */}
            <div className="text-center max-w-2xl mx-auto mb-8 pb-6 border-b border-stone-900/60 flex flex-col gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500/80 mb-2.5 block">
                  {selectedGhazal.poet}
                </span>
                <h3 className="text-2xl font-serif text-stone-100 tracking-tight font-semibold mb-3">
                  {selectedGhazal.title}
                </h3>
                {selectedGhazal.backgroundStory && (
                  <p className="text-xs text-stone-400 italic font-serif leading-relaxed px-4">
                    "{selectedGhazal.backgroundStory}"
                  </p>
                )}
              </div>

              {/* Reading Progress Indicator */}
              {(() => {
                const prog = getGhazalProgress(selectedGhazal);
                const isAllRead = selectedGhazal.shers.every((s) => readSherIds.includes(s.id));
                return (
                  <div className="mt-4 max-w-md mx-auto w-full bg-stone-950/45 border border-stone-900/60 rounded-xl p-3.5 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider">
                      <span className="text-stone-400">Ghazal Contemplated</span>
                      <span className="text-amber-400 font-bold">{prog.percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-stone-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${prog.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-500 italic font-serif">{prog.count} of {prog.total} couplets explored</span>
                      <button 
                        onClick={() => {
                          const allIds = selectedGhazal.shers.map(s => s.id);
                          if (isAllRead) {
                            setReadSherIds(prev => {
                              const next = prev.filter(id => !allIds.includes(id));
                              localStorage.setItem("zauq_read_shers", JSON.stringify(next));
                              return next;
                            });
                          } else {
                            setReadSherIds(prev => {
                              const next = Array.from(new Set([...prev, ...allIds]));
                              localStorage.setItem("zauq_read_shers", JSON.stringify(next));
                              return next;
                            });
                          }
                        }}
                        className="text-amber-500 hover:text-amber-400 font-mono transition-colors tracking-wide text-[9px] uppercase cursor-pointer hover:underline"
                      >
                        {isAllRead ? "Reset Progress" : "Mark All Read"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Couplets List */}
            <div className="flex flex-col gap-12 max-w-3xl mx-auto">
              {selectedGhazal.shers.map((sher, idx) => {
                const isSaved = savedSherIds.includes(sher.id);
                const isRead = readSherIds.includes(sher.id);
                
                return (
                  <div
                    key={sher.id}
                    id={`sher-card-${sher.id}`}
                    onClick={() => interactWithSher(sher)}
                    className={`flex flex-col gap-5 p-5 md:p-6 rounded-2xl relative group transition-all duration-300 ${
                      isRead
                        ? "bg-amber-950/5 border-amber-500/20 shadow-inner border-l-4 border-l-amber-500/60"
                        : "bg-stone-950/30 border-stone-900/40 hover:border-amber-950/45"
                    }`}
                  >
                    {/* Index Indicator */}
                    <div className="absolute -left-3 top-5 w-6 h-6 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono text-stone-500 flex items-center justify-center shadow">
                      {idx + 1}
                    </div>

                    {/* Urdu Calligraphy Box */}
                    <div className="text-center py-4 px-4 md:px-8 border-b border-stone-900/40 select-text">
                      {/* Standard Nasta'liq helper layout */}
                      <p className="text-2xl md:text-3xl text-stone-200 font-serif leading-loose tracking-wide whitespace-pre-line dir-rtl font-urdu">
                        {sher.urdu}
                      </p>
                    </div>

                    {/* Roman Transliteration */}
                    <div className="text-center italic text-xs text-stone-400 px-2 leading-relaxed">
                      {sher.roman}
                    </div>

                    {/* English Translation */}
                    <div className="text-center text-sm text-stone-200 font-serif px-4 leading-relaxed max-w-xl mx-auto">
                      "{sher.english}"
                    </div>

                    {/* Tashreeh (Explanation) */}
                    {sher.explanation && (
                      <div className="mt-2 text-xs bg-stone-950/45 border border-stone-900/60 p-3.5 rounded-xl text-stone-400 leading-relaxed flex gap-2">
                        <FileText className="w-4 h-4 text-amber-500/60 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-stone-300 font-sans block mb-1">Tashreeh (Philosophy):</strong>
                          {sher.explanation}
                        </div>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-900/40 opacity-70 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {/* Read Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReadSher(sher.id);
                          interactWithSher(sher);
                        }}
                        className={`p-2 rounded-lg border text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                          isRead
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : "bg-stone-900 border-transparent text-stone-400 hover:text-emerald-400 hover:bg-stone-950 hover:border-emerald-950/20"
                        }`}
                        title={isRead ? "Mark as Unread" : "Mark as Contemplated / Read"}
                      >
                        <Check className={`w-3.5 h-3.5 ${isRead ? "stroke-[3.5]" : ""}`} />
                        <span>{isRead ? "Read" : "Mark Read"}</span>
                      </button>

                      {/* Recite */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecite(sher);
                        }}
                        className={`p-2 rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                          currentSpeakingId === sher.id && isSpeaking
                            ? "bg-amber-500 text-stone-950 border border-amber-400 hover:bg-amber-400"
                            : "bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40"
                        }`}
                        title={currentSpeakingId === sher.id && isSpeaking ? "Stop recitation" : "Listen to Urdu recitation"}
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${currentSpeakingId === sher.id && isSpeaking ? "animate-pulse" : ""}`} />
                        <span>{currentSpeakingId === sher.id && isSpeaking ? "Reciting..." : "Listen"}</span>
                      </button>

                      {/* Copy */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(sher);
                        }}
                        className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedSherId === sher.id ? "Copied" : "Copy"}</span>
                      </button>

                      {/* AI Interpretation */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          interactWithSher(sher);
                          setInterpretationSher(sher);
                        }}
                        className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Consult Gemini AI Poetic Tafseer / Interpretation"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>AI Tafseer</span>
                      </button>

                      {/* Design Card */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          interactWithSher(sher);
                          onEditInCardCreator(sher);
                        }}
                        className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Open in Sher Card Customizer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Create Card</span>
                      </button>

                      {/* Export Card PNG/PDF */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportSher(sher);
                        }}
                        className="p-2 rounded-lg bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-950 border border-transparent hover:border-amber-900/40 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Export Card as PNG or PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>

                      {/* Save favorite */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          interactWithSher(sher);
                          onSaveSher(sher);
                        }}
                        className={`p-2 rounded-lg border text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                          isSaved
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-stone-900 border-transparent text-stone-400 hover:text-rose-400 hover:bg-stone-950 hover:border-rose-950"
                        }`}
                        title={isSaved ? "Saved in Notebook" : "Save to Notebook"}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
                        <span>{isSaved ? "Saved" : "Save"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-stone-900/10 border border-stone-900/60 rounded-3xl p-16 text-center">
            <BookOpen className="w-12 h-12 text-stone-600 mb-4 stroke-[1.5]" />
            <h3 className="text-lg font-medium text-stone-400 mb-2">Select a Ghazal</h3>
            <p className="text-xs text-stone-500 max-w-sm">
              Choose a Ghazal from the anthology sidebar to explore classic couplets, translations, and explanations.
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Dynamic Export Card Modal */}
    <AnimatePresence>
      {exportSher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-stone-900 border border-stone-850 w-full max-w-4xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative"
          >
            <button
              onClick={() => setExportSher(null)}
              className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 text-sm font-mono cursor-pointer"
            >
              ✕ Close
            </button>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-serif font-semibold text-amber-200">Kaghaz-e-Zauq (Export Couplet Card)</h3>
              <p className="text-stone-400 text-xs">Configure and download your couplet as a beautiful PNG image or PDF document.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Control Panel */}
              <div className="md:col-span-5 flex flex-col gap-5">
                {/* Theme Select */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-amber-500" />
                    <span>Card Backdrop Theme</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "charcoal", name: "Charcoal" },
                      { id: "parchment", name: "Parchment" },
                      { id: "teal", name: "Sufi Teal" },
                      { id: "crimson", name: "Crimson" },
                      { id: "gold", name: "Imperial" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setExportTheme(t.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          exportTheme === t.id
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Select */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-amber-500" />
                    <span>Typography Style</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "nastaliq", name: "Nastaliq" },
                      { id: "naskh", name: "Naskh" },
                      { id: "diwani", name: "Diwani" },
                      { id: "serif", name: "Serif" },
                      { id: "sans", name: "Sans" },
                      { id: "mono", name: "Mono" }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setExportFont(f.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          exportFont === f.id
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border Select */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ornamental Border</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "none", name: "None" },
                      { id: "simple", name: "Simple" },
                      { id: "elegant", name: "Elegant" },
                      { id: "classic-floral", name: "Floral Corner" }
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setExportBorder(b.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                          exportBorder === b.id
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download Trigger Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-800/60 mt-auto">
                  <button
                    onClick={handleExportPNG}
                    disabled={isGenerating}
                    className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isGenerating ? (
                      <span>Rendering...</span>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>PNG Image</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isGenerating}
                    className="py-3 rounded-xl bg-stone-950 border border-stone-850 hover:bg-stone-900 disabled:text-stone-800 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isGenerating ? (
                      <span>Rendering...</span>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>PDF Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Preview Canvas Card */}
              <div className="md:col-span-7 flex flex-col justify-center">
                <div
                  ref={exportCardRef}
                  className={`w-full aspect-[5/3.2] rounded-3xl p-6 relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${
                    exportTheme === "charcoal" ? "bg-gradient-to-br from-stone-900 via-stone-950 to-neutral-900 text-amber-200/90" :
                    exportTheme === "parchment" ? "bg-gradient-to-br from-stone-100 via-amber-50/50 to-orange-50/40 text-stone-900" :
                    exportTheme === "teal" ? "bg-gradient-to-br from-teal-950 via-stone-950 to-teal-900 text-emerald-100/90" :
                    exportTheme === "crimson" ? "bg-gradient-to-br from-rose-950 via-stone-950 to-red-950 text-amber-100/90" :
                    "bg-gradient-to-br from-amber-950 via-stone-950 to-amber-900 text-amber-100/90"
                  }`}
                >
                  {/* Ornamental borders */}
                  {exportBorder === "classic-floral" && (
                    <>
                      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-500/40 rounded-tl-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-amber-500/60 rounded-full" />
                      </div>
                      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-500/40 rounded-tr-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-amber-500/60 rounded-full" />
                      </div>
                      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-500/40 rounded-bl-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-amber-500/60 rounded-full" />
                      </div>
                      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-500/40 rounded-br-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-amber-500/60 rounded-full" />
                      </div>
                    </>
                  )}

                  {exportBorder === "elegant" && (
                    <div className={`absolute inset-3 border-2 border-dashed ${exportTheme === "parchment" ? "border-amber-800/10" : "border-amber-500/15"} rounded-2xl pointer-events-none`} />
                  )}

                  {exportBorder === "simple" && (
                    <div className={`absolute inset-3 border ${exportTheme === "parchment" ? "border-stone-900/10" : "border-amber-500/10"} rounded-2xl pointer-events-none`} />
                  )}

                  {/* Seal / Watermark */}
                  <div className={`absolute top-6 right-6 text-[8px] font-mono uppercase tracking-widest ${exportTheme === "parchment" ? "text-stone-900/10" : "text-amber-500/5"} select-none`}>
                    ذوقِ لطافت
                  </div>

                  {/* Verse Core Layout */}
                  <div className="my-auto flex flex-col justify-center gap-4 text-center z-10 px-4 md:px-6">
                    <p
                      className={`text-xl md:text-2xl leading-loose tracking-wide whitespace-pre-line dir-rtl select-text font-urdu ${
                        exportFont === "serif" ? "font-serif" :
                        exportFont === "nastaliq" ? "font-nastaliq font-semibold" :
                        exportFont === "naskh" ? "font-naskh font-medium" :
                        exportFont === "diwani" ? "font-diwani" :
                        exportFont === "sans" ? "font-sans" :
                        "font-mono"
                      }`}
                    >
                      {exportSher.urdu}
                    </p>

                    {exportSher.roman && (
                      <p className={`text-[9px] leading-relaxed italic ${exportTheme === "parchment" ? "text-stone-600" : "text-stone-400"}`}>
                        {exportSher.roman}
                      </p>
                    )}

                    {exportSher.english && (
                      <p className={`text-[10px] max-w-sm mx-auto leading-relaxed ${exportTheme === "parchment" ? "text-stone-700" : "text-stone-300"} font-serif`}>
                        "{exportSher.english}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="flex justify-between items-center z-10 pt-1.5 px-2">
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${exportTheme === "parchment" ? "text-stone-500" : "text-stone-400"}`}>
                      Poet: <strong className={exportTheme === "parchment" ? "text-stone-800" : "text-amber-200"}>{exportSher.poet}</strong>
                    </span>

                    <div className={`text-[9px] font-serif flex items-center gap-1 ${exportTheme === "parchment" ? "text-stone-500" : "text-amber-500/70"}`}>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-bold ${exportTheme === "parchment" ? "border-stone-500 text-stone-500" : "border-amber-500/40 text-amber-400"}`}>
                        ذ
                      </div>
                      <span className="font-sans font-semibold text-[7px] uppercase tracking-widest">Deewan-e-Zauq</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Sher AI Interpretation Modal */}
    <AnimatePresence>
      {interpretationSher && (
        <SherInterpretationModal
          sher={interpretationSher}
          onClose={() => setInterpretationSher(null)}
          triggerToast={(msg) => console.log(msg)}
        />
      )}
    </AnimatePresence>
  </div>
  );
}
