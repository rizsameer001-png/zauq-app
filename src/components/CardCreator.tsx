import React, { useState, useEffect, useRef } from "react";
import { Sliders, Sparkles, Copy, Palette, Eye, AlignCenter, Type as TypeIcon, Heart, Download, Check, FileText, X, AlertCircle } from "lucide-react";
import { Sher, CustomCardConfig } from "../types";
import { motion } from "motion/react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface CardCreatorProps {
  initialSher: Sher | null;
  onSaveComposition: (sher: Sher) => void;
  savedSherIds: string[];
}

const BACKGROUND_PRESETS = [
  { id: "charcoal", name: "Charcoal Royal", bg: "bg-gradient-to-br from-stone-900 via-stone-950 to-neutral-900", text: "text-amber-200/90", tag: "dark" },
  { id: "parchment", name: "Vintage Manuscript", bg: "bg-gradient-to-br from-stone-100 via-amber-50/50 to-orange-50/40", text: "text-stone-900", tag: "light" },
  { id: "teal", name: "Sufi Forest Teal", bg: "bg-gradient-to-br from-teal-950 via-stone-950 to-teal-900", text: "text-emerald-100/90", tag: "dark" },
  { id: "crimson", name: "Mughal Crimson", bg: "bg-gradient-to-br from-rose-950 via-stone-950 to-red-950", text: "text-amber-100/90", tag: "dark" },
  { id: "gold", name: "Imperial Amber", bg: "bg-gradient-to-br from-amber-950 via-stone-950 to-amber-900", text: "text-amber-100/90", tag: "dark" }
];

