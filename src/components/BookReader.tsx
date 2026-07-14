import React, { useState, useEffect, useRef } from "react";
import { 
  X, BookOpen, ChevronLeft, ChevronRight, Download, Bookmark, 
  Settings, Type, Star, HelpCircle, Save, Trash2, Edit3, 
  RotateCcw, Play, Pause, RefreshCw, Layers, Sparkles, BookMarked,
  ExternalLink, ZoomIn, ZoomOut
} from "lucide-react";
import { Book, BookFile, BookProgress, Sher } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { getMediaFile, saveMediaFile } from "../mediaDb";
import { resolveBookUrl, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export interface SavedHighlight {
  id: string;
  pageNum: number;
  text: string;
  createdAt: string;
  sherId?: string;
}

interface PDFPageRendererProps {
  key?: React.Key;
  pdfDoc: any;
  pageNum: number;
  scale: number;
  theme: any;
  onPageVisible: (pageNum: number) => void;
  pageHighlights?: SavedHighlight[];
  onRemoveHighlight?: (id: string) => void;
  immediate?: boolean;
  isDoubled?: boolean;
}

function PDFPageRenderer({ pdfDoc, pageNum, scale, theme, onPageVisible, pageHighlights = [], onRemoveHighlight, immediate = false, isDoubled = false }: PDFPageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const renderTaskRef = useRef<any>(null);

  const hasHighlight = pageHighlights.length > 0;

  useEffect(() => {
    cleanupRender();
    
    if (immediate) {
      onPageVisible(pageNum);
      triggerRender();
      return;
    }

    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          onPageVisible(pageNum);
          triggerRender();
        } else {
          cleanupRender();
        }
      },
      {
        root: null,
        rootMargin: "300px 0px 300px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cleanupRender();
    };
  }, [pdfDoc, pageNum, scale, immediate]);

  const cleanupRender = () => {
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }
    setIsRendered(false);
    setIsLoading(false);
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const triggerRender = async () => {
    if (isRendered || isLoading || !pdfDoc) return;
    setIsLoading(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale * 1.5 });
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      canvas.style.width = "100%";
      canvas.style.height = "auto";

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      setIsRendered(true);
    } catch (err) {
      console.error(`Page ${pageNum} render error:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      id={`pdf-page-${pageNum}`}
      className={`relative w-full transition-all duration-300 transform hover:scale-[1.01] ${
        isDoubled ? "max-w-[440px] my-1" : "max-w-4xl mx-auto my-6"
      } rounded-2xl border ${theme.card} shadow-xl overflow-hidden`}
      style={{
        aspectRatio: "1/1.414",
        minHeight: isDoubled ? "280px" : "350px",
      }}
    >
      <div className="absolute top-0 inset-x-0 h-10 px-6 bg-gradient-to-b from-stone-900/5 to-transparent flex items-center justify-between text-[10px] font-mono text-stone-400 select-none pointer-events-none z-10 border-b border-stone-800/5">
        <span className="uppercase tracking-widest text-[9px] font-bold text-stone-500 opacity-60 font-mono">Zauq Adab Publication</span>
        {hasHighlight && (
          <span className="text-[9px] text-amber-500 font-bold font-sans flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
            ✨ Saved Verse
          </span>
        )}
        <span className="text-amber-600 font-bold font-mono">PAGE {pageNum}</span>
      </div>

      <div className="absolute inset-y-0 left-1/2 w-[2px] bg-gradient-to-r from-transparent via-stone-900/10 to-transparent pointer-events-none z-10 shadow-sm" />

      <div className="w-full h-full flex items-center justify-center pt-12 pb-12 px-4 md:px-8 bg-white overflow-hidden">
        {(!isRendered || isLoading) && (
          <div className="flex flex-col items-center justify-center gap-3 select-none">
            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">Compiling Page {pageNum}...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className={`w-full h-auto transition-opacity duration-300 ${isRendered && !isLoading ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {pageHighlights.length > 0 && (
        <div className="absolute bottom-10 inset-x-0 bg-stone-950/95 border-t border-stone-900 px-6 py-2.5 flex flex-col gap-1.5 z-10 select-none">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold">Page Annotations</span>
          </div>
          <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto pr-1">
            {pageHighlights.map((hl) => (
              <div key={hl.id} className="flex items-center justify-between bg-stone-900/45 border border-stone-850/40 px-2.5 py-1 rounded-lg text-right gap-3">
                <button 
                  onClick={() => onRemoveHighlight?.(hl.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Annotation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="flex-1">
                  <p className="text-[10px] font-serif text-amber-200/90 leading-relaxed" dir="rtl">{hl.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 h-10 px-6 bg-gradient-to-t from-stone-900/5 to-transparent flex items-center justify-center text-[10px] font-mono text-stone-400 select-none pointer-events-none z-10">
        <span className="font-bold text-stone-500 text-[11px] font-mono">- {pageNum} -</span>
      </div>
    </div>
  );
}


interface BookReaderProps {
  book: Book;
  file: BookFile;
  progress?: BookProgress;
  user: any;
  onUpdateProgress: (
    readPercent: number, 
    listenPercent: number, 
    currentPage?: number, 
    totalPages?: number
  ) => void;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

interface PageNote {
  id: string;
  page: number;
  text: string;
  createdAt: string;
}

export default function BookReader({
  book,
  file,
  progress,
  user,
  onUpdateProgress,
  onClose,
  triggerToast
}: BookReaderProps) {
  // Page states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(100);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Book Page-Flip Config States
  const [readerMode, setReaderMode] = useState<"flip" | "scroll">("flip");
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">("rtl");
  const [viewMode, setViewMode] = useState<"double" | "single">("double");
  const [flipDirection, setFlipDirection] = useState<number>(1);

  // Responsive window resize to adjust single vs spread page views
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setViewMode("single");
      } else {
        setViewMode("double");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PDF.js State Variables
  const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoadingError, setPdfLoadingError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const isProgrammaticScroll = useRef<boolean>(false);
  
  // Customization & Features
  const [readingTheme, setReadingTheme] = useState<"parchment" | "sepia" | "night" | "charcoal">("parchment");
  const [notes, setNotes] = useState<PageNote[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDebugTips, setShowDebugTips] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"controls" | "notes" | "audio" | "highlight">("controls");

  // Highlights and annotations
  interface SavedHighlight {
    id: string;
    pageNum: number;
    text: string;
    createdAt: string;
    sherId?: string;
  }
  const [highlights, setHighlights] = useState<SavedHighlight[]>([]);
  const [extractedPageLines, setExtractedPageLines] = useState<string[]>([]);
  const [extractorLoading, setExtractorLoading] = useState<boolean>(false);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  
  // Custom Sher composer state for highlight tab
  const [customSherUrdu, setCustomSherUrdu] = useState<string>("");
  const [customSherRoman, setCustomSherRoman] = useState<string>("");
  const [customSherEnglish, setCustomSherEnglish] = useState<string>("");
  const [customSherExplanation, setCustomSherExplanation] = useState<string>("");
  const [customSherPoet, setCustomSherPoet] = useState<string>("");

  // Audio Player states
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [audioIsPlaying, setAudioIsPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioLoading, setAudioLoading] = useState<boolean>(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Load and resolve book audio Url (with local IndexedDB support)
  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadBookAudio = async () => {
      if (!book.audioUrl) return;
      setAudioLoading(true);
      try {
        const isLocal = book.isLocalAudio || book.audioUrl.startsWith("local://");
        if (isLocal) {
          const id = book.audioUrl.replace("local://", "");
          const blob = await getMediaFile(id);
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setAudioSrc(objectUrl);
          }
        } else {
          if (active) {
            setAudioSrc(resolveBookUrl(book.audioUrl));
          }
        }
      } catch (err) {
        console.error("Failed to load book audio:", err);
      } finally {
        if (active) setAudioLoading(false);
      }
    };

    loadBookAudio();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [book.audioUrl, book.isLocalAudio]);

  const handleToggleAudioPlay = () => {
    if (!audioElRef.current) return;
    if (audioIsPlaying) {
      audioElRef.current.pause();
    } else {
      audioElRef.current.play().catch(err => console.error("Playback failed:", err));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioElRef.current) return;
    const curr = audioElRef.current.currentTime;
    setAudioCurrentTime(curr);

    // Sync progress percentage to the DB!
    if (audioDuration > 0) {
      const pct = Math.floor((curr / audioDuration) * 100);
      const lastSavedPct = progress?.listenProgress || 0;
      if (pct !== lastSavedPct && pct % 5 === 0) { // update progress in 5% steps to throttle saves
        onUpdateProgress(progress?.readProgress || 0, pct, currentPage, totalPages);
      }
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (!audioElRef.current) return;
    setAudioDuration(audioElRef.current.duration);
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElRef.current) return;
    const targetTime = parseFloat(e.target.value);
    audioElRef.current.currentTime = targetTime;
    setAudioCurrentTime(targetTime);
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Load progress initially
  useEffect(() => {
    if (progress) {
      if (progress.currentPage) {
        setCurrentPage(progress.currentPage);
      }
      if (progress.totalPages) {
        setTotalPages(progress.totalPages);
      }
    }
  }, [progress]);

  // Load and resolve raw document blob first
  useEffect(() => {
    let active = true;
    const loadFile = async () => {
      setLoading(true);
      try {
        const fileId = file.url.replace("local://", "");
        
        const keysToTry = [
          fileId,
          file.id,
          `file_${book.id}_${file.id}`,
          `file_book_${book.id}_${file.id}`,
          `file_book_${book.id}_file_${file.id}`,
          `file_${book.id}_file_${file.id}`,
          `file_${file.id}`
        ];

        let blob = null;
        for (const key of keysToTry) {
          if (!key) continue;
          try {
            const result = await getMediaFile(key);
            if (result) {
              blob = result;
              console.log(`Successfully found cached PDF under IndexedDB key: "${key}"`);
              break;
            }
          } catch (err) {
            console.warn(`Fallback lookup failed for key "${key}":`, err);
          }
        }

        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          if (active) {
            setResolvedBlobUrl(blobUrl);
            setLoading(false);
          }
        } else if (file.isLocal) {
          triggerToast("Could not find the local cached document publication. ⚠️");
          setLoading(false);
        } else {
          // It is a remote file and was not found in the cache. Download it and cache it.
          const remoteUrl = resolveBookUrl(file.url);
          if (remoteUrl) {
            console.log(`Downloading and caching remote PDF from: ${remoteUrl}`);
            const response = await fetch(remoteUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const downloadedBlob = await response.blob();
            // Save in IndexedDB so it's fully available offline next time
            const cacheKey = `file_${book.id}_${file.id}`;
            await saveMediaFile(cacheKey, downloadedBlob);
            console.log(`Successfully cached remote PDF to IndexedDB under key: "${cacheKey}"`);

            const blobUrl = URL.createObjectURL(downloadedBlob);
            if (active) {
              setResolvedBlobUrl(blobUrl);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error("Error loading reader file:", err);
        triggerToast("Failed to load document: " + err.message);
        if (active) setLoading(false);
      }
    };

    loadFile();

    return () => {
      active = false;
      if (resolvedBlobUrl) {
        URL.revokeObjectURL(resolvedBlobUrl);
      }
    };
  }, [file]);

  // Load PDF.js CDN script dynamically
  useEffect(() => {
    const isPdfFile = file.type.toLowerCase() === "pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfFile) return;

    if ((window as any).pdfjsLib) {
      setPdfjsLoaded(true);
      return;
    }

    const existingScript = document.getElementById("pdfjs-cdn-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          setPdfjsLoaded(true);
        }
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-cdn-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      console.error("Failed to load PDFJS CDN script");
      setPdfLoadingError("Could not load high-performance PDF rendering library from CDN.");
    };
    document.body.appendChild(script);
  }, [file]);

  // Load PDF Document Structure
  useEffect(() => {
    const isPdfFile = file.type.toLowerCase() === "pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfFile) {
      const fileUrl = resolvedBlobUrl || resolveBookUrl(file.url);
      if (fileUrl) {
        setIframeSrc(`${fileUrl}#page=${currentPage}`);
      }
      return;
    }

    if (!pdfjsLoaded) return;
    const fileUrl = resolvedBlobUrl || resolveBookUrl(file.url);
    if (!fileUrl) return;

    let active = true;
    setLoading(true);

    const loadPdfDoc = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          withCredentials: false
        });
        const doc = await loadingTask.promise;
        if (active) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setPdfLoadingError(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("PDFjs document load failed:", err);
        if (active) {
          setPdfLoadingError(err.message || "Failed to parse PDF document structure.");
          setIframeSrc(`${resolvedBlobUrl || resolveBookUrl(file.url)}#page=${currentPage}`);
          setLoading(false);
        }
      }
    };

    loadPdfDoc();
    return () => {
      active = false;
    };
  }, [pdfjsLoaded, resolvedBlobUrl, file]);

  // Load saved notes for this book
  useEffect(() => {
    const savedNotesKey = `zauq_notes_${book.id}`;
    const stored = localStorage.getItem(savedNotesKey);
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse book notes:", e);
      }
    }
  }, [book.id]);

  // Load saved highlights for this book
  useEffect(() => {
    const savedHlsKey = `zauq_highlights_${book.id}`;
    const stored = localStorage.getItem(savedHlsKey);
    if (stored) {
      try {
        setHighlights(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse book highlights:", e);
      }
    }
  }, [book.id]);

  // Load extracted lines for the current page when activeTab is "highlight" or currentPage changes
  useEffect(() => {
    if (activeTab !== "highlight" || !pdfDoc) return;
    
    let active = true;
    const fetchPageText = async () => {
      setExtractorLoading(true);
      setExtractedPageLines([]);
      setSelectedLines([]);
      setCustomSherUrdu("");
      
      try {
        const page = await pdfDoc.getPage(currentPage);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        if (!items || items.length === 0) {
          if (active) {
            setExtractedPageLines([]);
            setExtractorLoading(false);
          }
          return;
        }

        // Group items into lines based on y-coordinate tolerance (approx 8px)
        const tolerance = 8;
        const linesMap: { y: number; items: any[] }[] = [];

        items.forEach((item) => {
          if (!item.str || !item.str.trim()) return;
          const y = item.transform[5];
          const group = linesMap.find((g) => Math.abs(g.y - y) <= tolerance);
          if (group) {
            group.items.push(item);
          } else {
            linesMap.push({ y, items: [item] });
          }
        });

        // Sort lines from top to bottom (larger y coordinate is higher up in standard PDF space)
        linesMap.sort((a, b) => b.y - a.y);

        // Sort items left-to-right within each line (smaller x coordinate first)
        const lines = linesMap.map((line) => {
          line.items.sort((a, b) => a.transform[4] - b.transform[4]);
          return line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
        }).filter(line => line.length > 0);

        if (active) {
          setExtractedPageLines(lines);
          setCustomSherPoet(book.publisher || book.title || "Classical Poet");
        }
      } catch (err) {
        console.error("Failed to extract page text content:", err);
      } finally {
        if (active) {
          setExtractorLoading(false);
        }
      }
    };

    fetchPageText();
    return () => {
      active = false;
    };
  }, [currentPage, pdfDoc, activeTab]);

  const handleToggleLineSelection = (line: string) => {
    let newSelected: string[];
    if (selectedLines.includes(line)) {
      newSelected = selectedLines.filter(l => l !== line);
    } else {
      newSelected = [...selectedLines, line];
    }
    setSelectedLines(newSelected);
    // Automatically set Urdu script input box, separating multiple selected lines by newline
    setCustomSherUrdu(newSelected.join("\n"));
  };

  const handleSaveHighlightAsSher = async () => {
    if (!customSherUrdu.trim()) {
      triggerToast("Please select at least one line or write some text. ⚠️");
      return;
    }

    const sherId = `sher_${Date.now()}`;
    const cleanPoet = customSherPoet.trim() || book.publisher || "Classical Poet";
    
    // We must comply 100% with firestore.rules validation!
    // Required fields: id, urdu, roman, english, poet, userId, createdAt
    const newSher: Sher = {
      id: sherId,
      urdu: customSherUrdu.trim(),
      roman: customSherRoman.trim(), // Send "" if empty to be valid string
      english: customSherEnglish.trim(), // Send "" if empty to be valid string
      poet: cleanPoet,
      explanation: customSherExplanation.trim(), // Optional but validated if exists
      isUserAdded: true,
    };

    if (user) {
      const collectionPath = `users/${user.uid}/saved_shers`;
      try {
        await setDoc(doc(db, collectionPath, sherId), {
          id: newSher.id,
          urdu: newSher.urdu,
          roman: newSher.roman,
          english: newSher.english,
          poet: newSher.poet,
          explanation: newSher.explanation || "",
          isUserAdded: true,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        
        triggerToast("Sher successfully added to Mera Deewan! ☁️✨");
      } catch (err: any) {
        console.error("Firestore save custom sher error:", err);
        // Fallback save locally
        saveSherLocally(newSher);
      }
    } else {
      saveSherLocally(newSher);
    }

    // Add to local highlights for visual indicator and fast lookups in Book
    const newHighlight: SavedHighlight = {
      id: `hl_${Date.now()}`,
      pageNum: currentPage,
      text: newSher.urdu,
      createdAt: new Date().toISOString(),
      sherId: sherId
    };

    const updatedHls = [...highlights, newHighlight];
    setHighlights(updatedHls);
    localStorage.setItem(`zauq_highlights_${book.id}`, JSON.stringify(updatedHls));

    // Reset selection and inputs
    setSelectedLines([]);
    setCustomSherUrdu("");
    setCustomSherRoman("");
    setCustomSherEnglish("");
    setCustomSherExplanation("");
  };

  const saveSherLocally = (sher: Sher) => {
    try {
      const localShersRaw = localStorage.getItem("zauq_saved_shers");
      const localShers: Sher[] = localShersRaw ? JSON.parse(localShersRaw) : [];
      const updated = [sher, ...localShers];
      localStorage.setItem("zauq_saved_shers", JSON.stringify(updated));
      window.dispatchEvent(new Event("zauq_saved_shers_updated"));
      triggerToast("Sher successfully saved to local Deewan! 📖✨");
    } catch (e) {
      console.error("Local storage save error:", e);
      triggerToast("Failed to save Sher to local storage.");
    }
  };

  const handleRemoveHighlight = (hlId: string) => {
    const updatedHls = highlights.filter(h => h.id !== hlId);
    setHighlights(updatedHls);
    localStorage.setItem(`zauq_highlights_${book.id}`, JSON.stringify(updatedHls));
    triggerToast("Highlight removed.");
  };

  // Sync iframe source when page changes (Supports fallback for PDF files when high-fidelity PDF.js rendering fails)
  useEffect(() => {
    const isPdfFile = file.type.toLowerCase() === "pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdfFile && pdfDoc) return;

    const fileUrl = resolvedBlobUrl || resolveBookUrl(file.url);
    if (fileUrl) {
      const timer = setTimeout(() => {
        setIframeSrc(`${fileUrl}#page=${currentPage}`);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentPage, resolvedBlobUrl, file, pdfDoc]);

  // Handle keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return; // Don't intercept while typing
      }
      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const handleScrollToPage = (pageNum: number) => {
    if (readerMode === "flip") return;
    isProgrammaticScroll.current = true;
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1000);
  };

  const handlePrevPage = () => {
    const step = (readerMode === "flip" && viewMode === "double") ? 2 : 1;
    if (currentPage > 1) {
      setFlipDirection(-1);
      const newPage = Math.max(1, currentPage - step);
      setCurrentPage(newPage);
      savePageProgress(newPage, totalPages);
      handleScrollToPage(newPage);
    }
  };

  const handleNextPage = () => {
    const step = (readerMode === "flip" && viewMode === "double") ? 2 : 1;
    if (currentPage < totalPages) {
      setFlipDirection(1);
      const newPage = Math.min(totalPages, currentPage + step);
      setCurrentPage(newPage);
      savePageProgress(newPage, totalPages);
      handleScrollToPage(newPage);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      const clamped = Math.min(totalPages, Math.max(1, val));
      setFlipDirection(clamped > currentPage ? 1 : -1);
      setCurrentPage(clamped);
      savePageProgress(clamped, totalPages);
      handleScrollToPage(clamped);
    }
  };

  const handleTotalPagesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setTotalPages(val);
      // Recalculate percent completion
      savePageProgress(currentPage, val);
    }
  };

  const savePageProgress = (page: number, total: number) => {
    // Calculate percentage read progress (ensure a minimum of 1% if they started reading)
    const readPercent = Math.round((page / total) * 100);
    const currentListen = progress?.listenProgress || 0;
    onUpdateProgress(readPercent, currentListen, page, total);
  };

  // Automatically scroll to active page on document load
  useEffect(() => {
    if (pdfDoc && totalPages > 0) {
      const timer = setTimeout(() => {
        handleScrollToPage(currentPage);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [pdfDoc]);

  // Notes helper functions
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: PageNote = {
      id: "note_" + Date.now(),
      page: currentPage,
      text: newNoteText.trim(),
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`zauq_notes_${book.id}`, JSON.stringify(updatedNotes));
    setNewNoteText("");
    triggerToast(`Added bookmark note for Page ${currentPage}! 📝`);
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`zauq_notes_${book.id}`, JSON.stringify(updatedNotes));
    triggerToast("Note deleted.");
  };

  const handleJumpToPage = (page: number) => {
    const clamped = Math.min(totalPages, Math.max(1, page));
    setFlipDirection(clamped > currentPage ? 1 : -1);
    setCurrentPage(clamped);
    savePageProgress(clamped, totalPages);
    handleScrollToPage(clamped);
    triggerToast(`Jumped to Page ${clamped} from note.`);
  };

  const handleDownloadOriginal = () => {
    const fileUrl = resolvedBlobUrl || file.url;
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("Downloading original document... 📥");
    }
  };

  // Themes color mapping
  const themeClasses = {
    parchment: {
      bg: "bg-[#faf6eb]",
      sidebar: "bg-[#f4ebd0] border-[#e8d7a7]",
      text: "text-stone-900",
      accent: "text-amber-800",
      accentBg: "bg-amber-100 border-amber-200",
      button: "bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 border-amber-900/10",
      card: "bg-[#fdfbf7] border-[#eedfaf]"
    },
    sepia: {
      bg: "bg-[#f4ecd8]",
      sidebar: "bg-[#ebdcb9] border-[#dfcaa1]",
      text: "text-amber-950",
      accent: "text-amber-900",
      accentBg: "bg-amber-500/10 border-amber-500/20",
      button: "bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 border-amber-950/20",
      card: "bg-[#faf5e6] border-[#e4cca3]"
    },
    night: {
      bg: "bg-[#0b0c10]",
      sidebar: "bg-[#1f2833] border-[#2c3540]",
      text: "text-stone-200",
      accent: "text-amber-400",
      accentBg: "bg-amber-400/5 border-amber-400/15",
      button: "bg-stone-850 hover:bg-stone-800 text-stone-200 border-stone-800",
      card: "bg-[#121c24] border-[#202c38]"
    },
    charcoal: {
      bg: "bg-[#18181b]",
      sidebar: "bg-[#27272a] border-[#3f3f46]",
      text: "text-stone-100",
      accent: "text-amber-400",
      accentBg: "bg-amber-400/10 border-amber-400/20",
      button: "bg-stone-800 hover:bg-stone-750 text-stone-100 border-stone-700",
      card: "bg-[#202024] border-[#333338]"
    }
  };

  const currentTheme = themeClasses[readingTheme];

  // Animation variants for realistic page turns
  const spreadVariants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 30 : -30,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1],
      }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -30 : 30,
      opacity: 0,
      scale: 0.96,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1],
      }
    })
  };

  const pageVariants = {
    enter: (dir: number) => ({
      rotateY: dir > 0 ? 45 : -45,
      opacity: 0,
      x: dir > 0 ? 150 : -150,
      scale: 0.95,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1],
      }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -45 : 45,
      opacity: 0,
      x: dir > 0 ? -150 : 150,
      scale: 0.95,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1],
      }
    })
  };

  const renderPageThickness = (side: "left" | "right") => {
    const isRtl = readingDirection === "rtl";
    const pagesBefore = isRtl ? totalPages - currentPage : currentPage;
    const pagesAfter = isRtl ? currentPage : totalPages - currentPage;
    const count = side === "left" 
      ? Math.min(6, Math.max(1, Math.round(pagesBefore / 15))) 
      : Math.min(6, Math.max(1, Math.round(pagesAfter / 15)));
    
    return (
      <div className={`absolute top-2 bottom-2 ${side === "left" ? "-left-[6px]" : "-right-[6px]"} flex flex-row pointer-events-none z-0`}>
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i} 
            className="w-[1px] h-full bg-stone-400/25 border-r border-stone-900/10" 
            style={{
              transform: `translateX(${side === "left" ? -i * 1.5 : i * 1.5}px)`,
              opacity: 1 - (i * 0.15),
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full h-full md:max-w-7xl md:h-[95vh] rounded-none md:rounded-3xl border border-stone-850 shadow-2xl overflow-hidden flex flex-col bg-stone-950"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-900 bg-stone-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 font-bold block">
                Zauq Adab Reader • {file.type.toUpperCase()} Mode
              </span>
              <h2 className="text-sm font-serif font-bold text-stone-100 truncate mt-0.5">
                {book.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme selector */}
            <div className="flex items-center bg-stone-900/60 p-1 rounded-xl border border-stone-850">
              {(["parchment", "sepia", "night", "charcoal"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setReadingTheme(t)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono capitalize transition-all ${
                    readingTheme === t 
                      ? "bg-amber-500 text-stone-950 font-bold shadow-md" 
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                  title={`${t} Theme`}
                >
                  {t[0]}
                </button>
              ))}
            </div>

            <a
              href={resolvedBlobUrl || file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-stone-900 border border-stone-850 hover:bg-stone-850 hover:border-stone-800 text-stone-400 hover:text-stone-200 transition-all flex items-center justify-center"
              title="Open Document in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={handleDownloadOriginal}
              className="p-2.5 rounded-xl bg-stone-900 border border-stone-850 hover:bg-stone-850 hover:border-stone-800 text-stone-400 hover:text-stone-200 transition-all"
              title="Download Original Document"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-stone-900 border border-stone-850 hover:bg-rose-950/30 hover:border-rose-900 hover:text-rose-400 text-stone-400 transition-all cursor-pointer"
              title="Close Reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Main Reading Canvas (Left/Center Pane) */}
          <div className={`flex-1 flex flex-col items-stretch relative p-3 md:p-6 transition-colors duration-500 ${currentTheme.bg} overflow-hidden`}>
            
            {/* Floating Reader Toolbar */}
            <div className="mx-auto bg-stone-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-stone-850 shadow-lg flex flex-wrap items-center justify-center gap-4 z-10 text-xs text-stone-300 font-mono select-none">
              <div className="flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-xl border border-stone-800">
                <span className="text-[9px] text-stone-500 mr-1 uppercase font-bold">Mode:</span>
                <button
                  onClick={() => setReaderMode("flip")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    readerMode === "flip" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  3D Flip
                </button>
                <button
                  onClick={() => setReaderMode("scroll")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    readerMode === "scroll" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Scroll
                </button>
              </div>

              {readerMode === "flip" && (
                <>
                  {/* View mode selector (Double/Single) */}
                  <div className="hidden sm:flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-xl border border-stone-800">
                    <span className="text-[9px] text-stone-500 mr-1 uppercase font-bold">Layout:</span>
                    <button
                      onClick={() => setViewMode("double")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        viewMode === "double" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Spread
                    </button>
                    <button
                      onClick={() => setViewMode("single")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        viewMode === "single" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Single
                    </button>
                  </div>

                  {/* Reading direction selector (RTL/LTR) */}
                  <div className="flex items-center gap-1 bg-stone-900/90 px-2 py-1 rounded-xl border border-stone-800">
                    <span className="text-[9px] text-stone-500 mr-1 uppercase font-bold">Flow:</span>
                    <button
                      onClick={() => setReadingDirection("rtl")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        readingDirection === "rtl" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                      }`}
                      title="Right-to-Left (Traditional Urdu script books)"
                    >
                      RTL (Urdu)
                    </button>
                    <button
                      onClick={() => setReadingDirection("ltr")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        readingDirection === "ltr" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                      }`}
                      title="Left-to-Right (Standard English/Western layout)"
                    >
                      LTR
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* High fidelity Zoom controls */}
            <div className="absolute top-4 right-4 bg-stone-950/85 backdrop-blur-md p-1 rounded-xl border border-stone-850 flex items-center gap-1 shadow-lg z-10">
              <button
                onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.15))}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-all text-xs font-bold font-mono"
                title="Zoom Out"
              >
                A-
              </button>
              <span className="text-[10px] font-mono text-stone-400 px-1 select-none min-w-[40px] text-center font-mono">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale(Math.min(2.5, zoomScale + 0.15))}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-all text-xs font-bold font-mono"
                title="Zoom In"
              >
                A+
              </button>
              <button
                onClick={() => setZoomScale(1.0)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-all text-[10px] font-mono font-medium px-1.5 font-mono"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 w-full flex flex-col gap-6 p-2 md:p-4 scroll-smooth min-h-[250px]">
              {loading ? (
                <div className="my-auto flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <span className="text-xs font-mono text-stone-500 uppercase tracking-widest font-mono">Opening literary document...</span>
                </div>
              ) : readerMode === "flip" && pdfDoc ? (
                /* Real 3D Book Page Flip Reader */
                <div className="flex-1 flex flex-col justify-center items-center relative py-4 px-1 md:px-6 overflow-hidden select-none">
                  
                  <div className="relative w-full max-w-5xl flex items-center justify-center p-2">
                    
                    {/* Outer Book Frame Wrapper with Perspective */}
                    <div 
                      className="relative w-full flex flex-row items-center justify-center bg-stone-900/5 rounded-3xl p-1.5 shadow-inner border border-stone-800/10"
                      style={{ perspective: "1500px" }}
                    >
                      
                      {/* Animated Pages Spread Container */}
                      <motion.div
                        key={currentPage}
                        custom={flipDirection}
                        variants={viewMode === "double" ? spreadVariants : pageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, info) => {
                          const threshold = 50;
                          if (info.offset.x < -threshold) {
                            handleNextPage();
                          } else if (info.offset.x > threshold) {
                            handlePrevPage();
                          }
                        }}
                        className={`w-full flex ${
                          viewMode === "double" ? "flex-row" : "flex-col items-center"
                        } justify-center relative bg-[#faf6eb]/5 rounded-2xl shadow-2xl p-2 md:p-3 gap-3 md:gap-5`}
                      >
                        
                        {/* Left Page stack depth indicator */}
                        {viewMode === "double" && renderPageThickness("left")}
                        
                        {/* Left Page Zone */}
                        {viewMode === "double" ? (
                          <>
                            {/* Left page content */}
                            {readingDirection === "rtl" ? (
                              /* RTL Left Page is currentPage + 1 */
                              currentPage + 1 <= totalPages ? (
                                <div className="flex-1 max-w-[48%]">
                                  <PDFPageRenderer
                                    pdfDoc={pdfDoc}
                                    pageNum={currentPage + 1}
                                    scale={zoomScale * 0.82}
                                    theme={currentTheme}
                                    pageHighlights={highlights.filter((h) => h.pageNum === currentPage + 1)}
                                    onRemoveHighlight={handleRemoveHighlight}
                                    onPageVisible={(num) => {}}
                                    immediate={true}
                                    isDoubled={true}
                                  />
                                </div>
                              ) : (
                                /* Placeholder blank back-cover */
                                <div className={`flex-1 max-w-[48%] aspect-[1/1.414] rounded-2xl border ${currentTheme.card} shadow-xl flex flex-col items-center justify-center p-6 bg-stone-900/10 border-dashed opacity-40 select-none min-h-[280px]`}>
                                  <Sparkles className="w-8 h-8 text-amber-500/20 mb-2" />
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">End of Volume</span>
                                </div>
                              )
                            ) : (
                              /* LTR Left Page is currentPage */
                              <div className="flex-1 max-w-[48%]">
                                <PDFPageRenderer
                                  pdfDoc={pdfDoc}
                                  pageNum={currentPage}
                                  scale={zoomScale * 0.82}
                                  theme={currentTheme}
                                  pageHighlights={highlights.filter((h) => h.pageNum === currentPage)}
                                  onRemoveHighlight={handleRemoveHighlight}
                                  onPageVisible={(num) => {}}
                                  immediate={true}
                                  isDoubled={true}
                                />
                              </div>
                            )}

                            {/* Center Spine Crease shadow line */}
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[4px] bg-gradient-to-r from-stone-950/30 via-stone-950/60 to-stone-950/30 pointer-events-none z-10 shadow-inner" />

                            {/* Right Page Zone */}
                            {readingDirection === "rtl" ? (
                              /* RTL Right Page is currentPage */
                              <div className="flex-1 max-w-[48%]">
                                <PDFPageRenderer
                                  pdfDoc={pdfDoc}
                                  pageNum={currentPage}
                                  scale={zoomScale * 0.82}
                                  theme={currentTheme}
                                  pageHighlights={highlights.filter((h) => h.pageNum === currentPage)}
                                  onRemoveHighlight={handleRemoveHighlight}
                                  onPageVisible={(num) => {}}
                                  immediate={true}
                                  isDoubled={true}
                                />
                              </div>
                            ) : (
                              /* LTR Right Page is currentPage + 1 */
                              currentPage + 1 <= totalPages ? (
                                <div className="flex-1 max-w-[48%]">
                                  <PDFPageRenderer
                                    pdfDoc={pdfDoc}
                                    pageNum={currentPage + 1}
                                    scale={zoomScale * 0.82}
                                    theme={currentTheme}
                                    pageHighlights={highlights.filter((h) => h.pageNum === currentPage + 1)}
                                    onRemoveHighlight={handleRemoveHighlight}
                                    onPageVisible={(num) => {}}
                                    immediate={true}
                                    isDoubled={true}
                                  />
                                </div>
                              ) : (
                                /* Placeholder blank back-cover */
                                <div className={`flex-1 max-w-[48%] aspect-[1/1.414] rounded-2xl border ${currentTheme.card} shadow-xl flex flex-col items-center justify-center p-6 bg-stone-900/10 border-dashed opacity-40 select-none min-h-[280px]`}>
                                  <Sparkles className="w-8 h-8 text-amber-500/20 mb-2" />
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">End of Volume</span>
                                </div>
                              )
                            )}
                          </>
                        ) : (
                          /* Single Page Zone (always on mobile or if toggled) */
                          <div className="w-full max-w-xl">
                            <PDFPageRenderer
                              pdfDoc={pdfDoc}
                              pageNum={currentPage}
                              scale={zoomScale * 0.95}
                              theme={currentTheme}
                              pageHighlights={highlights.filter((h) => h.pageNum === currentPage)}
                              onRemoveHighlight={handleRemoveHighlight}
                              onPageVisible={(num) => {}}
                              immediate={true}
                            />
                          </div>
                        )}

                        {/* Right Page stack depth indicator */}
                        {viewMode === "double" && renderPageThickness("right")}

                      </motion.div>

                    </div>

                  </div>

                  {/* Tactile Side Overlay Page-Flip Click Zones for easy clicking */}
                  <div className="absolute inset-y-0 left-0 w-12 md:w-20 bg-gradient-to-r from-stone-950/5 to-transparent flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1}
                      className="w-10 h-10 rounded-full bg-stone-950/85 border border-stone-800 flex items-center justify-center text-amber-500 shadow-xl pointer-events-auto hover:bg-stone-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 w-12 md:w-20 bg-gradient-to-l from-stone-950/5 to-transparent flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      className="w-10 h-10 rounded-full bg-stone-950/85 border border-stone-800 flex items-center justify-center text-amber-500 shadow-xl pointer-events-auto hover:bg-stone-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              ) : (
                /* Scrolling continuous page view */
                <div className="w-full space-y-6 pt-10">
                  {pdfDoc ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PDFPageRenderer
                        key={pageNum}
                        pdfDoc={pdfDoc}
                        pageNum={pageNum}
                        scale={zoomScale}
                        theme={currentTheme}
                        pageHighlights={highlights.filter((h) => h.pageNum === pageNum)}
                        onRemoveHighlight={handleRemoveHighlight}
                        onPageVisible={(num) => {
                          if (currentPage !== num && !isProgrammaticScroll.current) {
                            setCurrentPage(num);
                            savePageProgress(num, totalPages);
                          }
                        }}
                      />
                    ))
                  ) : iframeSrc ? (
                    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-stone-300/10 shadow-lg flex flex-col bg-white">
                      {pdfLoadingError && (
                        <div className="bg-amber-950 text-amber-400 border-b border-amber-900/50 px-4 py-2 flex items-center justify-between text-xs select-none">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
                            <span className="font-sans">High-performance PDF engine bypassed ({pdfLoadingError}). Displaying standard fallback viewer instead.</span>
                          </div>
                          <button 
                            onClick={() => setPdfLoadingError(null)}
                            className="text-[10px] font-mono text-stone-400 hover:text-stone-200 cursor-pointer underline px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-850"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      <iframe
                        src={iframeSrc}
                        className="w-full h-full rounded-2xl flex-1 bg-white min-h-[500px]"
                        title={book.title}
                        allow="autoplay"
                      />
                    </div>
                  ) : pdfLoadingError ? (
                    <div className="my-auto flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-2xl border-stone-400/20 max-w-sm mx-auto">
                      <HelpCircle className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                      <p className="text-xs font-serif text-stone-400 mb-4">
                        PDF.js was unable to render the document structure directly. 
                      </p>
                      <p className="text-[11px] font-mono text-rose-400/80 mb-4 bg-rose-950/20 p-2 rounded border border-rose-900/20 max-w-xs break-words font-mono">
                        {pdfLoadingError}
                      </p>
                      <button
                        onClick={() => {
                          setPdfLoadingError(null);
                          setIframeSrc(`${resolvedBlobUrl || resolveBookUrl(file.url)}#page=${currentPage}`);
                        }}
                        className="px-4 py-2 bg-amber-500 text-stone-950 text-xs font-mono font-bold rounded-xl hover:bg-amber-400 cursor-pointer font-mono"
                      >
                        Use standard view fallback
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto text-center p-6 border border-dashed rounded-2xl border-stone-400/20 max-w-sm mx-auto">
                      <HelpCircle className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                      <p className="text-xs font-serif text-stone-400">
                        Could not load document file source. Ensure your browser allows viewing PDFs or check if the source file is still active.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PDF URL Path & Connection Diagnostics */}
            <div className="mt-4 bg-stone-950/90 backdrop-blur-md p-4 rounded-2xl border border-stone-850 flex flex-col gap-3 shadow-xl text-left z-10">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold block">
                      Active PDF URL / Source Path Diagnostics
                    </span>
                    <span className="text-xs font-mono text-stone-300 block truncate bg-stone-900/80 px-2 py-1 rounded border border-stone-800/80 mt-1 select-all" title="Double click to select URL">
                      {resolvedBlobUrl || file.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                  <button
                    onClick={() => {
                      const url = resolvedBlobUrl || file.url;
                      navigator.clipboard.writeText(url);
                      triggerToast("PDF source URL copied to clipboard! 📋");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-mono text-stone-300 border border-stone-800 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Copy direct file path"
                  >
                    <span>Copy URL</span>
                  </button>
                  <a
                    href={resolvedBlobUrl || file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-mono text-stone-950 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Open PDF directly in your browser tab to test or allow viewing"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Browser Tab</span>
                  </a>
                  <button
                    onClick={() => setShowDebugTips(!showDebugTips)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
                      showDebugTips 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                        : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-300"
                    }`}
                  >
                    <span>Troubleshoot Tips</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting panel (collapsible) */}
              {showDebugTips && (
                <div className="mt-2 p-3.5 bg-stone-900/40 rounded-xl border border-stone-850 text-stone-400 space-y-2 text-[11px] font-serif leading-relaxed max-h-48 overflow-y-auto">
                  <h4 className="font-mono text-[9px] uppercase tracking-wider text-amber-500 font-bold mb-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Common Browser PDF Issues & How to Resolve:</span>
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong className="text-stone-300 font-mono text-[10px]">Embedded Frame Blocked (Blank Screen):</strong> Some browsers or security extensions block embedding external PDFs inside an iframe. Click the <strong className="text-amber-500 font-mono text-[10px]">"Open in Browser Tab"</strong> button above to load it directly.
                    </li>
                    <li>
                      <strong className="text-stone-300 font-mono text-[10px]">Google Drive Links:</strong> Ensure the sharing link is configured with a public preview link layout: <code className="bg-stone-950 px-1 py-0.5 rounded font-mono text-[9px]">https://drive.google.com/file/d/YOUR_FILE_ID/preview</code> (instead of `/view` or `/edit`).
                    </li>
                    <li>
                      <strong className="text-stone-300 font-mono text-[10px]">HTTPS Security Constraint:</strong> If this app is running on HTTPS, browsers block insecure HTTP (<code className="bg-stone-950 px-1 py-0.5 rounded font-mono text-[9px]">http://</code>) links as mixed-content. Ensure your remote document URL starts with <code className="bg-stone-950 px-1 py-0.5 rounded font-mono text-[9px]">https://</code>.
                    </li>
                    <li>
                      <strong className="text-stone-300 font-mono text-[10px]">Chrome PDF Download Settings:</strong> If Chrome automatically downloads PDFs instead of opening them, embed files may fail. Go to Chrome <code className="bg-stone-950 px-1 py-0.5 rounded font-mono text-[9px]">Settings &gt; Privacy &gt; Site Settings &gt; Additional Content &gt; PDF Documents</code> and set to <code className="bg-stone-950 px-1 py-0.5 rounded font-mono text-[9px]">"Open PDFs in Chrome"</code>.
                    </li>
                    <li>
                      <strong className="text-stone-300 font-mono text-[10px]">Server-Side CORS Blocking:</strong> Remote servers may set `X-Frame-Options` or `Content-Security-Policy` headers to block external sites from framing their PDFs. In this case, upload the PDF directly using the **Zauq Admin Panel** to store it locally in IndexedDB!
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Reading Companion Side Control panel (Right Pane) */}
          <div className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l flex flex-col justify-between overflow-y-auto shrink-0 transition-colors duration-500 ${currentTheme.sidebar}`}>
            
            <div>
              {/* Tab Selector */}
              <div className="grid grid-cols-4 border-b border-stone-800/20 bg-stone-950/35 p-1 mx-4 mt-4 rounded-xl">
                <button
                  onClick={() => setActiveTab("controls")}
                  className={`py-2 px-0.5 text-center rounded-lg text-[9px] sm:text-[10px] font-mono uppercase tracking-tight sm:tracking-wider font-semibold transition-all ${
                    activeTab === "controls" 
                      ? "bg-amber-500 text-stone-950 font-bold" 
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Controls
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`py-2 px-0.5 text-center rounded-lg text-[9px] sm:text-[10px] font-mono uppercase tracking-tight sm:tracking-wider font-semibold transition-all ${
                    activeTab === "notes" 
                      ? "bg-amber-500 text-stone-950 font-bold" 
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Notes ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab("audio")}
                  className={`py-2 px-0.5 text-center rounded-lg text-[9px] sm:text-[10px] font-mono uppercase tracking-tight sm:tracking-wider font-semibold transition-all ${
                    activeTab === "audio" 
                      ? "bg-amber-500 text-stone-950 font-bold" 
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Audio
                </button>
                <button
                  onClick={() => setActiveTab("highlight")}
                  className={`py-2 px-0.5 text-center rounded-lg text-[9px] sm:text-[10px] font-mono uppercase tracking-tight sm:tracking-wider font-semibold transition-all ${
                    activeTab === "highlight" 
                      ? "bg-amber-500 text-stone-950 font-bold" 
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Highlights ({highlights.length})
                </button>
              </div>

              {/* COMPANION INTERACTIVE VIEWS */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {activeTab === "controls" && (
                    <motion.div
                      key="controls-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col gap-5"
                    >
                      {/* Active Book Info card */}
                      <div className={`p-4 rounded-2xl border transition-all ${currentTheme.card} shadow-sm`}>
                        <h3 className="text-xs font-serif font-bold tracking-tight text-amber-500 block">
                          Currently Studying
                        </h3>
                        <p className="text-sm font-serif font-bold mt-1">
                          {book.title}
                        </p>
                        {book.genre && (
                          <span className="text-[9px] font-mono uppercase tracking-widest bg-stone-950/50 text-stone-400 px-2 py-0.5 rounded border border-stone-800/10 mt-1.5 inline-block">
                            {book.genre}
                          </span>
                        )}
                        <p className="text-[11px] text-stone-500 font-serif mt-2.5 leading-relaxed">
                          {book.description || "Digital compilation curated exclusively for literary devotion."}
                        </p>
                      </div>

                      {/* Study Progress controls */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-stone-800/10 pb-1">
                          <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                            Flip Pages & Track Progress
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-600">
                            {Math.round((currentPage / totalPages) * 100)}% Read
                          </span>
                        </div>

                        {/* Pagination controls widget */}
                        <div className="flex items-center justify-between gap-3 bg-stone-950/45 p-3 rounded-2xl border border-stone-800/20">
                          <button
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border border-stone-800 transition-all ${
                              currentPage <= 1 
                                ? "opacity-30 cursor-not-allowed" 
                                : "bg-stone-900 hover:bg-stone-850 hover:border-amber-500/20 text-stone-200"
                            }`}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>

                          <div className="flex items-center gap-1.5 text-center">
                            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">PAGE</span>
                            <input
                              type="number"
                              min={1}
                              max={totalPages}
                              value={currentPage}
                              onChange={handlePageInputChange}
                              className="w-14 h-10 rounded-xl bg-stone-950 border border-stone-800 text-center font-mono font-bold text-sm text-amber-500 focus:outline-none focus:border-amber-500/50"
                            />
                            <span className="text-stone-500 font-mono text-xs">/</span>
                            <input
                              type="number"
                              min={1}
                              value={totalPages}
                              onChange={handleTotalPagesInputChange}
                              className="w-14 h-10 rounded-xl bg-stone-950 border border-stone-800 text-center font-mono font-bold text-sm text-stone-400 focus:outline-none focus:border-stone-800"
                              title="Click to edit total pages"
                            />
                          </div>

                          <button
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border border-stone-800 transition-all ${
                              currentPage >= totalPages 
                                ? "opacity-30 cursor-not-allowed" 
                                : "bg-stone-900 hover:bg-stone-850 hover:border-amber-500/20 text-stone-200"
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Reading Progress Bar Slider */}
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={1}
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setCurrentPage(val);
                              savePageProgress(val, totalPages);
                            }}
                            className="w-full accent-amber-500 bg-stone-950/60 rounded-lg cursor-pointer h-1.5 appearance-none border border-stone-800/10"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-stone-500 uppercase tracking-widest">
                            <span>Beginning</span>
                            <span>Page {currentPage} of {totalPages}</span>
                            <span>Complete</span>
                          </div>
                        </div>

                        {/* Auto-resume status alert */}
                        {progress?.currentPage && progress.currentPage > 1 && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono uppercase text-amber-600 font-bold block flex items-center gap-1">
                              <BookMarked className="w-3.5 h-3.5" />
                              <span>Resume Point Synced</span>
                            </span>
                            <p className="text-[11px] text-stone-500 font-serif leading-relaxed">
                              You previously read up to Page <span className="font-bold text-amber-500">{progress.currentPage}</span> on this device. The reader automatically loaded this point.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "notes" && (
                    <motion.div
                      key="notes-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800/10 pb-1">
                        <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                          Study Notebook & Bookmarks
                        </span>
                        <span className="text-[9px] font-mono bg-stone-950 text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                          PAGE {currentPage}
                        </span>
                      </div>

                      {/* Add Note Form */}
                      <div className="space-y-2.5">
                        <textarea
                          placeholder={`Write a study note, copy a beautiful couplet, or log review comments for Page ${currentPage}...`}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          className="w-full h-24 rounded-xl bg-stone-950/60 border border-stone-800 text-xs p-3 text-stone-200 focus:outline-none focus:border-amber-500/40 resize-none font-serif leading-relaxed"
                        />
                        <button
                          onClick={handleAddNote}
                          disabled={!newNoteText.trim()}
                          className={`w-full py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            newNoteText.trim() 
                              ? "bg-amber-500 hover:bg-amber-400 text-stone-950" 
                              : "bg-stone-900 border border-stone-850 text-stone-500 cursor-not-allowed"
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Note to Page {currentPage}</span>
                        </button>
                      </div>

                      {/* Notes list */}
                      <div className="space-y-3 mt-2 max-h-[220px] overflow-y-auto pr-1">
                        {notes.length === 0 ? (
                          <div className="text-center py-6 text-stone-500">
                            <Edit3 className="w-6 h-6 mx-auto text-stone-600 mb-1.5 opacity-60" />
                            <p className="text-[10px] font-mono uppercase tracking-wider">No study notes created yet</p>
                            <p className="text-[11px] font-serif text-stone-500 mt-1">Bookmark specific pages with notes to review classical verses later.</p>
                          </div>
                        ) : (
                          notes.map((note) => (
                            <div 
                              key={note.id}
                              className="p-3 bg-stone-950/30 border border-stone-850/60 hover:border-amber-500/20 rounded-xl flex flex-col justify-between gap-2.5 transition-all group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => handleJumpToPage(note.page)}
                                  className="text-[9px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/10 flex items-center gap-1"
                                >
                                  <Bookmark className="w-2.5 h-2.5 fill-amber-500" />
                                  <span>Page {note.page}</span>
                                </button>
                                <span className="text-[8px] font-mono text-stone-500">{note.createdAt}</span>
                              </div>
                              <p className="text-xs font-serif text-stone-300 leading-relaxed whitespace-pre-wrap">
                                {note.text}
                              </p>
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 rounded text-stone-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all"
                                  title="Delete Note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "audio" && (
                    <motion.div
                      key="audio-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800/10 pb-1">
                        <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                          Narrated Recitation Audio
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600">
                          {progress?.listenProgress || 0}% Audited
                        </span>
                      </div>

                      {audioLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2">
                          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                          <span className="text-[10px] font-mono text-stone-500">Preparing Recitation Audio...</span>
                        </div>
                      ) : audioSrc ? (
                        <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl flex flex-col gap-4">
                          <audio
                            ref={audioElRef}
                            src={audioSrc}
                            onPlay={() => setAudioIsPlaying(true)}
                            onPause={() => setAudioIsPlaying(false)}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onLoadedMetadata={handleAudioLoadedMetadata}
                            onEnded={() => setAudioIsPlaying(false)}
                          />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={handleToggleAudioPlay}
                                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer flex-shrink-0"
                              >
                                {audioIsPlaying ? (
                                  <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-500 font-bold block">
                                  Synchronized Audio
                                </span>
                                <span className="text-xs font-serif font-bold text-stone-200 block truncate max-w-[150px]">
                                  {book.title} Recitation
                                </span>
                              </div>
                            </div>

                            {audioIsPlaying && (
                              <div className="flex items-center gap-0.5 h-3 pr-1">
                                <span className="w-0.5 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
                                <span className="w-0.5 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_300ms] h-2/3" />
                                <span className="w-0.5 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_500ms] h-full" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            {/* Track Timeline slider */}
                            <input
                              type="range"
                              min={0}
                              max={audioDuration || 100}
                              value={audioCurrentTime}
                              onChange={handleAudioSeek}
                              className="w-full accent-emerald-500 bg-stone-950/60 rounded-lg cursor-pointer h-1 appearance-none"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-stone-400">
                              <span>{formatAudioTime(audioCurrentTime)}</span>
                              <span>{formatAudioTime(audioDuration)}</span>
                            </div>
                          </div>

                          {/* Quick manual progress overwrite slider */}
                          <div className="bg-stone-950/40 border border-stone-900 rounded-xl p-2.5 mt-1 space-y-1.5">
                            <span className="text-[8px] font-mono uppercase tracking-wider text-stone-500 block">
                              Manual Sync Override
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={progress?.listenProgress || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                onUpdateProgress(progress?.readProgress || 0, val, currentPage, totalPages);
                              }}
                              className="w-full accent-amber-500 bg-stone-900/60 rounded-lg cursor-pointer h-1 appearance-none"
                            />
                            <div className="flex justify-between text-[8px] font-mono text-stone-600">
                              <span>0%</span>
                              <span>Manual Progress Override</span>
                              <span>100%</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-stone-500 font-serif leading-relaxed">
                            Listen to narrated recitation in real-time as you read this edition. The reading timer will automatically audit and persist your progress.
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-stone-500 bg-stone-950/30 border border-stone-850/60 rounded-2xl">
                          <p className="text-[10px] font-mono uppercase tracking-wider">No Recitation Narrated Audio Available</p>
                          <p className="text-[11px] font-serif text-stone-500 mt-1.5 px-4 leading-relaxed">
                            This publication does not have a synchronized audio stream associated with it yet.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "highlight" && (
                    <motion.div
                      key="highlight-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col gap-5 text-stone-200"
                    >
                      {/* Highlight instructions card */}
                      <div className={`p-4 rounded-2xl border transition-all ${currentTheme.card} shadow-sm`}>
                        <h3 className="text-xs font-serif font-bold tracking-tight text-amber-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Sher Selector & Deewan Notebook</span>
                        </h3>
                        <p className="text-[11px] text-stone-500 font-serif mt-1.5 leading-relaxed">
                          Extract, highlight, and annotate poetry directly from this manuscript. Saved couplets are added as original entries inside your personal **Deewan Notebook**.
                        </p>
                      </div>

                      {/* PDF Text Line Extractor */}
                      {pdfDoc ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-stone-800/10 pb-1">
                            <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                              Extracted Page {currentPage} lines
                            </span>
                            {extractorLoading && (
                              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                            )}
                          </div>

                          {extractorLoading ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2">
                              <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Parsing Text...</span>
                            </div>
                          ) : extractedPageLines.length === 0 ? (
                            <div className="p-4 bg-stone-950/40 border border-dashed border-stone-850 rounded-2xl text-center">
                              <HelpCircle className="w-6 h-6 text-stone-500 mx-auto mb-1.5" />
                              <span className="text-[11px] font-serif text-stone-400">No selectable Urdu text parsed on this page.</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                              {extractedPageLines.map((line, idx) => {
                                const isSelected = selectedLines.includes(line);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleToggleLineSelection(line)}
                                    className={`w-full text-right p-2.5 rounded-xl border text-xs font-serif leading-relaxed transition-all flex items-center justify-between gap-3 ${
                                      isSelected 
                                        ? "bg-amber-500/10 border-amber-500 text-amber-400 font-medium" 
                                        : "bg-stone-900/40 border-stone-850/60 text-stone-300 hover:bg-stone-900/80 hover:border-stone-800"
                                    }`}
                                  >
                                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] font-sans font-bold transition-all ${
                                      isSelected ? "bg-amber-500 border-amber-500 text-stone-950" : "border-stone-700 text-transparent"
                                    }`}>
                                      ✓
                                    </span>
                                    <span className="flex-1 text-right select-none" dir="rtl">{line}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-stone-900/30 border border-stone-850/60 rounded-2xl">
                          <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold block mb-1.5">
                            Standard Frame Mode
                          </span>
                          <p className="text-[11px] font-serif text-stone-400 leading-relaxed">
                            Text extraction is only supported for PDF formats. However, you can write or copy-paste any verses manually below to save them directly to your Deewan.
                          </p>
                        </div>
                      )}

                      {/* Custom Sher Input / Preview Card */}
                      <div className="flex flex-col gap-3 bg-stone-950/45 p-4 rounded-2xl border border-stone-800/25">
                        <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                          Deewan Entry Composer
                        </span>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Poetry Verse (Urdu Script)</label>
                            <textarea
                              value={customSherUrdu}
                              onChange={(e) => setCustomSherUrdu(e.target.value)}
                              placeholder="Select lines above or type Urdu script..."
                              rows={2}
                              dir="rtl"
                              className="w-full rounded-xl bg-stone-900/90 border border-stone-800 p-2 text-right font-serif text-xs text-amber-500 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Transliteration (Roman Script)</label>
                            <input
                              type="text"
                              value={customSherRoman}
                              onChange={(e) => setCustomSherRoman(e.target.value)}
                              placeholder="Roman script transliteration..."
                              className="w-full rounded-xl bg-stone-900/90 border border-stone-800 p-2 text-xs font-serif text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">English Translation</label>
                            <input
                              type="text"
                              value={customSherEnglish}
                              onChange={(e) => setCustomSherEnglish(e.target.value)}
                              placeholder="English meaning translation..."
                              className="w-full rounded-xl bg-stone-900/90 border border-stone-800 p-2 text-xs font-serif text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Poet Name</label>
                              <input
                                type="text"
                                value={customSherPoet}
                                onChange={(e) => setCustomSherPoet(e.target.value)}
                                placeholder="Poet name..."
                                className="w-full rounded-xl bg-stone-900/90 border border-stone-800 p-2 text-xs font-serif text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-stone-500 uppercase tracking-widest block mb-1">Tashreeh / Explanation</label>
                              <input
                                type="text"
                                value={customSherExplanation}
                                onChange={(e) => setCustomSherExplanation(e.target.value)}
                                placeholder="Optional notes/commentary..."
                                className="w-full rounded-xl bg-stone-900/90 border border-stone-800 p-2 text-xs font-serif text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleSaveHighlightAsSher}
                            className="w-full py-2.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer font-mono uppercase tracking-widest"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save to Deewan Notebook</span>
                          </button>
                        </div>
                      </div>

                      {/* Saved book annotations list */}
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                          Saved Book Highlights ({highlights.length})
                        </span>

                        {highlights.length === 0 ? (
                          <div className="p-4 bg-stone-950/20 border border-stone-850/60 rounded-2xl text-center">
                            <p className="text-xs font-serif text-stone-500">No highlights recorded in this book yet.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {highlights.map((hl) => (
                              <div
                                key={hl.id}
                                className="p-3 bg-stone-900/50 border border-stone-850/60 rounded-2xl hover:border-stone-800 transition-all relative flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => handleScrollToPage(hl.pageNum)}
                                    className="text-[10px] font-mono font-bold text-amber-500 hover:text-amber-400 underline"
                                    title="Click to jump to this page"
                                  >
                                    Page {hl.pageNum}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveHighlight(hl.id)}
                                    className="text-stone-500 hover:text-rose-400 p-0.5 rounded transition-all"
                                    title="Delete annotation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <p className="text-xs font-serif text-stone-300 leading-relaxed text-right whitespace-pre-line pr-1" dir="rtl">
                                  {hl.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="p-5 border-t border-stone-800/10 bg-stone-950/20 text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 block">
                PUBLISHED BY
              </span>
              <span className="text-xs font-serif text-amber-700 font-bold block mt-0.5">
                {book.publisher || "Zauq Adab Publications"}
              </span>
              <p className="text-[9px] font-mono text-stone-500 mt-2">
                All saved bookmark progress and page study notes are persisted across devices securely.
              </p>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
