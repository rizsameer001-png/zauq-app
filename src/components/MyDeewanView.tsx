import React, { useState, useEffect } from "react";
import { Sher } from "../types";
import { BookOpen, Search, Trash2, Heart, Plus, Sparkles, Share2, Copy, Check, Feather, Cloud, CloudOff, Volume2, VolumeX, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface MyDeewanViewProps {
  savedShers: Sher[];
  onRemoveSher: (id: string) => void;
  onAddCustomSher: (sher: Sher) => void;
  onEditInCardCreator: (sher: Sher) => void;
  user: any;
  onSignIn: () => void;
  dailyCouplets?: any[];
  onSaveSher?: (sher: Sher) => void;
}

export default function MyDeewanView({ 
  savedShers, 
  onRemoveSher, 
  onAddCustomSher, 
  onEditInCardCreator,
  user,
  onSignIn,
  dailyCouplets = [],
  onSaveSher
}: MyDeewanViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedSherId, setCopiedSherId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const getDeterministicDailySher = (): Sher | null => {
    if (!dailyCouplets || dailyCouplets.length === 0) return null;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");
    const dateStrFormatted = `${year}-${month}-${date}`;
    const dateStrLegacy = `${year}-${today.getMonth() + 1}-${today.getDate()}`;

    // 1. Try to find today's active date couplet
    const pinned = dailyCouplets.find(
      (c) => c.activeDate === dateStrFormatted || c.activeDate === dateStrLegacy
    );
    if (pinned) return pinned;

    // 2. Or fallback to deterministic selection
    let hash = 0;
    for (let i = 0; i < dateStrFormatted.length; i++) {
      hash = (hash << 5) - hash + dateStrFormatted.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % dailyCouplets.length;
    return dailyCouplets[index];
  };

  const handleExportPDF = async () => {
    if (savedShers.length === 0) return;
    setIsExporting(true);

    try {
      // Create a temporary container for rendering the PDF pages offscreen
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "800px";
      document.body.appendChild(container);

      const formattedDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // 1. RENDER COVER PAGE
      const coverPage = document.createElement("div");
      coverPage.style.width = "800px";
      coverPage.style.height = "1130px";
      coverPage.style.backgroundColor = "#fcfaf2";
      coverPage.style.padding = "60px";
      coverPage.style.boxSizing = "border-box";
      coverPage.style.position = "relative";
      coverPage.style.display = "flex";
      coverPage.style.flexDirection = "column";
      coverPage.style.justifyContent = "space-between";
      coverPage.style.alignItems = "center";
      coverPage.style.textAlign = "center";
      coverPage.style.fontFamily = "'Playfair Display', Georgia, serif";
      coverPage.style.color = "#1c1917";
      coverPage.style.border = "10px double #d97706";
      
      coverPage.innerHTML = `
        <div style="width: 100%; border: 1px solid rgba(217, 119, 6, 0.15); height: 100%; box-sizing: border-box; padding: 40px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; position: relative; height: 100%;">
          <!-- Corner decorations -->
          <div style="position: absolute; top: 10px; left: 10px; width: 25px; height: 25px; border-top: 2px solid #d97706; border-left: 2px solid #d97706;"></div>
          <div style="position: absolute; top: 10px; right: 10px; width: 25px; height: 25px; border-top: 2px solid #d97706; border-right: 2px solid #d97706;"></div>
          <div style="position: absolute; bottom: 10px; left: 10px; width: 25px; height: 25px; border-bottom: 2px solid #d97706; border-left: 2px solid #d97706;"></div>
          <div style="position: absolute; bottom: 10px; right: 10px; width: 25px; height: 25px; border-bottom: 2px solid #d97706; border-right: 2px solid #d97706;"></div>

          <div style="margin-top: 40px;">
            <div style="font-size: 16px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #b45309; margin-bottom: 10px; text-transform: uppercase;">Bayaz-e-Zauq</div>
            <div style="font-family: 'Cinzel', serif; font-size: 42px; font-weight: 700; letter-spacing: 2px; color: #1c1917; margin-bottom: 5px; text-transform: uppercase; line-height: 1.1;">Zauq Journal</div>
            <div style="font-family: 'Noto Nastaliq Urdu', serif; font-size: 38px; color: #d97706; margin-top: 15px; margin-bottom: 15px; line-height: 1.8;" dir="rtl">دیوانِ ذوق • بیاضِ شاعری</div>
            <div style="width: 120px; height: 1px; background: linear-gradient(to right, transparent, #d97706, transparent); margin: 25px auto;"></div>
            <div style="font-size: 14px; color: #57534e; font-style: italic; max-width: 450px; line-height: 1.6; margin: 0 auto;">
              "A meticulously curated personal notebook of classical couplets and original poetic compositions, exported from the Zauq-e-Shayari collection."
            </div>
          </div>

          <!-- Central Calligraphic Epigraph -->
          <div style="background-color: rgba(217, 119, 6, 0.03); border: 1px dashed rgba(217, 119, 6, 0.2); padding: 30px; border-radius: 16px; max-width: 500px; width: 100%; box-sizing: border-box; margin: 20px 0;">
            <p style="font-family: 'Noto Nastaliq Urdu', serif; font-size: 20px; color: #2e153b; line-height: 2.2; margin: 0;" dir="rtl">
              لوح بھی تو قلم بھی تو تیرا وجود الکتاب<br/>
              گنبدِ آبگینہ رنگ تیرے محیط میں حباب
            </p>
          </div>

          <div style="margin-bottom: 40px;">
            <div style="font-size: 11px; font-family: monospace; letter-spacing: 2px; color: #78716c; text-transform: uppercase; margin-bottom: 6px;">Compiled By</div>
            <div style="font-size: 16px; font-weight: 600; color: #1c1917; font-family: 'Playfair Display', serif; margin-bottom: 15px;">
              ${user ? user.email : "Sikh-e-Sukhān (Lover of Verse)"}
            </div>
            
            <div style="display: flex; justify-content: center; gap: 40px; margin-top: 20px;">
              <div>
                <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #a8a29e;">Couplets</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706; font-family: 'Cinzel', serif;">${savedShers.length}</div>
              </div>
              <div style="width: 1px; background-color: rgba(217, 119, 6, 0.15); height: 35px;"></div>
              <div>
                <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #a8a29e;">Date</div>
                <div style="font-size: 14px; font-weight: 600; color: #1c1917; padding-top: 2px;">${formattedDate}</div>
              </div>
            </div>
          </div>

          <div style="font-size: 10px; font-family: monospace; color: #a8a29e; letter-spacing: 1px;">
            ZAUQ-E-SHAYARI • DIGITAL COURTLY NOTEBOOK
          </div>
        </div>
      `;
      container.appendChild(coverPage);

      // 2. RENDER SHERS PAGES (3 shers per page)
      const shersPerPage = 3;
      const totalPages = Math.ceil(savedShers.length / shersPerPage);

      for (let i = 0; i < totalPages; i++) {
        const pageShers = savedShers.slice(i * shersPerPage, (i + 1) * shersPerPage);
        const poetryPage = document.createElement("div");
        poetryPage.style.width = "800px";
        poetryPage.style.height = "1130px";
        poetryPage.style.backgroundColor = "#fcfaf2";
        poetryPage.style.padding = "50px";
        poetryPage.style.boxSizing = "border-box";
        poetryPage.style.position = "relative";
        poetryPage.style.display = "flex";
        poetryPage.style.flexDirection = "column";
        poetryPage.style.justifyContent = "space-between";
        poetryPage.style.fontFamily = "'Playfair Display', Georgia, serif";
        poetryPage.style.color = "#1c1917";
        poetryPage.style.border = "10px double #d97706";

        let shersHtml = "";
        pageShers.forEach((s) => {
          shersHtml += `
            <div style="background: #ffffff; border: 1px solid rgba(217, 119, 6, 0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.02); border-radius: 16px; padding: 25px; margin-bottom: 25px; position: relative; display: flex; flex-direction: column; gap: 15px; text-align: center;">
              <!-- Little Quill watermark icon -->
              <div style="position: absolute; top: 12px; left: 15px; font-size: 14px; color: rgba(217, 119, 6, 0.25);">❦</div>
              
              <!-- Custom Compose stamp if user-added -->
              ${s.isUserAdded ? `
                <span style="position: absolute; top: 12px; right: 15px; background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.2); color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Original</span>
              ` : ''}

              <!-- Urdu Script -->
              <div style="font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; font-size: 22px; color: #1c1917; line-height: 2.0; margin-top: 10px; margin-bottom: 5px; word-spacing: 2px; font-weight: 500;" dir="rtl">
                ${s.urdu.replace(/\n/g, "<br/>")}
              </div>

              <!-- Roman Script -->
              ${s.roman ? `
                <div style="font-size: 11px; color: #78716c; line-height: 1.5; font-family: 'Playfair Display', serif; font-style: italic; max-width: 600px; margin: 0 auto;">
                  ${s.roman.replace(/\n/g, " / ")}
                </div>
              ` : ''}

              <!-- English Translation -->
              ${s.english ? `
                <div style="font-size: 12px; color: #57534e; line-height: 1.6; max-width: 620px; margin: 0 auto; font-family: 'Playfair Display', serif;">
                  "${s.english}"
                </div>
              ` : ''}

              <!-- Divider and Poet -->
              <div style="border-top: 1px dashed rgba(217, 119, 6, 0.12); padding-top: 10px; margin-top: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; font-family: monospace; color: #a8a29e; letter-spacing: 1px; text-transform: uppercase;">
                <span>Zauq Collection</span>
                <span style="color: #b45309; font-weight: bold;">Poet: ${s.poet}</span>
              </div>
            </div>
          `;
        });

        poetryPage.innerHTML = `
          <div style="width: 100%; border: 1px solid rgba(217, 119, 6, 0.15); height: 100%; box-sizing: border-box; padding: 30px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <!-- Top running header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(217, 119, 6, 0.15); padding-bottom: 8px; margin-bottom: 25px; font-family: monospace; font-size: 9px; letter-spacing: 2px; color: #78716c; text-transform: uppercase;">
              <span>Bayaz-e-Zauq Journal</span>
              <span>Mera Deewan Anthology</span>
            </div>

            <!-- Shers Container -->
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
              ${shersHtml}
            </div>

            <!-- Bottom running footer with pagination -->
            <div style="border-top: 1px solid rgba(217, 119, 6, 0.15); padding-top: 8px; display: flex; justify-content: center; align-items: center; font-family: monospace; font-size: 9px; letter-spacing: 1px; color: #a8a29e;">
              <span>PAGE ${i + 1} OF ${totalPages}</span>
            </div>
          </div>
        `;
        container.appendChild(poetryPage);
      }

      // 3. CAPTURE PAGES AND GENERATE PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = 595.28;
      const pdfHeight = 841.89;

      const pageElements = container.childNodes;
      for (let idx = 0; idx < pageElements.length; idx++) {
        const pageEl = pageElements[idx] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          useCORS: true,
          allowTaint: true,
          scale: 2, // High resolution crisp text
          backgroundColor: "#fcfaf2",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (idx > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      // Cleanup
      document.body.removeChild(container);

      // Save PDF
      pdf.save(`zauq_journal_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to compile notebook to PDF:", err);
    } finally {
      setIsExporting(false);
    }
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

        {/* Compact Sher of the Day card */}
        {getDeterministicDailySher() && (() => {
          const dailySher = getDeterministicDailySher();
          if (!dailySher) return null;
          const isDailySherSaved = savedShers.some(s => s.id === dailySher.id);
          return (
            <div className="bg-stone-900/40 p-5 rounded-2xl border border-stone-900/80 backdrop-blur-md flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-stone-850 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500/90 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sher of the Day</span>
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  Daily Curated
                </span>
              </div>

              <div className="text-center flex flex-col gap-3.5 py-1">
                <p className="text-xl text-amber-200 font-serif font-urdu leading-loose whitespace-pre-line">
                  {dailySher.urdu}
                </p>
                {(dailySher.roman || dailySher.english) && (
                  <div className="flex flex-col gap-1 px-1">
                    {dailySher.roman && (
                      <p className="text-[10px] italic text-stone-400 font-serif leading-normal">
                        {dailySher.roman}
                      </p>
                    )}
                    {dailySher.english && (
                      <p className="text-[11px] text-stone-300 font-serif leading-relaxed">
                        "{dailySher.english}"
                      </p>
                    )}
                  </div>
                )}
                <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                  — {dailySher.poet}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-850">
                {/* Recite (Speech Synthesis) */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentSpeakingId === dailySher.id && isSpeaking) {
                      stop();
                    } else {
                      speak(dailySher.id, dailySher.urdu);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer font-bold ${
                    currentSpeakingId === dailySher.id && isSpeaking
                      ? "bg-amber-500 text-stone-950 animate-pulse"
                      : "bg-stone-950 hover:bg-stone-900 text-stone-400 hover:text-amber-300 border border-stone-800"
                  }`}
                  title={currentSpeakingId === dailySher.id && isSpeaking ? "Stop recitation" : "Recite Urdu Couplet"}
                >
                  {currentSpeakingId === dailySher.id && isSpeaking ? (
                    <>
                      <VolumeX className="w-3 h-3" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      <span>Recite</span>
                    </>
                  )}
                </button>

                {/* Share in Card Creator */}
                <button
                  type="button"
                  onClick={() => onEditInCardCreator(dailySher)}
                  className="py-1.5 px-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer font-bold bg-stone-950 hover:bg-stone-900 text-stone-400 hover:text-amber-300 border border-stone-800"
                  title="Open in card designer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Card</span>
                </button>

                {/* Save / Save status */}
                {onSaveSher && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isDailySherSaved) {
                        onRemoveSher(dailySher.id);
                      } else {
                        onSaveSher(dailySher);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer font-bold ${
                      isDailySherSaved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border border-amber-500/20 hover:border-transparent"
                    }`}
                  >
                    {isDailySherSaved ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-3 h-3" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Diary Stream List (Right) */}
      <div className="lg:col-span-8 flex flex-col justify-stretch">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs font-mono uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Mera Deewan ({filteredShers.length} Shers)</span>
          </span>

          {filteredShers.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border border-amber-500/20 hover:border-transparent text-xs font-mono uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer font-bold disabled:opacity-50 shadow-sm"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-current" />
                  <span>Compiling Journal...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Zauq Journal</span>
                </>
              )}
            </button>
          )}
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