export default function CardCreator({ initialSher, onSaveComposition, savedSherIds }: CardCreatorProps) {
  const [urduText, setUrduText] = useState("");
  const [romanText, setRomanText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [poetText, setPoetText] = useState("");
  
  const [config, setConfig] = useState<CustomCardConfig>({
    backgroundType: "gradient",
    backgroundValue: "charcoal",
    textColor: "text-amber-200/90",
    fontSize: "lg",
    fontFamily: "nastaliq",
    borderStyle: "elegant",
    borderColor: "border-amber-500/20",
    opacity: 100
  });

  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSher) {
      setUrduText(initialSher.urdu || "");
      setRomanText(initialSher.roman || "");
      setEnglishText(initialSher.english || "");
      setPoetText(initialSher.poet || "");
      setIsSaved(savedSherIds.includes(initialSher.id));
    } else {
      // Default placeholder text
      setUrduText("لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے");
      setRomanText("Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale");
      setEnglishText("Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.");
      setPoetText("Mohammad Ibrahim Zauq");
      setIsSaved(false);
    }
  }, [initialSher]);

  const activePreset = BACKGROUND_PRESETS.find((p) => p.id === config.backgroundValue) || BACKGROUND_PRESETS[0];
  const isLightMode = activePreset.tag === "light";

  const handlePresetSelect = (id: string, textStyle: string) => {
    setConfig((prev) => ({
      ...prev,
      backgroundValue: id,
      textColor: textStyle,
      borderColor: id === "parchment" ? "border-amber-800/20" : "border-amber-500/20"
    }));
  };

  const handleCopyText = () => {
    const fullText = `${urduText}\n\n${romanText}\n\n"${englishText}"\n— ${poetText}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToDiary = () => {
    const compositionSher: Sher = {
      id: `custom-${Date.now()}`,
      urdu: urduText,
      roman: romanText,
      english: englishText,
      poet: poetText || "Unknown Poet",
      isUserAdded: true
    };
    onSaveComposition(compositionSher);
    setIsSaved(true);
  };

  const [isExporting, setIsExporting] = useState(false);
  const [exportedImgUrl, setExportedImgUrl] = useState<string | null>(null);
  const [exportedPdfUrl, setExportedPdfUrl] = useState<string | null>(null);
  const [exportModalType, setExportModalType] = useState<"png" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPNG = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      
      // Ensure all custom fonts are fully loaded before rendering the canvas
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 2,
        logging: true,
        windowWidth: 1200,
        windowHeight: 840,
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      if (!dataUrl || dataUrl === "data:,") {
        throw new Error("Failed to generate a valid PNG image blob from the canvas.");
      }
      
      const sanitizedPoet = (poetText || "custom").replace(/\s+/g, "_").toLowerCase();
      const fileName = `zauq_card_${sanitizedPoet}_${Date.now()}.png`;

      // Set state to show the manual fallback preview modal with direct download link
      setExportedImgUrl(dataUrl);
      setExportedPdfUrl(null);
      setExportModalType("png");

      // Attempt automatic download using high-trust click trigger
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Export PNG failed:", err);
      setExportError(err.message || "An unexpected error occurred during canvas rendering.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      setExportError(null);
      
      // Ensure all custom fonts are fully loaded before rendering the canvas
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale: 2,
        logging: true,
        windowWidth: 1200,
        windowHeight: 840,
      });
      
      const imgData = canvas.toDataURL("image/png");
      if (!imgData || imgData === "data:,") {
        throw new Error("Failed to generate valid image data for PDF compilation.");
      }

      // Create PDF in landscape orientation, using standard a4 dimensions
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
      
      // Calculate optimized sizing keeping the card's aspect ratio centered on A4 page
      const cardWidth = pageWidth - 40; // 20mm padding left & right
      const cardHeight = cardWidth * (canvas.height / canvas.width);
      
      const x = 20;
      const y = (pageHeight - cardHeight) / 2; // Perfectly centered vertically
      
      pdf.addImage(imgData, "PNG", x, y, cardWidth, cardHeight);
      
      const sanitizedPoet = (poetText || "custom").replace(/\s+/g, "_").toLowerCase();
      const pdfName = `zauq_card_${sanitizedPoet}_${Date.now()}.pdf`;

      // Compile PDF as a binary blob for the direct download action in the modal
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Show the visual preview modal with the compiled assets
      setExportedImgUrl(imgData); // Render PNG preview of the card in the modal
      setExportedPdfUrl(pdfUrl); // Direct binary blob URL for the manual button
      setExportModalType("pdf");

      // Attempt automatic download using native PDF helper
      try {
        pdf.save(pdfName);
      } catch (err) {
        console.error("Automatic PDF download blocked or failed:", err);
      }
    } catch (err: any) {
      console.error("Export PDF failed:", err);
      setExportError(err.message || "An unexpected error occurred during PDF compilation.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="zauq-card-creator">
      {/* Configuration Control Panel (Left) */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        {/* Editor Settings Card */}
        <div className="bg-stone-900/40 p-5 rounded-3xl border border-stone-900/80 backdrop-blur-md flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-800/60">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-sans font-semibold text-stone-100 uppercase tracking-wider">Zauq-e-Latafat (Designer)</h3>
          </div>

          {/* Textarea Inputs */}
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Urdu Calligraphy text</label>
              <textarea
                value={urduText}
                onChange={(e) => setUrduText(e.target.value)}
                placeholder="Urdu verses..."
                rows={2}
                className="w-full bg-stone-950 border border-stone-850 text-amber-200/90 text-center text-lg placeholder-stone-800 rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/30 transition-colors font-serif resize-none font-urdu"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Roman Transliteration</label>
              <input
                type="text"
                value={romanText}
                onChange={(e) => setRomanText(e.target.value)}
                placeholder="Roman Urdu phonetic spelling..."
                className="w-full bg-stone-950 border border-stone-850 text-stone-400 placeholder-stone-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30 transition-colors font-serif italic text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">English Translation</label>
                <input
                  type="text"
                  value={englishText}
                  onChange={(e) => setEnglishText(e.target.value)}
                  placeholder="Translation..."
                  className="w-full bg-stone-950 border border-stone-850 text-stone-300 placeholder-stone-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30 transition-colors font-serif"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1.5">Poet / Composer</label>
                <input
                  type="text"
                  value={poetText}
                  onChange={(e) => setPoetText(e.target.value)}
                  placeholder="e.g. Ibrahim Zauq..."
                  className="w-full bg-stone-950 border border-stone-850 text-stone-300 placeholder-stone-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/30 transition-colors font-sans"
                />
              </div>
            </div>
          </div>

          {/* Aesthetics Settings */}
          <div className="flex flex-col gap-4 pt-4 border-t border-stone-800/60">
            {/* Background Selector */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-2 flex items-center gap-1">
                <Palette className="w-3 h-3 text-amber-500" />
                <span>Background Backdrop</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id, preset.text)}
                    className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                      config.backgroundValue === preset.id
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-md shadow-amber-950/20"
                        : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography style Selector */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-2 flex items-center gap-1">
                <TypeIcon className="w-3 h-3 text-amber-500" />
                <span>Calligraphy Style</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "nastaliq", label: "Nastaliq" },
                  { id: "naskh", label: "Naskh" },
                  { id: "diwani", label: "Diwani" },
                  { id: "serif", label: "Editorial Serif" },
                  { id: "mono", label: "Tech Mono" },
                  { id: "sans", label: "Modern Sans" }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setConfig((p) => ({ ...p, fontFamily: f.id as any }))}
                    className={`py-1.5 px-2 rounded-lg text-center text-[10px] font-medium transition-all border leading-tight ${
                      config.fontFamily === f.id
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Borders style */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-2 flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-500" />
                <span>Ornamental Border</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "None" },
                  { id: "simple", label: "Simple" },
                  { id: "elegant", label: "Royal" },
                  { id: "classic-floral", label: "Floral" }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setConfig((p) => ({ ...p, borderStyle: b.id as any }))}
                    className={`py-1.5 rounded-lg text-center text-[10px] uppercase tracking-wider transition-all border ${
                      config.borderStyle === b.id
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-stone-950/60 border-transparent text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-4 border-t border-stone-800/60">
            <button
              onClick={handleCopyText}
              className="flex-1 py-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Card Text"}</span>
            </button>

            <button
              onClick={handleSaveToDiary}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                isSaved
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-amber-500/5 hover:bg-amber-500 border-amber-500/20 hover:border-transparent text-amber-400 hover:text-amber-950 shadow-md"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
              <span>{isSaved ? "Saved to Deewan" : "Save Composition"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-fidelity Card Canvas Preview (Right) */}
      <div className="xl:col-span-7 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Card Master Preview</span>
          </span>
          <div className="flex gap-3">
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="text-[10px] font-mono uppercase tracking-widest text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Download Card as PNG Image"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? "Saving..." : "Download PNG"}</span>
            </button>
            <span className="text-stone-700 text-xs">|</span>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="text-[10px] font-mono uppercase tracking-widest text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Download Card as PDF Document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isExporting ? "Saving..." : "Download PDF"}</span>
            </button>
          </div>
        </div>

        {/* The Actual Visual Card */}
        <div
          ref={previewRef}
          className={`aspect-[5/3.5] w-full max-w-2xl mx-auto rounded-3xl p-8 relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500 ${
            activePreset.bg
          }`}
        >
          {/* ROYAL ORNAMENTAL CORNERS FOR PARCHMENT / MANUSCRIPT BACKGROUNDS */}
          {config.borderStyle === "classic-floral" && (
            <>
              {/* Top Left corner SVG border */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-500/40 rounded-tl-xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500/60 rounded-full" />
              </div>
              {/* Top Right */}
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-500/40 rounded-tr-xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500/60 rounded-full" />
              </div>
              {/* Bottom Left */}
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-500/40 rounded-bl-xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500/60 rounded-full" />
              </div>
              {/* Bottom Right */}
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-500/40 rounded-br-xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-amber-500/60 rounded-full" />
              </div>
            </>
          )}

          {config.borderStyle === "elegant" && (
            <div className={`absolute inset-4 border-2 border-dashed ${isLightMode ? "border-amber-800/10" : "border-amber-500/15"} rounded-2xl pointer-events-none`} />
          )}

          {config.borderStyle === "simple" && (
            <div className={`absolute inset-4 border ${isLightMode ? "border-stone-900/10" : "border-amber-500/10"} rounded-2xl pointer-events-none`} />
          )}

          {/* Card watermark/Seal */}
          <div className={`absolute top-8 right-8 text-[9px] font-mono uppercase tracking-widest ${isLightMode ? "text-stone-900/10" : "text-amber-500/5"} select-none`}>
            ذوقِ لطافت
          </div>

          {/* Core Content Layout */}
          <div className="my-auto flex flex-col justify-center gap-6 h-full text-center relative z-10 px-4 md:px-10">
            {/* Poetry Verses */}
            <div>
              <p
                className={`text-2xl md:text-3xl leading-loose tracking-wide whitespace-pre-line dir-rtl select-text ${
                  config.textColor
                } ${
                  config.fontFamily === "serif" ? "font-serif" :
                  config.fontFamily === "nastaliq" ? "font-nastaliq font-semibold" :
                  config.fontFamily === "naskh" ? "font-naskh font-medium" :
                  config.fontFamily === "diwani" ? "font-diwani" :
                  config.fontFamily === "sans" ? "font-sans" :
                  "font-mono"
                }`}
              >
                {urduText || "لائی حیات آئے..."}
              </p>
            </div>

            {/* Roman Transcription */}
            {romanText && (
              <p className={`text-[11px] leading-relaxed italic ${isLightMode ? "text-stone-600" : "text-stone-400"}`}>
                {romanText}
              </p>
            )}

            {/* English translation */}
            {englishText && (
              <p className={`text-xs max-w-md mx-auto leading-relaxed ${isLightMode ? "text-stone-700" : "text-stone-300"} font-serif`}>
                "{englishText}"
              </p>
            )}
          </div>

          {/* Footer - Poet Creds & Stamp */}
          <div className="flex justify-between items-center relative z-10 pt-2 border-t border-transparent px-2">
            <div className="flex items-center gap-1.5">
              <FileText className={`w-3.5 h-3.5 ${isLightMode ? "text-stone-500" : "text-amber-500/60"}`} />
              <span className={`text-[10px] font-mono uppercase tracking-wider ${isLightMode ? "text-stone-500" : "text-stone-400"}`}>
                Poet: <strong className={isLightMode ? "text-stone-800" : "text-amber-200"}>{poetText || "Unknown"}</strong>
              </span>
            </div>

            <div className={`text-[10px] font-serif flex items-center gap-1.5 ${isLightMode ? "text-stone-500" : "text-amber-500/70"}`}>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${isLightMode ? "border-stone-500 text-stone-500" : "border-amber-500/40 text-amber-400"}`}>
                ذ
              </div>
              <span className="font-sans font-semibold text-[8px] uppercase tracking-widest">Deewan-e-Zauq</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Preview Modal */}
      {(exportedImgUrl || exportError) && (
        <div className="fixed inset-0 bg-stone-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full flex flex-col gap-5 relative shadow-2xl">
            <button
              onClick={() => {
                setExportedImgUrl(null);
                setExportedPdfUrl(null);
                setExportModalType(null);
                setExportError(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-950/60 hover:bg-stone-800 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {exportError ? (
              <div className="flex flex-col gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-100">
                    Export Encountered an Issue
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-2 leading-relaxed max-w-md mx-auto">
                    A canvas drawing or CORS restriction occurred. This can happen in tightly secured browser sandboxes or when remote fonts are loading.
                  </p>
                  <div className="bg-stone-950 border border-stone-850 p-3 rounded-xl mt-3 text-left">
                    <span className="text-[9px] font-mono text-stone-500 uppercase block tracking-wider mb-1">Details:</span>
                    <p className="text-[10px] font-mono text-rose-400/90 line-clamp-3 overflow-y-auto break-all">
                      {exportError}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-[11px] text-amber-400/90 leading-normal bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl text-left">
                    <strong>Alternative Solution:</strong> Since automatic capture was blocked, you can take a screenshot of the <strong>Card Master Preview</strong> on your screen, or use the copy button below to save the clean literary text.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => {
                        handleCopyText();
                        setExportedImgUrl(null);
                        setExportError(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Card Text</span>
                    </button>
                    <button
                      onClick={() => {
                        setExportedImgUrl(null);
                        setExportedPdfUrl(null);
                        setExportModalType(null);
                        setExportError(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 flex items-center justify-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Composition Exported</span>
                  </span>
                  <h3 className="font-serif font-bold text-base text-stone-100">
                    Your Zauq Card is Ready! 🎨✨
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                    {exportModalType === "pdf" 
                      ? "We have compiled your design as a high-fidelity vector PDF document." 
                      : "We triggered an automatic download. If your browser blocked it, click the button below to download or long-press / right-click the image to save natively."}
                  </p>
                </div>

                {/* Render exported image */}
                <div className="border border-stone-800 rounded-2xl overflow-hidden shadow-lg bg-stone-950 p-2 max-w-sm mx-auto w-full">
                  <img
                    src={exportedImgUrl || ""}
                    alt="Zauq Composition"
                    className="w-full h-auto object-contain rounded-xl"
                  />
                  {exportModalType === "png" && (
                    <span className="text-[9px] font-mono text-stone-500 uppercase block tracking-wider mt-2 text-center">
                      💡 Tip: Right-click/long-press image &gt; "Save Image As" is 100% reliable
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mt-1">
                  {/* High-trust native user-initiated <a> download trigger bypasses sandboxed iframe blocks */}
                  <a
                    href={exportModalType === "pdf" && exportedPdfUrl ? exportedPdfUrl : exportedImgUrl!}
                    download={`zauq_card_${(poetText || "custom").replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.${exportModalType || "png"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer text-center no-underline"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save {exportModalType?.toUpperCase()}</span>
                  </a>
                  <button
                    onClick={() => {
                      setExportedImgUrl(null);
                      setExportedPdfUrl(null);
                      setExportModalType(null);
                      setExportError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
