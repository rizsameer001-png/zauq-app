import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  BookOpen, 
  Save, 
  X, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Lock,
  Shield,
  ShieldAlert,
  UserX,
  Unlock, 
  ArrowUp, 
  ArrowDown,
  Info,
  Tv,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  Play,
  Video,
  BookMarked,
  FileText,
  Library,
  Calendar,
  Clock,
  Palette,
  Type,
  Activity
} from "lucide-react";
import { Ghazal, Sher, ZauqVideo, Author, Book, CMSPage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType, uploadToStorage, uploadToStorageWithProgress, sanitizeForFirestore } from "../firebase";
import { generatePdfThumbnail } from "../utils/pdfThumbnail";
import { makeUrlRelative } from "../utils/url";
import { doc, setDoc, deleteDoc, collection, serverTimestamp, updateDoc, getDoc, getDocs, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { saveVideoFile, deleteVideoFile, getVideoFile } from "../videoDb";
import { saveMediaFile, deleteMediaFile, getMediaFile } from "../mediaDb";

interface AdminPanelProps {
  poets: any[];
  ghazals: Ghazal[];
  videos: ZauqVideo[];
  authors: Author[];
  books: Book[];
  dailyCouplets?: any[];
  user: any;
  onSignIn: () => void;
  triggerToast: (msg: string) => void;
}

export default function AdminPanel({ 
  poets, 
  ghazals, 
  videos = [],
  authors = [],
  books = [],
  dailyCouplets = [],
  user, 
  onSignIn,
  triggerToast 
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"poets" | "ghazals" | "videos" | "authors" | "books" | "couplets" | "settings" | "cms" | "security">("ghazals");
  const [searchQuery, setSearchQuery] = useState("");

  // Security & User Login States
  const [userLoginAllowed, setUserLoginAllowed] = useState<boolean>(true);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [banEmail, setBanEmail] = useState("");
  const [banUserIdInput, setBanUserIdInput] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banWrongActivityLog, setBanWrongActivityLog] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState("all");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  // Branding & Global Personalization Settings States
  const [bgTheme, setBgTheme] = useState("midnight");
  const [activeFont, setActiveFont] = useState("serif");
  const [previewCustomText, setPreviewCustomText] = useState("");
  
  // Logo CRUD States
  const [logoText, setLogoText] = useState("ZAUQ");
  const [logoSubtitle, setLogoSubtitle] = useState("Urdu Literary Lounge");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  
  // Banner CRUD States
  const [bannerHeading, setBannerHeading] = useState("Zauq Urdu Literary Lounge");
  const [bannerTagline, setBannerTagline] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerLink, setBannerLink] = useState("deewan");
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // CMS CRUD States
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [selectedCmsPageId, setSelectedCmsPageId] = useState<string | null>(null);
  const [cmsPageTitle, setCmsPageTitle] = useState("");
  const [cmsPageContent, setCmsPageContent] = useState("");
  const [isSavingCms, setIsSavingCms] = useState(false);
  const [isLoadingCms, setIsLoadingCms] = useState(false);
  const [cmsPageIdInput, setCmsPageIdInput] = useState("");

  // Load global layout configuration on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const configRef = doc(db, "settings", "global_config");
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBgTheme(data.background || "midnight");
          setActiveFont(data.font || "serif");
          setLogoText(data.logoText || "ZAUQ");
          setLogoSubtitle(data.logoSubtitle || "Urdu Literary Lounge");
          setLogoUrl(makeUrlRelative(data.logoUrl || ""));
          setBannerHeading(data.bannerHeading || "Zauq Urdu Literary Lounge");
          setBannerTagline(data.bannerTagline || "");
          setBannerImageUrl(makeUrlRelative(data.bannerImageUrl || ""));
          setBannerLink(data.bannerLink || "deewan");
          if (data.userLoginAllowed !== undefined) {
            setUserLoginAllowed(data.userLoginAllowed);
          }
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    }
    loadConfig();
  }, []);

  // Listen to the banned_users collection when activeSubTab is "security"
  useEffect(() => {
    if (activeSubTab !== "security") return;
    const q = collection(db, "banned_users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), docId: docSnap.id });
      });
      setBannedUsers(list);
    }, (err) => {
      console.error("Error loading banned users:", err);
    });
    return () => unsubscribe();
  }, [activeSubTab]);

  // Listen to the audit_logs collection when activeSubTab is "audit"
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab !== "audit") return;
    setAuditLoading(true);
    const logsRef = collection(db, "audit_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), docId: docSnap.id });
      });
      setAuditLogs(list);
      setAuditLoading(false);
    }, (err) => {
      console.error("Error loading audit logs:", err);
      setAuditLoading(false);
    });
    return () => unsubscribe();
  }, [activeSubTab]);

  const handleSaveSecuritySettings = async (allowed: boolean) => {
    try {
      const configRef = doc(db, "settings", "global_config");
      await setDoc(configRef, {
        userLoginAllowed: allowed,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setUserLoginAllowed(allowed);
      triggerToast(`User logins are now ${allowed ? "ENABLED" : "DISABLED"} globally.`);
    } catch (err) {
      console.error("Error saving login settings:", err);
      triggerToast("Failed to update access settings.");
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banEmail.trim() && !banUserIdInput.trim()) {
      triggerToast("Please provide either an Email or a User ID to ban.");
      return;
    }

    try {
      setIsBanning(true);
      
      const docId = banUserIdInput.trim() 
        ? banUserIdInput.trim() 
        : "email_" + banEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");

      const banRef = doc(db, "banned_users", docId);
      await setDoc(banRef, {
        id: docId,
        email: banEmail.trim().toLowerCase(),
        userId: banUserIdInput.trim() || null,
        reason: banReason.trim() || "Wrong activity detected.",
        wrongActivityLog: banWrongActivityLog.trim() || "N/A",
        bannedAt: new Date().toISOString()
      });

      triggerToast(`User ${banEmail || banUserIdInput} has been banned successfully!`);
      setBanEmail("");
      setBanUserIdInput("");
      setBanReason("");
      setBanWrongActivityLog("");
    } catch (err) {
      console.error("Failed to ban user:", err);
      triggerToast("Error banning user. Check database permissions.");
    } finally {
      setIsBanning(false);
    }
  };

  const handleInvestigateLog = (log: any) => {
    setBanEmail(log.userEmail || "");
    setBanUserIdInput(log.userId || "");
    setBanReason(`Automatic investigation from audit log action: "${log.action}"`);
    setBanWrongActivityLog(`Wrong activity flagged: ${log.details}`);
    setActiveSubTab("security");
    triggerToast("Transferred user data to Gatekeeper for investigation.");
  };

  const handleUnbanUser = async (docId: string) => {
    try {
      await deleteDoc(doc(db, "banned_users", docId));
      triggerToast("User unbanned successfully.");
    } catch (err) {
      console.error("Error unbanning user:", err);
      triggerToast("Failed to unban user.");
    }
  };

  const handleSaveBranding = async () => {
    try {
      setIsSavingBranding(true);
      const configRef = doc(db, "settings", "global_config");
      await setDoc(configRef, {
        id: "global_config",
        background: bgTheme,
        font: activeFont,
        logoText,
        logoSubtitle,
        logoUrl: makeUrlRelative(logoUrl),
        bannerHeading,
        bannerTagline,
        bannerImageUrl: makeUrlRelative(bannerImageUrl),
        bannerLink,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      triggerToast("Branding, logo, and home page banner layout settings updated successfully!");
    } catch (err) {
      console.error("Failed to save branding:", err);
      triggerToast("Failed to save branding settings.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  // CMS Default Templates for about-us and privacy-policy
  const DEFAULT_CMS_TEMPLATES: Record<string, { title: string; content: string }> = {
    "about-us": {
      title: "About Us - Zauq Urdu Literary Lounge",
      content: `# Welcome to Zauq (ذوق)

**Zauq Urdu Literary Lounge** is a sanctuary for classical poetry, timeless melodies, and rich literary heritage. Named after the royal poet *Sheikh Muhammad Ibrahim Zauq*, our mission is to resurrect the majestic elegance of the Urdu language and make it accessible to modern seekers of beauty.

## Our Philosophy
We believe that classical poetry is not merely ink on parchment, but a living breathing soul. Through delicate typography, rich commentary (Tashreeh), interactive *Beit-Bazi* duels, and high-fidelity acoustic recitations, we bridge the gap between ancient masters and contemporary digital audiences.

### What You'll Find Here
* **Deewan Notebook**: Compile your personal notebook of beloved verses (*Shers*) and original compositions.
* **Classical Library**: Explore carefully digitized publications, manuscripts, and anthologies of masters like Ghalib, Iqbal, Mir Taqi Mir, and Faiz Ahmed Faiz.
* **Samaa Performance Lounge**: Immerse yourself in high-quality performance videos, spiritual Qawwalis, and soulful Ghazal recitals.
* **Beit Bazi**: Engage in the traditional game of verse-matching with our intelligent poetic engine.

*“Laata hai us lab pe haseen har ek sher,*
*Ghalib o Zauq ka silsila hai yahan...”*`
    },
    "privacy-policy": {
      title: "Privacy Policy",
      content: `# Privacy Policy

**Effective Date: July 13, 2026**

At **Zauq Urdu Literary Lounge**, we deeply respect the privacy of our patrons and poets. This privacy policy describes how we handle the minimal data collected on our platform.

## 1. Information We Collect
* **Personal Deewan & Notebooks**: When you sign in and save couplets (*Shers*) to your personal Deewan, these records are stored securely in our cloud database linked specifically to your unique user ID.
* **Reading Progress**: We save progress logs for books you read or listen to in the library so you can seamlessly resume across devices.
* **Third-Party Authentication**: We utilize secure sign-in (such as Google Sign-In) which safely validates your identity. We do not store your passwords.

## 2. Security of Your Poetic Assets
Your original compositions and saved verses are yours. They are protected by robust backend security rules that prevent other users from reading or editing your personal files.

## 3. Contact Us
For any inquiries regarding your data or to request account deletion, please contact us at **support@zauqapp.example.com**.`
    }
  };

  // Load CMS pages when activeSubTab is "cms"
  useEffect(() => {
    if (activeSubTab !== "cms") return;
    
    async function loadCmsPages() {
      try {
        setIsLoadingCms(true);
        const querySnapshot = await getDocs(collection(db, "cms_pages"));
        const pages: CMSPage[] = [];
        querySnapshot.forEach((docSnap) => {
          pages.push({
            id: docSnap.id,
            ...docSnap.data()
          } as CMSPage);
        });
        
        setCmsPages(pages);
      } catch (err) {
        console.error("Error loading CMS pages:", err);
        triggerToast("Failed to load CMS pages.");
      } finally {
        setIsLoadingCms(false);
      }
    }
    loadCmsPages();
  }, [activeSubTab]);

  const handleSaveCmsPage = async () => {
    const slug = selectedCmsPageId === "new" ? cmsPageIdInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") : selectedCmsPageId;
    if (!slug) {
      triggerToast("Please select a page or enter a valid page slug.");
      return;
    }
    if (!cmsPageTitle.trim()) {
      triggerToast("Page title is required.");
      return;
    }
    if (!cmsPageContent.trim()) {
      triggerToast("Page content is required.");
      return;
    }
    
    try {
      setIsSavingCms(true);
      const pageRef = doc(db, "cms_pages", slug);
      const payload = {
        id: slug,
        title: cmsPageTitle.trim(),
        content: cmsPageContent,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(pageRef, payload);
      triggerToast(`CMS Page "${cmsPageTitle}" saved successfully!`);
      
      // Refresh pages list
      const querySnapshot = await getDocs(collection(db, "cms_pages"));
      const pages: CMSPage[] = [];
      querySnapshot.forEach((docSnap) => {
        pages.push({
          id: docSnap.id,
          ...docSnap.data()
        } as CMSPage);
      });
      setCmsPages(pages);
      setSelectedCmsPageId(slug);
    } catch (err) {
      console.error("Failed to save CMS page:", err);
      triggerToast("Failed to save CMS page.");
    } finally {
      setIsSavingCms(false);
    }
  };

  const handleDeleteCmsPage = async (slug: string) => {
    if (slug === "about-us" || slug === "privacy-policy") {
      triggerToast("Default pages 'about-us' and 'privacy-policy' cannot be deleted, but they can be edited!");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the page "${slug}"?`)) {
      return;
    }
    try {
      setIsSavingCms(true);
      await deleteDoc(doc(db, "cms_pages", slug));
      triggerToast(`Page "${slug}" deleted successfully.`);
      
      // Refresh pages list
      const querySnapshot = await getDocs(collection(db, "cms_pages"));
      const pages: CMSPage[] = [];
      querySnapshot.forEach((docSnap) => {
        pages.push({
          id: docSnap.id,
          ...docSnap.data()
        } as CMSPage);
      });
      setCmsPages(pages);
      if (selectedCmsPageId === slug) {
        setSelectedCmsPageId(null);
        setCmsPageTitle("");
        setCmsPageContent("");
      }
    } catch (err) {
      console.error("Failed to delete CMS page:", err);
      triggerToast("Failed to delete CMS page.");
    } finally {
      setIsSavingCms(false);
    }
  };
  
  // Editor States - Videos
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoArtist, setVideoArtist] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCategory, setVideoCategory] = useState("Qawwali");
  const [videoDescription, setVideoDescription] = useState("");
  const [isNewVideo, setIsNewVideo] = useState(false);
  const [videoSourceType, setVideoSourceType] = useState<"youtube" | "direct" | "upload">("youtube");
  const [localUploadedFile, setLocalUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoErrors, setVideoErrors] = useState<{
    title?: string;
    artist?: string;
    url?: string;
    upload?: string;
    category?: string;
  }>({});
  const [attemptedVideoSubmit, setAttemptedVideoSubmit] = useState(false);

  // Editor States - Authors
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [authorBirthPlace, setAuthorBirthPlace] = useState("");
  const [authorActiveYears, setAuthorActiveYears] = useState("");
  const [authorImageUrl, setAuthorImageUrl] = useState("");
  const [authorIsLocalImage, setAuthorIsLocalImage] = useState(false);
  const [authorLocalFile, setAuthorLocalFile] = useState<File | null>(null);
  const [authorPreviewUrl, setAuthorPreviewUrl] = useState("");
  const [isNewAuthor, setIsNewAuthor] = useState(false);
  const [authorErrors, setAuthorErrors] = useState<{
    name?: string;
    bio?: string;
    activeYears?: string;
    birthPlace?: string;
    image?: string;
  }>({});
  const [attemptedAuthorSubmit, setAttemptedAuthorSubmit] = useState(false);

  // Editor States - Books
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookAuthorId, setBookAuthorId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [bookGenre, setBookGenre] = useState("");
  const [bookLiteraryPeriod, setBookLiteraryPeriod] = useState("");
  
  // Book Cover image upload/link
  const [bookCoverType, setBookCoverType] = useState<"link" | "upload">("link");
  const [bookCoverUrl, setBookCoverUrl] = useState("");
  const [bookIsLocalCover, setBookIsLocalCover] = useState(false);
  const [bookLocalCoverFile, setBookLocalCoverFile] = useState<File | null>(null);
  const [bookCoverPreviewUrl, setBookCoverPreviewUrl] = useState("");

  // Book Audio recitation upload/link
  const [bookAudioType, setBookAudioType] = useState<"link" | "upload">("link");
  const [bookAudioUrl, setBookAudioUrl] = useState("");
  const [bookIsLocalAudio, setBookIsLocalAudio] = useState(false);
  const [bookLocalAudioFile, setBookLocalAudioFile] = useState<File | null>(null);
  
  // Book Video recitation upload/link
  const [bookVideoSourceType, setBookVideoSourceType] = useState<"youtube" | "direct" | "upload">("youtube");
  const [bookVideoUrl, setBookVideoUrl] = useState("");
  const [bookLocalVideoFile, setBookLocalVideoFile] = useState<File | null>(null);
  const [bookVideoPreviewUrl, setBookVideoPreviewUrl] = useState("");

  // Book PDF and EPUB attachments
  const [bookFiles, setBookFiles] = useState<{
    id: string;
    name: string;
    type: "pdf" | "epub";
    url: string;
    isLocal: boolean;
    localFile?: File;
    thumbnailUrl?: string;
  }[]>([]);

  // New book file states (PDF/EPUB)
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"pdf" | "epub">("pdf");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileTypeSource, setNewFileTypeSource] = useState<"link" | "upload">("upload");
  const [newLocalFile, setNewLocalFile] = useState<File | null>(null);

  // Upload Progress and Preview States
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [bookSavingStatus, setBookSavingStatus] = useState("");

  const handleDirectFileUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const type: "pdf" | "epub" = ext === "epub" ? "epub" : "pdf";
    
    setIsUploadingAttachment(true);
    setAttachmentUploadProgress(0);
    
    const fileId = "file_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const fileName = newFileName.trim() || file.name;
    const docId = selectedBookId || "new_book_" + Date.now();

    try {
      // 1. Generate PDF Thumbnail
      let thumbnailUrl = "";
      if (type === "pdf") {
        try {
          triggerToast("Generating PDF thumbnail preview... 🖼️");
          thumbnailUrl = await generatePdfThumbnail(file);
        } catch (thumbErr) {
          console.warn("Could not generate PDF thumbnail:", thumbErr);
        }
      }

      // 2. Upload directly to Firebase Storage with Progress callback
      triggerToast(`Uploading "${fileName}" directly to Firebase Storage... ⏳`);
      const storagePath = `books/attachments/${docId}/${fileId}_${file.name}`;
      
      const firebaseUrl = await uploadToStorageWithProgress(storagePath, file, (progress) => {
        setAttachmentUploadProgress(Math.round(progress));
      });

      // 3. Add to bookFiles list immediately with the real Firebase Storage URL
      setBookFiles(prev => [
        ...prev,
        {
          id: fileId,
          name: fileName,
          type: type,
          url: firebaseUrl,
          isLocal: false,
          thumbnailUrl: thumbnailUrl || undefined
        }
      ]);

      triggerToast("Attachment uploaded and added successfully! 🎉");
      setNewFileName("");
      setNewLocalFile(null);
    } catch (uploadErr: any) {
      console.error("Direct upload failed, falling back to local IndexedDB:", uploadErr);
      triggerToast("Storage upload failed, saving attachment locally inside your browser... ⚠️");
      
      try {
        await saveMediaFile(fileId, file);
        
        let thumbnailUrl = "";
        if (type === "pdf") {
          try {
            thumbnailUrl = await generatePdfThumbnail(file);
          } catch (e) {}
        }

        setBookFiles(prev => [
          ...prev,
          {
            id: fileId,
            name: fileName,
            type: type,
            url: `local://${fileId}`,
            isLocal: true,
            thumbnailUrl: thumbnailUrl || undefined
          }
        ]);
        
        triggerToast("Saved locally to offline database! 💾");
        setNewFileName("");
        setNewLocalFile(null);
      } catch (localErr) {
        console.error("Local save fallback failed:", localErr);
        triggerToast("Failed to save attachment locally. ❌");
      }
    } finally {
      setIsUploadingAttachment(false);
      setAttachmentUploadProgress(0);
    }
  };

  const handleAddBookFile = () => {
    if (newFileTypeSource === "link") {
      if (!newFileUrl.trim()) {
        triggerToast("Please enter a file URL. ⚠️");
        return;
      }
      const name = newFileName.trim() || newFileUrl.split("/").pop() || `Book_File.${newFileType}`;
      setBookFiles(prev => [
        ...prev,
        {
          id: "file_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          name,
          type: newFileType,
          url: newFileUrl.trim(),
          isLocal: false
        }
      ]);
      setNewFileName("");
      setNewFileUrl("");
      triggerToast("Remote attachment added! ✍️");
    } else {
      if (!newLocalFile) {
        triggerToast("Please select or drop a file first. ⚠️");
        return;
      }
      handleDirectFileUpload(newLocalFile);
    }
  };

  const handleRemoveBookFile = async (id: string) => {
    setBookFiles(prev => prev.filter(f => f.id !== id));
    if (selectedBookId) {
      try {
        // Delete both possible styles of keys from IndexedDB
        await deleteMediaFile(`file_${selectedBookId}_${id}`);
        await deleteMediaFile(id);
      } catch (e) {
        console.error("Failed to delete local attachment file from DB:", e);
      }
    }
  };

  const [isNewBook, setIsNewBook] = useState(false);
  const [bookErrors, setBookErrors] = useState<{
    title?: string;
    authorId?: string;
    description?: string;
    cover?: string;
    audio?: string;
    video?: string;
  }>({});
  const [attemptedBookSubmit, setAttemptedBookSubmit] = useState(false);

  // Editor States - Couplets
  const [selectedCoupletId, setSelectedCoupletId] = useState<string | null>(null);
  const [coupletUrdu, setCoupletUrdu] = useState("");
  const [coupletRoman, setCoupletRoman] = useState("");
  const [coupletEnglish, setCoupletEnglish] = useState("");
  const [coupletPoet, setCoupletPoet] = useState("");
  const [coupletExplanation, setCoupletExplanation] = useState("");
  const [coupletCategory, setCoupletCategory] = useState<"Sher" | "Mersiya">("Sher");
  const [coupletActiveDate, setCoupletActiveDate] = useState("");
  const [isNewCouplet, setIsNewCouplet] = useState(false);
  const [coupletErrors, setCoupletErrors] = useState<{
    urdu?: string;
    poet?: string;
    category?: string;
  }>({});
  const [attemptedCoupletSubmit, setAttemptedCoupletSubmit] = useState(false);

  // Validate the video curation form inputs
  const validateVideoForm = () => {
    const newErrors: { title?: string; artist?: string; url?: string; upload?: string; category?: string } = {};

    if (!videoTitle.trim()) {
      newErrors.title = "Video title is required.";
    }

    if (!videoArtist.trim()) {
      newErrors.artist = "Artist, Poet, or Reciter name is required.";
    }

    if (!videoCategory.trim()) {
      newErrors.category = "Category is required.";
    }

    if (videoSourceType === "youtube") {
      if (!videoUrl.trim()) {
        newErrors.url = "YouTube URL is required.";
      } else {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = videoUrl.match(regExp);
        const ytId = (match && match[2].length === 11) ? match[2] : null;
        if (!ytId) {
          newErrors.url = "Please enter a valid YouTube video URL (with an 11-character video ID).";
        }
      }
    } else if (videoSourceType === "direct") {
      if (!videoUrl.trim()) {
        newErrors.url = "Streaming/MP4 Video URL is required.";
      } else {
        try {
          const parsed = new URL(videoUrl.trim());
          const isValid = parsed.protocol === "http:" || parsed.protocol === "https:";
          if (!isValid) {
            newErrors.url = "URL must use http or https protocol.";
          }
        } catch (_) {
          newErrors.url = "Please enter a valid streaming URL (e.g. https://domain.com/video.mp4).";
        }
      }
    } else if (videoSourceType === "upload") {
      if (isNewVideo && !localUploadedFile) {
        newErrors.upload = "Please upload or drag-and-drop a video file.";
      } else if (!isNewVideo && !localUploadedFile && !videoPreviewUrl) {
        newErrors.upload = "No video file is uploaded or cached for this record.";
      }
    }

    return newErrors;
  };

  // Revalidate video form in real-time once the user has attempted to submit
  useEffect(() => {
    if (attemptedVideoSubmit) {
      setVideoErrors(validateVideoForm());
    } else {
      setVideoErrors({});
    }
  }, [videoTitle, videoArtist, videoUrl, videoCategory, videoSourceType, localUploadedFile, videoPreviewUrl, attemptedVideoSubmit, isNewVideo]);

  // Editor States - Poets
  const [selectedPoetId, setSelectedPoetId] = useState<string | null>(null);
  const [poetName, setPoetName] = useState("");
  const [poetEra, setPoetEra] = useState("");
  const [poetTitle, setPoetTitle] = useState("");
  const [poetBio, setPoetBio] = useState("");
  const [isNewPoet, setIsNewPoet] = useState(false);

  // Editor States - Ghazals
  const [selectedGhazalId, setSelectedGhazalId] = useState<string | null>(null);
  const [ghazalTitle, setGhazalTitle] = useState("");
  const [ghazalPoet, setGhazalPoet] = useState("");
  const [ghazalCategory, setGhazalCategory] = useState("");
  const [ghazalBackground, setGhazalBackground] = useState("");
  const [ghazalShers, setGhazalShers] = useState<Sher[]>([]);
  const [ghazalGenre, setGhazalGenre] = useState<string>("Ghazal");
  const [isNewGhazal, setIsNewGhazal] = useState(false);

  // Sub-editor State for a Single Sher within Ghazal
  const [editingSherIdx, setEditingSherIdx] = useState<number | null>(null);
  const [sherUrdu, setSherUrdu] = useState("");
  const [sherRoman, setSherRoman] = useState("");
  const [sherEnglish, setSherEnglish] = useState("");
  const [sherExplanation, setSherExplanation] = useState("");
  const [isAddingSher, setIsAddingSher] = useState(false);

  const isAdmin = user?.email === "amancib007@gmail.com";

  // Filter lists based on search
  const filteredPoets = poets.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGhazals = ghazals.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.poet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuthors = authors.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.bio && a.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.birthPlace && a.birthPlace.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCouplets = dailyCouplets.filter(c => 
    c.urdu.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.poet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.roman && c.roman.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.english && c.english.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle video selection
  const handleSelectVideo = async (video: ZauqVideo) => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoErrors({});
    setAttemptedVideoSubmit(false);
    setSelectedVideoId(video.id);
    setVideoTitle(video.title);
    setVideoArtist(video.artist);
    setVideoUrl(video.url);
    setVideoCategory(video.category);
    setVideoDescription(video.description || "");
    setIsNewVideo(false);
    setLocalUploadedFile(null);

    if (video.isLocal) {
      setVideoSourceType("upload");
      try {
        const fileBlob = await getVideoFile(video.id);
        if (fileBlob) {
          const objectUrl = URL.createObjectURL(fileBlob);
          setVideoPreviewUrl(objectUrl);
        } else {
          setVideoPreviewUrl("");
        }
      } catch (err) {
        console.error("Failed to load local video preview:", err);
        setVideoPreviewUrl("");
      }
    } else if (video.url.includes("youtube.com") || video.url.includes("youtu.be")) {
      setVideoSourceType("youtube");
      setVideoPreviewUrl("");
    } else {
      setVideoSourceType("direct");
      setVideoPreviewUrl(video.url);
    }
  };

  const handleInitNewVideo = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoErrors({});
    setAttemptedVideoSubmit(false);
    setSelectedVideoId(null);
    setVideoTitle("");
    setVideoArtist("");
    setVideoUrl("");
    setVideoCategory("Qawwali");
    setVideoDescription("");
    setIsNewVideo(true);
    setVideoSourceType("youtube");
    setLocalUploadedFile(null);
    setVideoPreviewUrl("");
  };

  // Save Video
  const handleSaveVideo = async () => {
    setAttemptedVideoSubmit(true);
    const formErrors = validateVideoForm();
    if (Object.keys(formErrors).length > 0) {
      setVideoErrors(formErrors);
      triggerToast("Please correct the highlighted errors before saving. ⚠️");
      return;
    }

    const docId = selectedVideoId || "vid_" + Date.now();
    let isLocal = videoSourceType === "upload";
    let finalUrl = videoUrl.trim();

    try {
      let videoBlobToUpload = localUploadedFile;
      if (isLocal && !videoBlobToUpload && finalUrl.startsWith("local://")) {
        try {
          const cachedBlob = await getVideoFile(docId);
          if (cachedBlob) {
            videoBlobToUpload = cachedBlob as File;
          }
        } catch (err) {
          console.warn("Failed to retrieve cached video blob for upload:", err);
        }
      }

      if (isLocal && videoBlobToUpload) {
        try {
          triggerToast("Uploading video to Firebase Storage... ⏳");
          finalUrl = await uploadToStorage(`videos/${docId}_${videoBlobToUpload.name || "video.mp4"}`, videoBlobToUpload);
          isLocal = false;
        } catch (uploadErr) {
          console.warn("Firebase Storage upload failed for video, falling back to local IndexedDB:", uploadErr);
          if (localUploadedFile) {
            // Save file in local IndexedDB
            await saveVideoFile(docId, localUploadedFile);
          }
          finalUrl = `local://${docId}`;
          isLocal = true;
          triggerToast("Video saved locally (Storage upload failed). ⚠️");
        }
      }

      try {
        const docRef = doc(db, "videos", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          await updateDoc(docRef, {
            title: videoTitle.trim(),
            artist: videoArtist.trim(),
            url: finalUrl,
            category: videoCategory.trim(),
            description: videoDescription.trim(),
            isLocal: isLocal
          });
        } else {
          await setDoc(docRef, {
            id: docId,
            title: videoTitle.trim(),
            artist: videoArtist.trim(),
            url: finalUrl,
            category: videoCategory.trim(),
            description: videoDescription.trim(),
            isLocal: isLocal,
            createdAt: serverTimestamp()
          });
        }
      } catch (firestoreError: any) {
        handleFirestoreError(firestoreError, isNewVideo ? OperationType.CREATE : OperationType.UPDATE, `videos/${docId}`);
      }

      triggerToast(isNewVideo ? "New Video curated successfully! 🎥✨" : "Video updated successfully! 🎥✨");
      setIsNewVideo(false);
      setSelectedVideoId(docId);
      setLocalUploadedFile(null);
      setAttemptedVideoSubmit(false);
      setVideoErrors({});
    } catch (e: any) {
      console.error(e);
      triggerToast("Firestore Error: " + (e.message || "Failed to save video"));
    }
  };

  // Delete Video
  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video? This is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "videos", id));
      await deleteVideoFile(id);
      triggerToast("Video deleted successfully.");
      handleInitNewVideo();
    } catch (e: any) {
      triggerToast("Error deleting video: " + e.message);
    }
  };

  // Drag and Drop helpers for local video upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setLocalUploadedFile(file);
        if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        triggerToast(`Selected video: ${file.name}`);
      } else {
        triggerToast("Please select a valid video file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setLocalUploadedFile(file);
        if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        triggerToast(`Selected video: ${file.name}`);
      } else {
        triggerToast("Please select a valid video file.");
      }
    }
  };

  // ==========================================
  // AUTHORS CRUD & HANDLERS
  // ==========================================
  const validateAuthorForm = () => {
    const newErrors: typeof authorErrors = {};
    if (!authorName.trim()) newErrors.name = "Author name is required.";
    if (!authorActiveYears.trim()) newErrors.activeYears = "Active years / Era is required (e.g. 1797-1869).";
    if (authorIsLocalImage && !authorLocalFile && !authorImageUrl) {
      newErrors.image = "Please upload an author photo.";
    } else if (!authorIsLocalImage && !authorImageUrl.trim()) {
      newErrors.image = "Photo URL is required.";
    }
    setAuthorErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectAuthor = async (author: Author) => {
    if (authorPreviewUrl && authorPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(authorPreviewUrl);
    }
    setAuthorErrors({});
    setAttemptedAuthorSubmit(false);
    setSelectedAuthorId(author.id);
    setAuthorName(author.name);
    setAuthorBio(author.bio || "");
    setAuthorBirthPlace(author.birthPlace || "");
    setAuthorActiveYears(author.activeYears || "");
    setAuthorImageUrl(author.imageUrl || "");
    setAuthorIsLocalImage(!!author.isLocalImage);
    setAuthorLocalFile(null);
    setIsNewAuthor(false);

    if (author.isLocalImage) {
      try {
        const fileBlob = await getMediaFile(author.id);
        if (fileBlob) {
          const objectUrl = URL.createObjectURL(fileBlob);
          setAuthorPreviewUrl(objectUrl);
        } else {
          setAuthorPreviewUrl("");
        }
      } catch (err) {
        console.error("Failed to load local author photo:", err);
        setAuthorPreviewUrl("");
      }
    } else {
      setAuthorPreviewUrl(author.imageUrl || "");
    }
  };

  const handleInitNewAuthor = () => {
    if (authorPreviewUrl && authorPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(authorPreviewUrl);
    }
    setAuthorErrors({});
    setAttemptedAuthorSubmit(false);
    setSelectedAuthorId(null);
    setAuthorName("");
    setAuthorBio("");
    setAuthorBirthPlace("");
    setAuthorActiveYears("");
    setAuthorImageUrl("");
    setAuthorIsLocalImage(false);
    setAuthorLocalFile(null);
    setAuthorPreviewUrl("");
    setIsNewAuthor(true);
  };

  const handleSaveAuthor = async () => {
    setAttemptedAuthorSubmit(true);
    if (!validateAuthorForm()) {
      triggerToast("Please fill in all required author fields. ⚠️");
      return;
    }

    const docId = selectedAuthorId || "auth_" + Date.now();
    let finalImageUrl = authorImageUrl.trim();
    let isLocal = authorIsLocalImage;

    try {
      let authorBlobToUpload = authorLocalFile;
      if (isLocal && !authorBlobToUpload && finalImageUrl.startsWith("local://")) {
        try {
          const cachedBlob = await getMediaFile(docId);
          if (cachedBlob) {
            authorBlobToUpload = cachedBlob as File;
          }
        } catch (err) {
          console.warn("Failed to retrieve cached author blob for upload:", err);
        }
      }

      if (isLocal && authorBlobToUpload) {
        try {
          triggerToast("Uploading author photo to Firebase Storage... ⏳");
          finalImageUrl = await uploadToStorage(`authors/${docId}_${authorBlobToUpload.name || "author.jpg"}`, authorBlobToUpload);
          isLocal = false;
        } catch (uploadErr) {
          console.warn("Firebase Storage upload failed, falling back to local IndexedDB:", uploadErr);
          if (authorLocalFile) {
            await saveMediaFile(docId, authorLocalFile);
          }
          finalImageUrl = `local://${docId}`;
          isLocal = true;
          triggerToast("Image saved locally (Storage upload failed). ⚠️");
        }
      }

      try {
        const docRef = doc(db, "authors", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          await updateDoc(docRef, {
            name: authorName.trim(),
            bio: authorBio.trim(),
            birthPlace: authorBirthPlace.trim(),
            activeYears: authorActiveYears.trim(),
            imageUrl: finalImageUrl,
            isLocalImage: isLocal
          });
        } else {
          await setDoc(docRef, {
            id: docId,
            name: authorName.trim(),
            bio: authorBio.trim(),
            birthPlace: authorBirthPlace.trim(),
            activeYears: authorActiveYears.trim(),
            imageUrl: finalImageUrl,
            isLocalImage: isLocal,
            createdAt: serverTimestamp()
          });
        }
      } catch (firestoreError: any) {
        handleFirestoreError(firestoreError, isNewAuthor ? OperationType.CREATE : OperationType.UPDATE, `authors/${docId}`);
      }

      triggerToast(isNewAuthor ? "Author registered successfully! ✍️✨" : "Author updated successfully! ✍️✨");
      setIsNewAuthor(false);
      setSelectedAuthorId(docId);
      setAuthorLocalFile(null);
      setAttemptedAuthorSubmit(false);
      setAuthorErrors({});
    } catch (e: any) {
      console.error(e);
      triggerToast("Error saving author: " + (e.message || e));
    }
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Author and all their associated books? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "authors", id));
      await deleteMediaFile(id);

      const authorBooks = books.filter(b => b.authorId === id);
      for (const b of authorBooks) {
        await deleteDoc(doc(db, "books", b.id));
        await deleteMediaFile(`cover_${b.id}`);
        await deleteMediaFile(`audio_${b.id}`);
        await deleteMediaFile(`video_${b.id}`);
      }

      triggerToast("Author and all their books deleted successfully.");
      handleInitNewAuthor();
    } catch (e: any) {
      triggerToast("Error deleting author: " + e.message);
    }
  };

  // ==========================================
  // BOOKS CRUD & HANDLERS
  // ==========================================
  const validateBookForm = () => {
    const newErrors: typeof bookErrors = {};
    if (!bookTitle.trim()) newErrors.title = "Book title is required.";
    if (!bookAuthorId) newErrors.authorId = "Please select an Author.";
    
    if (bookCoverType === "upload" && !bookLocalCoverFile && !bookCoverUrl) {
      newErrors.cover = "Please upload a book cover image.";
    } else if (bookCoverType === "link" && !bookCoverUrl.trim()) {
      newErrors.cover = "Cover image URL is required.";
    }

    if (bookAudioType === "upload" && !bookLocalAudioFile && !bookAudioUrl) {
      newErrors.audio = "Please upload a narrated audio file.";
    }

    if (bookVideoSourceType === "upload" && !bookLocalVideoFile && !bookVideoUrl) {
      newErrors.video = "Please upload a recitation video file.";
    } else if (bookVideoSourceType === "youtube" && bookVideoUrl.trim()) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = bookVideoUrl.match(regExp);
      const ytId = (match && match[2].length === 11) ? match[2] : null;
      if (bookVideoUrl && !ytId) {
        newErrors.video = "Please enter a valid YouTube video URL.";
      }
    }
    setBookErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectBook = async (book: Book) => {
    if (bookCoverPreviewUrl && bookCoverPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(bookCoverPreviewUrl);
    }
    if (bookVideoPreviewUrl && bookVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(bookVideoPreviewUrl);
    }
    
    setBookErrors({});
    setAttemptedBookSubmit(false);
    setSelectedBookId(book.id);
    setBookAuthorId(book.authorId);
    setBookTitle(book.title);
    setBookDescription(book.description || "");
    setBookGenre(book.genre || "");
    setBookLiteraryPeriod(book.literaryPeriod || "");
    
    setBookCoverUrl(book.coverImageUrl || "");
    setBookIsLocalCover(!!book.isLocalCover);
    setBookCoverType(book.isLocalCover ? "upload" : "link");
    setBookLocalCoverFile(null);

    setBookAudioUrl(book.audioUrl || "");
    setBookIsLocalAudio(!!book.isLocalAudio);
    setBookAudioType(book.isLocalAudio ? "upload" : "link");
    setBookLocalAudioFile(null);

    setBookVideoUrl(book.videoUrl || "");
    setBookVideoSourceType(book.videoType || "youtube");
    setBookLocalVideoFile(null);

    setIsNewBook(false);
    setBookFiles((book as any).files || []);

    if (book.isLocalCover) {
      try {
        const coverBlob = await getMediaFile(`cover_${book.id}`);
        if (coverBlob) {
          setBookCoverPreviewUrl(URL.createObjectURL(coverBlob));
        } else {
          setBookCoverPreviewUrl("");
        }
      } catch (err) {
        console.error(err);
        setBookCoverPreviewUrl("");
      }
    } else {
      setBookCoverPreviewUrl(book.coverImageUrl || "");
    }

    if (book.videoType === "upload") {
      try {
        const videoBlob = await getMediaFile(`video_${book.id}`);
        if (videoBlob) {
          setBookVideoPreviewUrl(URL.createObjectURL(videoBlob));
        } else {
          setBookVideoPreviewUrl("");
        }
      } catch (err) {
        console.error(err);
        setBookVideoPreviewUrl("");
      }
    } else {
      setBookVideoPreviewUrl("");
    }
  };

  const handleInitNewBook = () => {
    if (bookCoverPreviewUrl && bookCoverPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(bookCoverPreviewUrl);
    }
    if (bookVideoPreviewUrl && bookVideoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(bookVideoPreviewUrl);
    }

    setBookErrors({});
    setAttemptedBookSubmit(false);
    setSelectedBookId(null);
    setBookAuthorId("");
    setBookTitle("");
    setBookDescription("");
    setBookGenre("");
    setBookLiteraryPeriod("");
    setBookCoverUrl("");
    setBookIsLocalCover(false);
    setBookCoverType("link");
    setBookLocalCoverFile(null);
    setBookCoverPreviewUrl("");

    setBookAudioUrl("");
    setBookIsLocalAudio(false);
    setBookAudioType("link");
    setBookLocalAudioFile(null);

    setBookVideoUrl("");
    setBookVideoSourceType("youtube");
    setBookLocalVideoFile(null);
    setBookVideoPreviewUrl("");
    setBookFiles([]);

    setIsNewBook(true);
  };

  const handleSaveBook = async () => {
    setAttemptedBookSubmit(true);
    if (!validateBookForm()) {
      triggerToast("Please resolve all book errors. ⚠️");
      return;
    }

    setIsSavingBook(true);

    const docId = selectedBookId || "book_" + Date.now();
    let finalCoverUrl = bookCoverUrl.trim();
    let finalAudioUrl = bookAudioUrl.trim();
    let finalVideoUrl = bookVideoUrl.trim();

    try {
      let isLocalCover = bookCoverType === "upload";
      let coverBlobToUpload = bookLocalCoverFile;
      if (isLocalCover && !coverBlobToUpload && finalCoverUrl.startsWith("local://")) {
        try {
          const cachedBlob = await getMediaFile(`cover_${docId}`);
          if (cachedBlob) {
            coverBlobToUpload = cachedBlob as File;
          }
        } catch (err) {
          console.warn("Failed to retrieve cached cover blob for upload:", err);
        }
      }

      if (isLocalCover && coverBlobToUpload) {
        try {
          setBookSavingStatus("Uploading book cover image...");
          triggerToast("Uploading cover image to Firebase Storage... ⏳");
          finalCoverUrl = await uploadToStorage(`books/covers/${docId}_${coverBlobToUpload.name || "cover.jpg"}`, coverBlobToUpload);
          isLocalCover = false;
        } catch (uploadErr) {
          console.warn("Firebase Storage upload failed for cover, falling back to IndexedDB:", uploadErr);
          if (bookLocalCoverFile) {
            await saveMediaFile(`cover_${docId}`, bookLocalCoverFile);
          }
          finalCoverUrl = `local://cover_${docId}`;
          isLocalCover = true;
          triggerToast("Cover saved locally (Storage upload failed). ⚠️");
        }
      }

      let isLocalAudio = bookAudioType === "upload";
      let audioBlobToUpload = bookLocalAudioFile;
      if (isLocalAudio && !audioBlobToUpload && finalAudioUrl.startsWith("local://")) {
        try {
          const cachedBlob = await getMediaFile(`audio_${docId}`);
          if (cachedBlob) {
            audioBlobToUpload = cachedBlob as File;
          }
        } catch (err) {
          console.warn("Failed to retrieve cached audio blob for upload:", err);
        }
      }

      if (isLocalAudio && audioBlobToUpload) {
        try {
          setBookSavingStatus("Uploading audiobook track...");
          triggerToast("Uploading audiobook to Firebase Storage... ⏳");
          finalAudioUrl = await uploadToStorage(`books/audios/${docId}_${audioBlobToUpload.name || "audio.mp3"}`, audioBlobToUpload);
          isLocalAudio = false;
        } catch (uploadErr) {
          console.warn("Firebase Storage upload failed for audio, falling back to IndexedDB:", uploadErr);
          if (bookLocalAudioFile) {
            await saveMediaFile(`audio_${docId}`, bookLocalAudioFile);
          }
          finalAudioUrl = `local://audio_${docId}`;
          isLocalAudio = true;
          triggerToast("Audio saved locally (Storage upload failed). ⚠️");
        }
      }

      let isLocalVideo = bookVideoSourceType === "upload";
      let videoBlobToUpload = bookLocalVideoFile;
      if (isLocalVideo && !videoBlobToUpload && finalVideoUrl.startsWith("local://")) {
        try {
          const cachedBlob = await getMediaFile(`video_${docId}`);
          if (cachedBlob) {
            videoBlobToUpload = cachedBlob as File;
          }
        } catch (err) {
          console.warn("Failed to retrieve cached video blob for upload:", err);
        }
      }

      if (isLocalVideo && videoBlobToUpload) {
        try {
          setBookSavingStatus("Uploading cinematic video content...");
          triggerToast("Uploading video to Firebase Storage... ⏳");
          finalVideoUrl = await uploadToStorage(`books/videos/${docId}_${videoBlobToUpload.name || "video.mp4"}`, videoBlobToUpload);
        } catch (uploadErr) {
          console.warn("Firebase Storage upload failed for video, falling back to IndexedDB:", uploadErr);
          if (bookLocalVideoFile) {
            await saveMediaFile(`video_${docId}`, bookLocalVideoFile);
          }
          finalVideoUrl = `local://video_${docId}`;
          triggerToast("Video saved locally (Storage upload failed). ⚠️");
        }
      }

      // Automatically incorporate any pending file in the uploader that the user forgot to add via "Add Attachment"
      let finalFilesList = [...bookFiles];
      if (newFileTypeSource === "upload" && newLocalFile) {
        const name = newFileName.trim() || newLocalFile.name;
        finalFilesList.push({
          id: "file_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          name,
          type: newFileType,
          url: "",
          isLocal: true,
          localFile: newLocalFile
        });
        // Clear uploader state
        setNewLocalFile(null);
        setNewFileName("");
      } else if (newFileTypeSource === "link" && newFileUrl.trim()) {
        const name = newFileName.trim() || newFileUrl.split("/").pop() || `Book_File.${newFileType}`;
        finalFilesList.push({
          id: "file_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          name,
          type: newFileType,
          url: newFileUrl.trim(),
          isLocal: false
        });
        // Clear uploader state
        setNewFileUrl("");
        setNewFileName("");
      }

      // Save book attachments to Firebase Storage if they are uploaded files, with fallback to IndexedDB
      setBookSavingStatus("Uploading book attachment documents...");
      const savedFiles = await Promise.all(
        finalFilesList.map(async (f) => {
          let attachmentBlob = f.localFile;
          if (f.isLocal && !attachmentBlob) {
            // Retrieve from IndexedDB fallback
            const key = f.url ? f.url.replace("local://", "") : f.id;
            try {
              const cachedBlob = await getMediaFile(key);
              if (cachedBlob) {
                attachmentBlob = cachedBlob as File;
                console.log(`Successfully retrieved attachment blob from IndexedDB for ${f.name}`);
              }
            } catch (err) {
              console.warn(`Failed to retrieve cached attachment blob for ${f.name}:`, err);
            }
          }

          if (f.isLocal && attachmentBlob) {
            try {
              triggerToast(`Uploading attachment "${f.name}" to Firebase Storage... ⏳`);
              const fileUrl = await uploadToStorage(`books/attachments/${docId}/${f.id}_${f.name}`, attachmentBlob);
              return {
                id: f.id,
                name: f.name,
                type: f.type,
                url: fileUrl,
                isLocal: false,
                thumbnailUrl: f.thumbnailUrl
              };
            } catch (uploadErr) {
              console.warn(`Firebase Storage upload failed for attachment ${f.name}, falling back to IndexedDB:`, uploadErr);
              if (f.localFile) {
                // Save clean path under direct file ID key
                await saveMediaFile(f.id, f.localFile);
              }
              return {
                id: f.id,
                name: f.name,
                type: f.type,
                url: f.url || `local://${f.id}`,
                isLocal: true,
                thumbnailUrl: f.thumbnailUrl
              };
            }
          }
          return {
            id: f.id || "",
            name: f.name || "",
            type: f.type || "",
            url: f.url || "",
            isLocal: !!f.isLocal,
            thumbnailUrl: f.thumbnailUrl || ""
          };
        })
      );

      try {
        setBookSavingStatus("Writing book record to Adab database...");
        const docRef = doc(db, "books", docId);
        const docSnap = await getDoc(docRef);

        const dataPayload = {
          authorId: bookAuthorId,
          title: bookTitle.trim(),
          description: bookDescription.trim(),
          coverImageUrl: finalCoverUrl,
          isLocalCover: isLocalCover,
          audioUrl: finalAudioUrl,
          isLocalAudio: isLocalAudio,
          videoUrl: finalVideoUrl,
          videoType: bookVideoSourceType,
          files: savedFiles,
          genre: bookGenre.trim(),
          literaryPeriod: bookLiteraryPeriod.trim()
        };

        if (docSnap.exists()) {
          await updateDoc(docRef, sanitizeForFirestore(dataPayload));
        } else {
          await setDoc(docRef, sanitizeForFirestore({
            ...dataPayload,
            id: docId,
            createdAt: serverTimestamp()
          }));
        }
      } catch (firestoreError: any) {
        handleFirestoreError(firestoreError, isNewBook ? OperationType.CREATE : OperationType.UPDATE, `books/${docId}`);
      }

      triggerToast(isNewBook ? "Book published successfully! 📚✨" : "Book updated successfully! 📚✨");
      setIsNewBook(false);
      setSelectedBookId(docId);
      setBookLocalCoverFile(null);
      setBookLocalAudioFile(null);
      setBookLocalVideoFile(null);
      setBookFiles(savedFiles);
      setAttemptedBookSubmit(false);
      setBookErrors({});
    } catch (e: any) {
      console.error(e);
      triggerToast("Error saving book: " + e.message);
    } finally {
      setIsSavingBook(false);
      setBookSavingStatus("");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      // Clean up any associated local PDF/EPUB files in IndexedDB
      const bookObj = books.find(b => b.id === id);
      if (bookObj && bookObj.files) {
        for (const file of bookObj.files) {
          if (file.isLocal) {
            // Clean up both potential key formats
            await deleteMediaFile(`file_${id}_${file.id}`);
            await deleteMediaFile(file.id);
          }
        }
      }

      await deleteDoc(doc(db, "books", id));
      await deleteMediaFile(`cover_${id}`);
      await deleteMediaFile(`audio_${id}`);
      await deleteMediaFile(`video_${id}`);

      triggerToast("Book deleted successfully.");
      handleInitNewBook();
    } catch (e: any) {
      triggerToast("Error deleting book: " + e.message);
    }
  };

  // Handle poet selection
  const handleSelectPoet = (poet: any) => {
    setSelectedPoetId(poet.id);
    setPoetName(poet.name);
    setPoetEra(poet.era);
    setPoetTitle(poet.title);
    setPoetBio(poet.bio);
    setIsNewPoet(false);
  };

  const handleInitNewPoet = () => {
    setSelectedPoetId(null);
    setPoetName("");
    setPoetEra("");
    setPoetTitle("");
    setPoetBio("");
    setIsNewPoet(true);
  };

  // Save Poet
  const handleSavePoet = async () => {
    if (!poetName.trim()) {
      triggerToast("Poet name is required!");
      return;
    }
    const docId = selectedPoetId || poetName.trim().replace(/\s+/g, "_").toLowerCase();
    
    try {
      await setDoc(doc(db, "poets", docId), {
        name: poetName.trim(),
        era: poetEra.trim(),
        title: poetTitle.trim(),
        bio: poetBio.trim()
      });
      triggerToast(isNewPoet ? "New Poet created successfully! ✨" : "Poet updated successfully! ✨");
      setIsNewPoet(false);
      setSelectedPoetId(docId);
    } catch (e: any) {
      console.error(e);
      triggerToast("Firestore Error: " + (e.message || "Failed to save poet"));
    }
  };

  // Delete Poet
  const handleDeletePoet = async (id: string) => {
    if (!confirm("Are you sure you want to delete this poet? This is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "poets", id));
      triggerToast("Poet deleted successfully.");
      handleInitNewPoet();
    } catch (e: any) {
      triggerToast("Error deleting poet: " + e.message);
    }
  };

  // Handle Ghazal selection
  const handleSelectGhazal = (g: Ghazal) => {
    setSelectedGhazalId(g.id);
    setGhazalTitle(g.title);
    setGhazalPoet(g.poet);
    setGhazalCategory(g.category || "");
    setGhazalBackground(g.backgroundStory || "");
    setGhazalShers([...g.shers]);
    setGhazalGenre(g.genre || "Ghazal");
    setIsNewGhazal(false);
    
    // Close sher sub-editors
    setEditingSherIdx(null);
    setIsAddingSher(false);
  };

  const handleInitNewGhazal = () => {
    setSelectedGhazalId(null);
    setGhazalTitle("");
    setGhazalPoet(poets[0]?.name || "");
    setGhazalCategory("");
    setGhazalBackground("");
    setGhazalShers([]);
    setGhazalGenre("Ghazal");
    setIsNewGhazal(true);
    
    // Close sher sub-editors
    setEditingSherIdx(null);
    setIsAddingSher(false);
  };

  // Save Ghazal
  const handleSaveGhazal = async () => {
    if (!ghazalTitle.trim()) {
      triggerToast("Ghazal Title is required!");
      return;
    }
    if (!ghazalPoet) {
      triggerToast("Please select or specify a Poet.");
      return;
    }
    if (ghazalShers.length === 0) {
      triggerToast("Please add at least one couplet (Sher) to this ghazal.");
      return;
    }

    const docId = selectedGhazalId || "ghazal_" + Date.now();

    try {
      await setDoc(doc(db, "ghazals", docId), {
        id: docId,
        title: ghazalTitle.trim(),
        poet: ghazalPoet,
        category: ghazalCategory.trim(),
        backgroundStory: ghazalBackground.trim(),
        shers: ghazalShers,
        genre: ghazalGenre
      });
      triggerToast(isNewGhazal ? `New ${ghazalGenre} entry created! ✨📖` : `${ghazalGenre} entry updated successfully! ✨📖`);
      setIsNewGhazal(false);
      setSelectedGhazalId(docId);
    } catch (e: any) {
      triggerToast("Firestore Error: " + (e.message || "Failed to save ghazal"));
    }
  };

  // Delete Ghazal
  const handleDeleteGhazal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Ghazal? This is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "ghazals", id));
      triggerToast("Ghazal deleted successfully.");
      handleInitNewGhazal();
    } catch (e: any) {
      triggerToast("Error deleting ghazal: " + e.message);
    }
  };

  // Sher Sub-Editor Actions
  const handleOpenAddSher = () => {
    setEditingSherIdx(null);
    setSherUrdu("");
    setSherRoman("");
    setSherEnglish("");
    setSherExplanation("");
    setIsAddingSher(true);
  };

  const handleOpenEditSher = (idx: number) => {
    const s = ghazalShers[idx];
    setEditingSherIdx(idx);
    setSherUrdu(s.urdu);
    setSherRoman(s.roman || "");
    setSherEnglish(s.english || "");
    setSherExplanation(s.explanation || "");
    setIsAddingSher(false);
  };

  const handleCommitSher = () => {
    if (!sherUrdu.trim()) {
      triggerToast("Urdu script couplet text is required!");
      return;
    }

    const newSher: Sher = {
      id: editingSherIdx !== null ? ghazalShers[editingSherIdx].id : "sher_" + Date.now(),
      urdu: sherUrdu.trim(),
      roman: sherRoman.trim(),
      english: sherEnglish.trim(),
      explanation: sherExplanation.trim(),
      poet: ghazalPoet || "Unknown"
    };

    if (editingSherIdx !== null) {
      // Edit
      const updated = [...ghazalShers];
      updated[editingSherIdx] = newSher;
      setGhazalShers(updated);
      setEditingSherIdx(null);
      triggerToast("Couplet updated in buffer.");
    } else {
      // Add
      setGhazalShers([...ghazalShers, newSher]);
      setIsAddingSher(false);
      triggerToast("New couplet added to buffer.");
    }

    // Clean states
    setSherUrdu("");
    setSherRoman("");
    setSherEnglish("");
    setSherExplanation("");
  };

  const handleRemoveSherFromGhazal = (idx: number) => {
    const updated = ghazalShers.filter((_, i) => i !== idx);
    setGhazalShers(updated);
    triggerToast("Couplet removed from buffer.");
    if (editingSherIdx === idx) setEditingSherIdx(null);
  };

  const handleMoveSher = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === ghazalShers.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...ghazalShers];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setGhazalShers(updated);

    if (editingSherIdx === idx) setEditingSherIdx(targetIdx);
    else if (editingSherIdx === targetIdx) setEditingSherIdx(idx);
  };

  const handleSelectCouplet = (couplet: any) => {
    setSelectedCoupletId(couplet.id);
    setCoupletUrdu(couplet.urdu || "");
    setCoupletRoman(couplet.roman || "");
    setCoupletEnglish(couplet.english || "");
    setCoupletPoet(couplet.poet || "");
    setCoupletExplanation(couplet.explanation || "");
    setCoupletCategory(couplet.category || "Sher");
    setCoupletActiveDate(couplet.activeDate || "");
    setIsNewCouplet(false);
    setCoupletErrors({});
    setAttemptedCoupletSubmit(false);
  };

  const handleInitNewCouplet = () => {
    const newId = `couplet_${Date.now()}`;
    setSelectedCoupletId(newId);
    setCoupletUrdu("");
    setCoupletRoman("");
    setCoupletEnglish("");
    setCoupletPoet("");
    setCoupletExplanation("");
    setCoupletCategory("Sher");
    setCoupletActiveDate("");
    setIsNewCouplet(true);
    setCoupletErrors({});
    setAttemptedCoupletSubmit(false);
  };

  const handleSaveCouplet = async () => {
    setAttemptedCoupletSubmit(true);
    const errors: any = {};
    if (!coupletUrdu.trim()) errors.urdu = "Urdu couplet text is required";
    if (!coupletPoet.trim()) errors.poet = "Poet is required";
    if (!coupletCategory) errors.category = "Category is required";

    if (Object.keys(errors).length > 0) {
      setCoupletErrors(errors);
      triggerToast("Please fill in all required fields.");
      return;
    }

    if (!selectedCoupletId) return;

    try {
      const data: any = {
        id: selectedCoupletId,
        urdu: coupletUrdu.trim(),
        poet: coupletPoet.trim(),
        category: coupletCategory,
        createdAt: serverTimestamp()
      };
      if (coupletRoman.trim()) data.roman = coupletRoman.trim();
      if (coupletEnglish.trim()) data.english = coupletEnglish.trim();
      if (coupletExplanation.trim()) data.explanation = coupletExplanation.trim();
      if (coupletActiveDate.trim()) data.activeDate = coupletActiveDate.trim();

      if (!isNewCouplet) {
        const existing = dailyCouplets.find(c => c.id === selectedCoupletId);
        if (existing && existing.createdAt) {
          data.createdAt = existing.createdAt;
        }
      }

      await setDoc(doc(db, "daily_couplets", selectedCoupletId), data);
      triggerToast(isNewCouplet ? "Daily couplet registered successfully! ✍️✨" : "Daily couplet updated successfully! ✍️✨");
      setIsNewCouplet(false);
    } catch (e) {
      console.error("Failed to save couplet:", e);
      triggerToast("Error saving daily couplet: " + (e as any).message);
    }
  };

  const handleDeleteCouplet = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this daily couplet?")) return;
    try {
      await deleteDoc(doc(db, "daily_couplets", id));
      triggerToast("Daily couplet deleted successfully.");
      setSelectedCoupletId(null);
      setCoupletUrdu("");
      setCoupletRoman("");
      setCoupletEnglish("");
      setCoupletPoet("");
      setCoupletExplanation("");
      setCoupletActiveDate("");
    } catch (e) {
      console.error("Failed to delete couplet:", e);
      triggerToast("Error deleting couplet: " + (e as any).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-8" id="zauq-admin-panel">
      {/* Dev Disclaimer & Auth Lock */}
      {!user ? (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-500 mb-4 animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-amber-200 mb-2">Authenticated Access Required</h2>
          <p className="text-stone-400 text-xs leading-relaxed mb-6 max-w-md">
            The Content Administration Dashboard is secure. Please authenticate via Google Cloud Sync to manage the poets, ghazals, and global poetry assets.
          </p>
          <button
            onClick={onSignIn}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Connect with Google</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: NAVIGATION & DIRECTORY LIST */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Header / Admin Info */}
            <div className="bg-stone-900/30 p-5 rounded-2xl border border-stone-900 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-2.5">
                <Settings className="w-4.5 h-4.5 text-amber-400" />
                <h3 className="text-sm font-serif font-bold text-amber-200 uppercase tracking-wide">
                  Content Administration
                </h3>
              </div>
              <p className="text-[10px] text-stone-400 leading-normal">
                {isAdmin ? (
                  <span className="text-emerald-400 font-semibold">✓ Logged in as Primary Administrator ({user.email})</span>
                ) : (
                  <span className="text-amber-500/90 font-mono">⚠️ Dev Sandbox Mode • Full Create/Edit Permissions Allowed</span>
                )}
              </p>
            </div>

            {/* Sub-Tabs: Poets, Ghazals, Videos, Authors, Books, Couplets, Branding, CMS Pages, Security, or Audit Log */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-10 gap-1 p-1 bg-stone-950/80 border border-stone-900 rounded-2xl">
              <button
                onClick={() => {
                  setActiveSubTab("ghazals");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "ghazals"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ghazals ({ghazals.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("poets");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "poets"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Poets ({poets.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("videos");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "videos"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Videos ({videos.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("authors");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "authors"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Library className="w-3.5 h-3.5" />
                <span>Authors ({authors.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("books");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "books"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Books ({books.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("couplets");
                  setSearchQuery("");
                  setSelectedCoupletId(null);
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "couplets"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily ({dailyCouplets.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("settings");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "settings"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Branding</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("cms");
                  setSearchQuery("");
                  setSelectedCmsPageId(null);
                  setCmsPageTitle("");
                  setCmsPageContent("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "cms"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CMS Pages</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("security");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "security"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("audit");
                  setSearchQuery("");
                }}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-semibold font-serif tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeSubTab === "audit"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Log</span>
              </button>
            </div>

            {/* Search */}
            {activeSubTab !== "settings" && activeSubTab !== "cms" && activeSubTab !== "security" && activeSubTab !== "audit" && (
              <div className="bg-stone-900/40 p-4 rounded-2xl border border-stone-900/80 backdrop-blur-md">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      activeSubTab === "poets" 
                        ? "Search poets..." 
                        : activeSubTab === "ghazals" 
                        ? "Search ghazal titles..." 
                        : activeSubTab === "videos" 
                        ? "Search video details..." 
                        : activeSubTab === "authors" 
                        ? "Search authors..." 
                        : activeSubTab === "books"
                        ? "Search books..."
                        : "Search daily couplets..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-885 text-stone-200 placeholder-stone-600 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600">🔍</span>
                </div>
              </div>
            )}

            {/* Master Selector List */}
            {activeSubTab !== "settings" && activeSubTab !== "cms" ? (
              <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 max-h-[450px] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
                  {activeSubTab === "poets" 
                    ? "Select Poet" 
                    : activeSubTab === "ghazals" 
                    ? "Select Ghazal" 
                    : activeSubTab === "videos" 
                    ? "Select Video" 
                    : activeSubTab === "authors" 
                    ? "Select Author" 
                    : activeSubTab === "books"
                    ? "Select Book"
                    : "Select Daily Couplet"}
                </span>
                <button
                  onClick={
                    activeSubTab === "poets" 
                      ? handleInitNewPoet 
                      : activeSubTab === "ghazals" 
                      ? handleInitNewGhazal 
                      : activeSubTab === "videos" 
                      ? handleInitNewVideo 
                      : activeSubTab === "authors" 
                      ? handleInitNewAuthor 
                      : activeSubTab === "books"
                      ? handleInitNewBook
                      : handleInitNewCouplet
                  }
                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all font-bold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add New</span>
                </button>
              </div>

              {activeSubTab === "poets" ? (
                filteredPoets.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No poets found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredPoets.map((p) => {
                      const isSelected = selectedPoetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPoet(p)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors">
                              {p.name}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">
                              {p.era} • {p.title?.split(" ")[0]}
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeSubTab === "ghazals" ? (
                filteredGhazals.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No ghazals found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredGhazals.map((g) => {
                      const isSelected = selectedGhazalId === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => handleSelectGhazal(g)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors truncate">
                              {g.title}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">
                              {g.poet} • {g.genre || "Ghazal"} • {g.shers?.length || 0} couplets
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeSubTab === "authors" ? (
                filteredAuthors.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No authors registered.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredAuthors.map((auth) => {
                      const isSelected = selectedAuthorId === auth.id;
                      return (
                        <button
                          key={auth.id}
                          onClick={() => handleSelectAuthor(auth)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors truncate">
                              {auth.name}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">
                              {auth.activeYears || "Classic Era"}
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeSubTab === "books" ? (
                filteredBooks.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No books published.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredBooks.map((bk) => {
                      const isSelected = selectedBookId === bk.id;
                      const authName = authors.find(a => a.id === bk.authorId)?.name || "Unknown Author";
                      return (
                        <button
                          key={bk.id}
                          onClick={() => handleSelectBook(bk)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors truncate">
                              {bk.title}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500 truncate block">
                              By {authName}
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeSubTab === "couplets" ? (
                filteredCouplets.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No daily couplets registered.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredCouplets.map((c) => {
                      const isSelected = selectedCoupletId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCouplet(c)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors truncate">
                              {c.urdu}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500 truncate block">
                              By {c.poet} • {c.category} {c.activeDate ? `• Date: ${c.activeDate}` : ""}
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                filteredVideos.length === 0 ? (
                  <p className="text-xs text-stone-600 text-center py-8">No videos found.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredVideos.map((v) => {
                      const isSelected = selectedVideoId === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleSelectVideo(v)}
                          className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between group cursor-pointer ${
                            isSelected
                              ? "bg-amber-950/20 border-amber-500/30 text-amber-100 shadow-md"
                              : "bg-stone-900/40 border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-serif font-semibold block group-hover:text-amber-200 transition-colors truncate">
                              {v.title}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">
                              {v.artist} • {v.category}
                            </span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? "text-amber-400 translate-x-1" : "text-stone-600 group-hover:text-stone-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          ) : activeSubTab === "audit" ? (
            <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 flex flex-col gap-5 text-left animate-fadeIn">
              {/* Audit Controls & Quick Stats */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold border-b border-stone-900 pb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  Audit Analytics
                </h4>
                <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed font-serif">
                  Real-time intelligence from the Gatekeeper. Track active session events, saves, commentaries, and progress updates.
                </p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-900/60">
                  <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider block mb-0.5">Total Logs</span>
                  <span className="text-base font-serif font-bold text-amber-300">
                    {auditLogs.length}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-900/60">
                  <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider block mb-0.5">Logins</span>
                  <span className="text-base font-serif font-bold text-blue-400">
                    {auditLogs.filter(log => log.action === "sign_in").length}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-900/60">
                  <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider block mb-0.5">Saves / Adds</span>
                  <span className="text-base font-serif font-bold text-emerald-400">
                    {auditLogs.filter(log => log.action === "save_sher").length}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-900/60">
                  <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider block mb-0.5">Reviews</span>
                  <span className="text-base font-serif font-bold text-purple-400">
                    {auditLogs.filter(log => log.action === "add_review" || log.action === "edit_review" || log.action === "delete_review").length}
                  </span>
                </div>
              </div>

              {/* Filter List */}
              <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-900/80 flex flex-col gap-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 block">Filter Feed</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: "all", label: "All Activities", count: auditLogs.length, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                    { id: "sign_in", label: "Logins", count: auditLogs.filter(l => l.action === "sign_in").length, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                    { id: "save_sher", label: "Couplet Saves", count: auditLogs.filter(l => l.action === "save_sher").length, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    { id: "review", label: "Reviews", count: auditLogs.filter(l => l.action === "add_review" || l.action === "edit_review" || l.action === "delete_review").length, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                    { id: "update_progress", label: "Book Progress", count: auditLogs.filter(l => l.action === "update_progress").length, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
                  ].map(filter => {
                    const isSelected = selectedAuditFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedAuditFilter(filter.id)}
                        className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-serif transition-all border flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? filter.color
                            : "bg-stone-950/40 border-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-900"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900/60 text-stone-500">
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeSubTab === "security" ? (
            <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 flex flex-col gap-4 text-left">
              <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold border-b border-stone-900 pb-2 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Security Gateway
              </h4>
              <p className="text-[10px] text-stone-400 leading-relaxed font-serif">
                Configure standard user authentication blockades, blacklist malicious actors, and investigate wrong activity logs.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">Policy Reminder</span>
                <p className="text-[10px] text-stone-400 leading-normal font-serif">
                  You can restrict users from syncing notebooks to the cloud. When standard logins are disabled, users can still access static archives but cannot modify or synchronize records.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900/20 p-5 rounded-2xl border border-stone-900/60 flex-1 flex flex-col gap-4">
              {/* Brand Logo & Banner Live Preview */}
              <div className="border border-stone-900 bg-stone-950/40 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-1.5 right-2 flex items-center gap-1 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                  <span className="text-[7px] font-mono font-bold tracking-wider text-amber-300 uppercase">Live Mockup</span>
                </div>
                
                <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 text-left">
                  Header Brand Logo
                </span>
                
                <div className="bg-stone-900 border border-stone-850/80 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Mock Logo" 
                        className="w-8 h-8 object-contain rounded-lg shadow-sm border border-amber-500/20" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-xs font-bold text-amber-500 tracking-widest">
                          {logoText || "ZAUQ"}
                        </span>
                        <span className="font-urdu text-xs font-bold text-amber-400">ذوق</span>
                      </div>
                      <span className="text-[7px] font-mono text-stone-500 leading-none">
                        {logoSubtitle || "Urdu Literary Lounge"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                  </div>
                </div>
              </div>

              <div className="border border-stone-900 bg-stone-950/40 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 text-left">
                  Home Welcome Banner
                </span>

                <div 
                  className={`relative flex flex-col items-center justify-center text-center py-6 border border-stone-900 bg-stone-950/80 rounded-2xl p-4 shadow-lg min-h-[160px] overflow-hidden theme-${bgTheme}`}
                  style={{
                    backgroundImage: bannerImageUrl ? `linear-gradient(to bottom, rgba(13, 11, 9, 0.85), rgba(13, 11, 9, 0.95)), url(${bannerImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-x-4 inset-y-1 border border-amber-500/5 rounded-xl pointer-events-none" />

                  <div className="flex flex-col items-center max-w-full relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-serif text-amber-500 font-bold tracking-wider font-display">
                        {logoText || "ZAUQ"}
                      </span>
                      <span className="text-sm font-urdu text-amber-400 font-bold">
                        ذوق
                      </span>
                    </div>
                    
                    <h4 className={`text-stone-200 text-xs font-semibold mb-1 truncate max-w-full ${
                      activeFont === "serif" ? "font-serif" :
                      activeFont === "sans" ? "font-sans" :
                      activeFont === "display" ? "font-display" :
                      activeFont === "mono" ? "font-mono" :
                      activeFont === "nastaliq" ? "font-nastaliq" :
                      activeFont === "diwani" ? "font-diwani" : ""
                    }`}>
                      {bannerHeading || "Zauq Urdu Literary Lounge"}
                    </h4>

                    <p className="text-[8px] text-stone-400 leading-normal max-w-xs italic mb-2 line-clamp-3">
                      {bannerTagline || "Indulge in the finest classical Urdu literature..."}
                    </p>

                    {bannerLink !== "deewan" && (
                      <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[7px] font-mono uppercase tracking-widest">
                        Links to: {bannerLink}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>

          {/* RIGHT COLUMN: RICH DETAIL EDITOR */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              
              {/* EDIT POET SUB-FORM */}
              {activeSubTab === "poets" && (
                <motion.div
                  key={selectedPoetId || "new_poet"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative"
                >
                  <div className="flex items-center justify-between border-b border-stone-900/60 pb-4">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        {isNewPoet ? "Establish New Poet Master Profile" : "Modify Poet Master Profile"}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {isNewPoet ? "Assign custom era and bio description" : `Document ID: ${selectedPoetId}`}
                      </p>
                    </div>
                    {!isNewPoet && selectedPoetId && (
                      <button
                        onClick={() => handleDeletePoet(selectedPoetId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-[10px] font-mono uppercase border border-stone-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Poet</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Poet Full Name *
                      </label>
                      <input
                        type="text"
                        value={poetName}
                        onChange={(e) => setPoetName(e.target.value)}
                        placeholder="e.g. Bahadur Shah Zafar"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Era / Timeline
                      </label>
                      <input
                        type="text"
                        value={poetEra}
                        onChange={(e) => setPoetEra(e.target.value)}
                        placeholder="e.g. 1775–1862"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Honorary Royal Title
                    </label>
                    <input
                      type="text"
                      value={poetTitle}
                      onChange={(e) => setPoetTitle(e.target.value)}
                      placeholder="e.g. Abul Muzaffar Siraj-ud-din Muhammad"
                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Historical Biography / Background
                    </label>
                    <textarea
                      value={poetBio}
                      onChange={(e) => setPoetBio(e.target.value)}
                      placeholder="Enter a brief, poetic and informative biography..."
                      rows={5}
                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl p-4 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed resize-none font-serif"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-900/40">
                    <button
                      onClick={handleSavePoet}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Poet Profile</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* EDIT GHAZAL SUB-FORM */}
              {activeSubTab === "ghazals" && (
                <motion.div
                  key={selectedGhazalId || "new_ghazal"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between border-b border-stone-900/60 pb-4">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        {isNewGhazal ? "Create New Ghazal Anthology Entry" : "Modify Ghazal Anthology Entry"}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {isNewGhazal ? "Register a complete ghazal with couplets" : `Ghazal ID: ${selectedGhazalId}`}
                      </p>
                    </div>
                    {!isNewGhazal && selectedGhazalId && (
                      <button
                        onClick={() => handleDeleteGhazal(selectedGhazalId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-[10px] font-mono uppercase border border-stone-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Ghazal</span>
                      </button>
                    )}
                  </div>

                   {/* General Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Poetry Title / Title Verse *
                      </label>
                      <input
                        type="text"
                        value={ghazalTitle}
                        onChange={(e) => setGhazalTitle(e.target.value)}
                        placeholder="e.g. Na Kisii Kii Aankh Ka Nuur Huun (نہ کسی کی آنکھ کا نور ہوں)"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Poet Name *
                      </label>
                      <select
                        value={ghazalPoet}
                        onChange={(e) => setGhazalPoet(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      >
                        {poets.map((poet) => (
                          <option key={poet.id || poet.name} value={poet.name}>
                            {poet.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Poetry Genre / Type *
                      </label>
                      <select
                        value={ghazalGenre}
                        onChange={(e) => setGhazalGenre(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      >
                        <option value="Ghazal">Ghazal</option>
                        <option value="Sher">Sher (Couplet)</option>
                        <option value="Mersiya">Mersiya</option>
                        <option value="Nazm">Nazm</option>
                        <option value="Rubai">Rubai</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Category / Theme
                      </label>
                      <input
                        type="text"
                        value={ghazalCategory}
                        onChange={(e) => setGhazalCategory(e.target.value)}
                        placeholder="e.g. Philosophical / Melancholic"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Historical Context / Background Story
                      </label>
                      <input
                        type="text"
                        value={ghazalBackground}
                        onChange={(e) => setGhazalBackground(e.target.value)}
                        placeholder="e.g. Composed while in exile, contemplating transient glory..."
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                  </div>

                  {/* Shers Buffer Editor */}
                  <div className="flex flex-col gap-4 border-t border-stone-900/60 pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="text-[11px] font-mono uppercase tracking-widest text-amber-500/80">
                          Couplets inside this Ghazal ({ghazalShers.length})
                        </h5>
                        <p className="text-[9px] text-stone-500">
                          Reorder or modify the couplets. Changes are local buffers until saved.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddSher}
                        className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-900 border border-stone-900 hover:border-amber-500/40 text-amber-400 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Couplet</span>
                      </button>
                    </div>

                    {/* Coupled Editor Inner Form (Add / Edit) */}
                    {(isAddingSher || editingSherIdx !== null) && (
                      <div className="bg-stone-950/60 p-4 rounded-2xl border border-amber-500/10 flex flex-col gap-4 relative">
                        <button
                          onClick={() => {
                            setIsAddingSher(false);
                            setEditingSherIdx(null);
                          }}
                          className="absolute top-3 right-3 text-stone-600 hover:text-stone-400 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <h6 className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          {editingSherIdx !== null ? `Modify Couplet #${editingSherIdx + 1}` : "Compose New Couplet"}
                        </h6>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono uppercase text-stone-500">
                            Urdu Script (Double lines separated by newline) *
                          </label>
                          <textarea
                            value={sherUrdu}
                            onChange={(e) => setSherUrdu(e.target.value)}
                            placeholder="لائی حیات آئے قضا لے چلی چلے&#10;اپنی خوشی نہ آئے نہ اپنی خوشی چلے"
                            rows={2}
                            dir="rtl"
                            className="w-full bg-stone-950 border border-stone-850 text-amber-100 placeholder-stone-800 rounded-xl p-3 text-right text-lg leading-relaxed focus:outline-none focus:border-amber-500/40 font-urdu resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono uppercase text-stone-500">
                              Roman Transliteration
                            </label>
                            <input
                              type="text"
                              value={sherRoman}
                              onChange={(e) => setSherRoman(e.target.value)}
                              placeholder="e.g. Layi hayat aye qaza..."
                              className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/40 italic"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono uppercase text-stone-500">
                              English Translation
                            </label>
                            <input
                              type="text"
                              value={sherEnglish}
                              onChange={(e) => setSherEnglish(e.target.value)}
                              placeholder="e.g. Life brought us here; death took us away..."
                              className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/40"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono uppercase text-stone-500">
                            Philosophy Explanation / Commentary (Tashreeh)
                          </label>
                          <textarea
                            value={sherExplanation}
                            onChange={(e) => setSherExplanation(e.target.value)}
                            placeholder="Enter detailed translation explanation or metaphysical commentary..."
                            rows={2}
                            className="w-full bg-stone-950 border border-stone-850 text-stone-300 placeholder-stone-700 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500/40 font-serif leading-relaxed resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingSher(false);
                              setEditingSherIdx(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-400 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleCommitSher}
                            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Commit Couplet</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Couplets List in Buffer */}
                    {ghazalShers.length === 0 ? (
                      <div className="border border-stone-900 border-dashed rounded-2xl p-8 text-center bg-stone-950/10">
                        <Info className="w-6 h-6 text-stone-600 mx-auto mb-2" />
                        <p className="text-xs text-stone-500">No couplets added yet. Create at least one couplet below.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {ghazalShers.map((sher, idx) => (
                          <div 
                            key={sher.id}
                            className={`bg-stone-950/30 p-4 rounded-xl border transition-all flex items-start gap-3 justify-between ${
                              editingSherIdx === idx ? "border-amber-500/40 bg-amber-950/5" : "border-stone-900/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-[10px] font-mono text-amber-500/60 font-bold self-center bg-stone-950 px-2 py-1 rounded-lg">
                              #{idx + 1}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1 text-right">
                              <p className="text-sm font-serif text-amber-200/90 font-urdu leading-normal whitespace-pre-line">
                                {sher.urdu}
                              </p>
                              {sher.roman && (
                                <p className="text-[10px] italic text-stone-500 text-left">
                                  {sher.roman}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 self-center flex-shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveSher(idx, "up")}
                                className="p-1 rounded bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === ghazalShers.length - 1}
                                onClick={() => handleMoveSher(idx, "down")}
                                className="p-1 rounded bg-stone-900 hover:bg-stone-950 text-stone-500 hover:text-amber-300 disabled:opacity-20 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSher(idx)}
                                className="p-1 rounded bg-stone-900 hover:bg-stone-950 text-stone-400 hover:text-amber-300 cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSherFromGhazal(idx)}
                                className="p-1 rounded bg-stone-900 hover:bg-rose-950/20 text-stone-500 hover:text-rose-400 border border-transparent hover:border-rose-950/10 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save Main Ghazal Action */}
                  <div className="flex justify-end pt-4 border-t border-stone-900/40">
                    <button
                      onClick={handleSaveGhazal}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Ghazal Book</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* EDIT VIDEO SUB-FORM */}
              {activeSubTab === "videos" && (
                <motion.div
                  key={selectedVideoId || "new_video"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between border-b border-stone-900/60 pb-4">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        {isNewVideo ? "Curate New Video Record" : "Modify Video Details"}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {isNewVideo ? "Register a YouTube, stream, or locally uploaded performance" : `Document ID: ${selectedVideoId}`}
                      </p>
                    </div>
                    {!isNewVideo && selectedVideoId && (
                      <button
                        onClick={() => handleDeleteVideo(selectedVideoId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-[10px] font-mono uppercase border border-stone-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Video</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Performance / Video Title *
                      </label>
                      <input
                        type="text"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="e.g. Yeh Jo Halka Halka Suroor"
                        className={`w-full bg-stone-950 border ${
                          videoErrors.title ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors`}
                      />
                      {videoErrors.title && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{videoErrors.title}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Artist, Poet, or Reciter *
                      </label>
                      <input
                        type="text"
                        value={videoArtist}
                        onChange={(e) => setVideoArtist(e.target.value)}
                        placeholder="e.g. Nusrat Fateh Ali Khan"
                        className={`w-full bg-stone-950 border ${
                          videoErrors.artist ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors`}
                      />
                      {videoErrors.artist && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{videoErrors.artist}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Video Source Type Tab Toggle */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Media Source Type *
                      </label>
                      <div className="grid grid-cols-3 p-1 bg-stone-950 border border-stone-850 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoSourceType("youtube");
                            setLocalUploadedFile(null);
                            setVideoPreviewUrl("");
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            videoSourceType === "youtube"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                              : "border border-transparent text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          <Tv className="w-3 h-3" />
                          <span>YouTube</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoSourceType("direct");
                            setLocalUploadedFile(null);
                            setVideoPreviewUrl(videoUrl);
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            videoSourceType === "direct"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                              : "border border-transparent text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Stream URL</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setVideoSourceType("upload");
                            setVideoPreviewUrl("");
                            if (selectedVideoId) {
                              const blob = await getVideoFile(selectedVideoId);
                              if (blob) {
                                const url = URL.createObjectURL(blob);
                                setVideoPreviewUrl(url);
                              }
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            videoSourceType === "upload"
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                              : "border border-transparent text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Performance Category *
                      </label>
                      <select
                        value={videoCategory}
                        onChange={(e) => setVideoCategory(e.target.value)}
                        className={`w-full bg-stone-950 border ${
                          videoErrors.category ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none cursor-pointer transition-colors`}
                      >
                        <option value="Qawwali">Qawwali</option>
                        <option value="Sufi Ghazal">Sufi Ghazal</option>
                        <option value="Ghazal Recitation">Ghazal Recitation</option>
                        <option value="Sitar Recitation">Sitar Recitation</option>
                        <option value="Classical Vocal">Classical Vocal</option>
                        <option value="Sufiana Kalam">Sufiana Kalam</option>
                      </select>
                      {videoErrors.category && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{videoErrors.category}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contextual Source Input / Drag-and-drop box */}
                  <div className="grid grid-cols-1 gap-4">
                    {videoSourceType !== "upload" ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          {videoSourceType === "youtube" ? "YouTube Video URL *" : "Streaming / MP4 Video URL *"}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => {
                              setVideoUrl(e.target.value);
                              if (videoSourceType === "direct") {
                                setVideoPreviewUrl(e.target.value);
                              }
                            }}
                            placeholder={
                              videoSourceType === "youtube"
                                ? "e.g. https://www.youtube.com/watch?v=A7gGURm1RCE"
                                : "e.g. https://example.com/videos/qawwali.mp4"
                            }
                            className={`w-full bg-stone-950 border ${
                              videoErrors.url ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                            } text-stone-200 placeholder-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-colors`}
                          />
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-600">
                            {videoSourceType === "youtube" ? <Tv className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                          </div>
                        </div>
                        {videoErrors.url && (
                          <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>{videoErrors.url}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Upload Local Video File *
                        </label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                            isDragging
                              ? "border-amber-500 bg-amber-950/10 text-amber-200"
                              : videoErrors.upload
                              ? "border-rose-500/70 bg-rose-950/10 text-rose-200"
                              : localUploadedFile || videoPreviewUrl
                              ? "border-amber-500/30 bg-stone-950/40 text-stone-300"
                              : "border-stone-800 hover:border-amber-500/30 bg-stone-950/20 text-stone-500 hover:text-stone-400"
                          }`}
                          onClick={() => {
                            if (!localUploadedFile && !videoPreviewUrl) {
                              document.getElementById("video-file-input")?.click();
                            }
                          }}
                        >
                          <input
                            id="video-file-input"
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleFileSelect}
                          />

                          {localUploadedFile || videoPreviewUrl ? (
                            <div className="flex flex-col items-center gap-2 w-full">
                              <Video className="w-8 h-8 text-amber-500 animate-pulse" />
                              <div className="text-xs font-semibold text-stone-300 truncate max-w-xs">
                                {localUploadedFile ? localUploadedFile.name : `Cached Local File (ID: ${selectedVideoId})`}
                              </div>
                              {localUploadedFile && (
                                <div className="text-[10px] font-mono text-stone-600">
                                  Size: {(localUploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocalUploadedFile(null);
                                  setVideoPreviewUrl("");
                                  const input = document.getElementById("video-file-input") as HTMLInputElement;
                                  if (input) input.value = "";
                                }}
                                className="mt-2 px-3 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 text-rose-400 text-[10px] font-mono uppercase tracking-wider border border-rose-900/40 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove & Choose Different File</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-8 h-8 text-stone-600 hover:text-amber-500 transition-colors" />
                              <p className="text-xs font-semibold text-stone-400">
                                Drag & drop your video file here, or <span className="text-amber-500 hover:underline">browse</span>
                              </p>
                              <p className="text-[10px] text-stone-600">
                                Supports MP4, WebM, OGG. Stored persistently in your browser's local IndexedDB.
                              </p>
                            </div>
                          )}
                        </div>
                        {videoErrors.upload && (
                          <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>{videoErrors.upload}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Live Player Preview Window */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-500/80" />
                      <span>Live Curation Preview</span>
                    </label>
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-850 shadow-inner group flex items-center justify-center">
                      {videoSourceType === "youtube" ? (
                        videoUrl.trim() ? (
                          (() => {
                            const ytId = (() => {
                              const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                              const match = videoUrl.match(regExp);
                              return (match && match[2].length === 11) ? match[2] : null;
                            })();
                            if (ytId) {
                              return (
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="Live YouTube Preview"
                                  className="absolute inset-0 w-full h-full border-0"
                                  allowFullScreen
                                />
                              );
                            } else {
                              return (
                                <div className="flex flex-col items-center gap-2 text-stone-600 p-6 text-center">
                                  <AlertCircle className="w-8 h-8 text-amber-500/40" />
                                  <p className="text-xs text-stone-500 font-serif">Awaiting valid YouTube URL format...</p>
                                  <p className="text-[9px] font-mono text-stone-600 max-w-xs">Provide a standard watch link or short URL</p>
                                </div>
                              );
                            }
                          })()
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-stone-600">
                            <Tv className="w-8 h-8 text-stone-700" />
                            <p className="text-xs font-serif">Enter a YouTube link above to see player preview</p>
                          </div>
                        )
                      ) : videoPreviewUrl ? (
                        <video
                          key={videoPreviewUrl}
                          src={videoPreviewUrl}
                          controls
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-stone-600 p-6 text-center">
                          <Play className="w-8 h-8 text-stone-700" />
                          <p className="text-xs font-serif">
                            {videoSourceType === "upload"
                              ? "Upload a local video file to load player"
                              : "Enter a direct MP4 link to load player"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Video Description / Context
                    </label>
                    <textarea
                      value={videoDescription}
                      onChange={(e) => setVideoDescription(e.target.value)}
                      placeholder="Provide historical context, translation pointers, or lyrical details for this performance..."
                      rows={5}
                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl p-4 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed resize-none font-serif"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-900/40">
                    <button
                      onClick={handleSaveVideo}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Video Record</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {activeSubTab === "authors" && (
                <motion.div
                  key={selectedAuthorId || "new_author"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative"
                >
                  <div className="flex items-center justify-between border-b border-stone-900/60 pb-4">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        {isNewAuthor ? "Register New Literary Author" : "Modify Author Profile"}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {isNewAuthor ? "Assign biographical context, era, and visual profile" : `Author ID: ${selectedAuthorId}`}
                      </p>
                    </div>
                    {!isNewAuthor && selectedAuthorId && (
                      <button
                        onClick={() => handleDeleteAuthor(selectedAuthorId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-[10px] font-mono uppercase border border-stone-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Author</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Author Name *
                      </label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Allama Iqbal"
                        className={`w-full bg-stone-950 border ${
                          authorErrors.name ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors`}
                      />
                      {authorErrors.name && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{authorErrors.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Era / Years Active
                      </label>
                      <input
                        type="text"
                        value={authorActiveYears}
                        onChange={(e) => setAuthorActiveYears(e.target.value)}
                        placeholder="e.g. 1877–1938"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Birthplace / Region
                      </label>
                      <input
                        type="text"
                        value={authorBirthPlace}
                        onChange={(e) => setAuthorBirthPlace(e.target.value)}
                        placeholder="e.g. Sialkot, Punjab"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Profile Image Source Type
                      </label>
                      <div className="grid grid-cols-2 p-1 bg-stone-950 border border-stone-850 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthorIsLocalImage(false);
                            setAuthorLocalFile(null);
                            setAuthorPreviewUrl("");
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            !authorIsLocalImage
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                              : "border border-transparent text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Web Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setAuthorIsLocalImage(true);
                            setAuthorPreviewUrl("");
                            if (selectedAuthorId) {
                              const blob = await getMediaFile(`author_${selectedAuthorId}`);
                              if (blob) {
                                setAuthorPreviewUrl(URL.createObjectURL(blob));
                              }
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            authorIsLocalImage
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                              : "border border-transparent text-stone-500 hover:text-stone-300"
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          <span>Local Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {!authorIsLocalImage ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Profile Image URL
                      </label>
                      <input
                        type="text"
                        value={authorImageUrl}
                        onChange={(e) => {
                          setAuthorImageUrl(e.target.value);
                          setAuthorPreviewUrl(e.target.value);
                        }}
                        placeholder="https://example.com/author.jpg"
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Upload Profile Image
                      </label>
                      <div
                        onClick={() => document.getElementById("author-img-input")?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            setAuthorLocalFile(file);
                            setAuthorPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                        className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] border-stone-800 bg-stone-950/40 hover:border-amber-500/30 hover:bg-stone-950/70"
                      >
                        <input
                          id="author-img-input"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setAuthorLocalFile(file);
                              setAuthorPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                          className="hidden"
                        />
                        {authorLocalFile || authorPreviewUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            {authorPreviewUrl && (
                              <img
                                src={authorPreviewUrl}
                                alt="Preview"
                                referrerPolicy="no-referrer"
                                className="w-16 h-16 rounded-full object-cover border border-stone-800"
                              />
                            )}
                            <span className="text-xs text-stone-300">
                              {authorLocalFile ? authorLocalFile.name : "Loaded from local database"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-stone-600">
                            <Upload className="w-8 h-8 text-stone-700" />
                            <p className="text-xs font-serif text-stone-500">Drag & drop or click to upload image file</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {authorPreviewUrl && !authorIsLocalImage && (
                    <div className="flex justify-center p-4 bg-stone-950/50 rounded-2xl border border-stone-900/60">
                      <img
                        src={authorPreviewUrl}
                        alt="Author Cover"
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full object-cover border border-stone-800"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Author Biography
                    </label>
                    <textarea
                      value={authorBio}
                      onChange={(e) => setAuthorBio(e.target.value)}
                      placeholder="Write Allama Iqbal's poetic history and philosophical journey..."
                      rows={5}
                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl p-4 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed resize-none font-serif"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-900/40">
                    <button
                      onClick={handleSaveAuthor}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Author Profile</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {activeSubTab === "books" && (
                <motion.div
                  key={selectedBookId || "new_book"}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative"
                >
                  <div className="flex items-center justify-between border-b border-stone-900/60 pb-4">
                    <div>
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        {isNewBook ? "Publish New Literary Work" : "Modify Book Record"}
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        {isNewBook ? "Assign a primary author and provide covers, reading links, and optional audio recitations" : `Book ID: ${selectedBookId}`}
                      </p>
                    </div>
                    {!isNewBook && selectedBookId && (
                      <button
                        onClick={() => handleDeleteBook(selectedBookId)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 text-[10px] font-mono uppercase border border-stone-900 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Book</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Book Title *
                      </label>
                      <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="e.g. Bang-e-Dara"
                        className={`w-full bg-stone-950 border ${
                          bookErrors.title ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors`}
                      />
                      {bookErrors.title && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{bookErrors.title}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Primary Author *
                      </label>
                      <select
                        value={bookAuthorId}
                        onChange={(e) => setBookAuthorId(e.target.value)}
                        className={`w-full bg-stone-950 border ${
                          bookErrors.authorId ? "border-rose-500/70 focus:border-rose-500" : "border-stone-850 focus:border-amber-500/45"
                        } text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45`}
                      >
                        <option value="">-- Select Author --</option>
                        {authors.map((auth) => (
                          <option key={auth.id} value={auth.id}>
                            {auth.name}
                          </option>
                        ))}
                      </select>
                      {bookErrors.authorId && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{bookErrors.authorId}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                      Book Description / Synopsis
                    </label>
                    <textarea
                      value={bookDescription}
                      onChange={(e) => setBookDescription(e.target.value)}
                      placeholder="Write a brief overview of this book's theme and content..."
                      rows={4}
                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl p-4 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed resize-none font-serif"
                    />
                  </div>

                  {/* Category Tagging (Genre & Literary Period) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Literary Genre / Category
                      </label>
                      <select
                        value={bookGenre}
                        onChange={(e) => setBookGenre(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      >
                        <option value="">-- Custom / Select Genre --</option>
                        <option value="Diwan">Diwan (Ghazal Collection)</option>
                        <option value="Kulliyat">Kulliyat (Complete Works)</option>
                        <option value="Nazm">Nazm (Thematic Poetry)</option>
                        <option value="Rubaiyat">Rubaiyat (Quatrains)</option>
                        <option value="Prose">Prose (Aesthetic Prose)</option>
                        <option value="Biography">Biography (Sawanih Umri)</option>
                        <option value="Criticism">Criticism (Tanqeed)</option>
                        <option value="Translation">Translation (Tarjuma)</option>
                      </select>
                      <input
                        type="text"
                        value={bookGenre}
                        onChange={(e) => setBookGenre(e.target.value)}
                        placeholder="Or type custom genre tag..."
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45 mt-1.5"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                        Literary Period / Era
                      </label>
                      <select
                        value={bookLiteraryPeriod}
                        onChange={(e) => setBookLiteraryPeriod(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                      >
                        <option value="">-- Custom / Select Era --</option>
                        <option value="Mughal Court Era">Mughal Court Era (Classical)</option>
                        <option value="Dehli School">Dehli School (Classical)</option>
                        <option value="Lucknow School">Lucknow School (Romantic/Classical)</option>
                        <option value="Progressive Writers Movement">Progressive Writers Movement (Modernist)</option>
                        <option value="Post-Colonial Era">Post-Colonial Era</option>
                        <option value="Contemporary">Contemporary</option>
                      </select>
                      <input
                        type="text"
                        value={bookLiteraryPeriod}
                        onChange={(e) => setBookLiteraryPeriod(e.target.value)}
                        placeholder="Or type custom period tag..."
                        className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45 mt-1.5"
                      />
                    </div>
                  </div>

                  {/* MEDIA CONTROLS: COVER, AUDIO, VIDEO */}
                  <div className="border-t border-stone-900/60 pt-4 flex flex-col gap-6">
                    <h5 className="text-[11px] font-mono uppercase tracking-widest text-amber-500/80">
                      Book Media & Attachments
                    </h5>

                    {/* COVER ATTACHMENT */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Cover Image Source
                        </label>
                        <div className="grid grid-cols-2 p-1 bg-stone-950 border border-stone-850 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => {
                              setBookCoverType("link");
                              setBookLocalCoverFile(null);
                              setBookCoverPreviewUrl("");
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookCoverType === "link"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setBookCoverType("upload");
                              setBookCoverPreviewUrl("");
                              if (selectedBookId) {
                                const blob = await getMediaFile(`cover_${selectedBookId}`);
                                if (blob) {
                                  setBookCoverPreviewUrl(URL.createObjectURL(blob));
                                }
                              }
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookCoverType === "upload"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-8 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          {bookCoverType === "link" ? "Cover Image URL" : "Upload Local Book Cover"}
                        </label>
                        {bookCoverType === "link" ? (
                          <input
                            type="text"
                            value={bookCoverUrl}
                            onChange={(e) => {
                              setBookCoverUrl(e.target.value);
                              setBookCoverPreviewUrl(e.target.value);
                            }}
                            placeholder="https://example.com/cover.jpg"
                            className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45"
                          />
                        ) : (
                          <div
                            onClick={() => document.getElementById("book-cover-input")?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                const file = e.dataTransfer.files[0];
                                setBookLocalCoverFile(file);
                                setBookCoverPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                            className="border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center border-stone-800 bg-stone-950/40 hover:border-amber-500/30 hover:bg-stone-950/70"
                          >
                            <input
                              id="book-cover-input"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setBookLocalCoverFile(file);
                                  setBookCoverPreviewUrl(URL.createObjectURL(file));
                                }
                              }}
                              className="hidden"
                            />
                            {bookLocalCoverFile || bookCoverPreviewUrl ? (
                              <span className="text-[10px] text-amber-300 font-semibold truncate max-w-xs">
                                {bookLocalCoverFile ? bookLocalCoverFile.name : "Loaded from local database"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-500">Drag & drop or click to upload cover image</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {bookCoverPreviewUrl && (
                      <div className="flex justify-center p-3 bg-stone-950/40 rounded-xl border border-stone-900">
                        <img
                          src={bookCoverPreviewUrl}
                          alt="Book Cover Preview"
                          referrerPolicy="no-referrer"
                          className="h-28 w-20 object-cover shadow-md rounded border border-stone-800"
                        />
                      </div>
                    )}

                    {/* AUDIO ATTACHMENT */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Audio Source Type
                        </label>
                        <div className="grid grid-cols-2 p-1 bg-stone-950 border border-stone-850 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => {
                              setBookAudioType("link");
                              setBookLocalAudioFile(null);
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookAudioType === "link"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBookAudioType("upload");
                            }}
                            className={`py-1.5 px-1 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookAudioType === "upload"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-8 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          {bookAudioType === "link" ? "Audio MP3 URL" : "Upload Local MP3 file"}
                        </label>
                        {bookAudioType === "link" ? (
                          <input
                            type="text"
                            value={bookAudioUrl}
                            onChange={(e) => setBookAudioUrl(e.target.value)}
                            placeholder="https://example.com/audio.mp3"
                            className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 tracking-wide text-xs focus:outline-none focus:border-amber-500/45"
                          />
                        ) : (
                          <div
                            onClick={() => document.getElementById("book-audio-input")?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                setBookLocalAudioFile(e.dataTransfer.files[0]);
                              }
                            }}
                            className="border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center border-stone-800 bg-stone-950/40 hover:border-amber-500/30 hover:bg-stone-950/70"
                          >
                            <input
                              id="book-audio-input"
                              type="file"
                              accept="audio/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setBookLocalAudioFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            {bookLocalAudioFile ? (
                              <span className="text-[10px] text-amber-300 font-semibold truncate max-w-xs">
                                {bookLocalAudioFile.name} ({(bookLocalAudioFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            ) : bookAudioUrl && bookIsLocalAudio ? (
                              <span className="text-[10px] text-stone-300">Cached Audio File saved locally</span>
                            ) : (
                              <span className="text-[10px] text-stone-500">Drag & drop or click to upload recitation audio</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VIDEO/YOUTUBE RECITATION ATTACHMENT */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Video Source
                        </label>
                        <div className="grid grid-cols-3 p-1 bg-stone-950 border border-stone-850 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => {
                              setBookVideoSourceType("youtube");
                              setBookLocalVideoFile(null);
                            }}
                            className={`py-1.5 px-0.5 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookVideoSourceType === "youtube"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <Tv className="w-3 h-3" />
                            <span>YouTube</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBookVideoSourceType("direct");
                              setBookLocalVideoFile(null);
                            }}
                            className={`py-1.5 px-0.5 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookVideoSourceType === "direct"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBookVideoSourceType("upload");
                            }}
                            className={`py-1.5 px-0.5 rounded-xl text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                              bookVideoSourceType === "upload"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-bold"
                                : "border border-transparent text-stone-500 hover:text-stone-300"
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-8 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          {bookVideoSourceType === "youtube" ? "YouTube Video URL" : bookVideoSourceType === "direct" ? "Direct Stream Video URL" : "Upload Local Video file"}
                        </label>
                        {bookVideoSourceType !== "upload" ? (
                          <input
                            type="text"
                            value={bookVideoUrl}
                            onChange={(e) => setBookVideoUrl(e.target.value)}
                            placeholder={bookVideoSourceType === "youtube" ? "https://youtube.com/watch?v=..." : "https://example.com/video.mp4"}
                            className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45"
                          />
                        ) : (
                          <div
                            onClick={() => document.getElementById("book-video-input")?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                setBookLocalVideoFile(e.dataTransfer.files[0]);
                              }
                            }}
                            className="border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center border-stone-800 bg-stone-950/40 hover:border-amber-500/30 hover:bg-stone-950/70"
                          >
                            <input
                              id="book-video-input"
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setBookLocalVideoFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            {bookLocalVideoFile ? (
                              <span className="text-[10px] text-amber-300 font-semibold truncate max-w-xs">
                                {bookLocalVideoFile.name} ({(bookLocalVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            ) : bookVideoUrl && bookVideoSourceType === "upload" ? (
                              <span className="text-[10px] text-stone-300">Cached video saved locally</span>
                            ) : (
                              <span className="text-[10px] text-stone-500">Drag & drop or click to upload reading video</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {bookErrors.video && (
                      <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5 animate-fade-in">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span>{bookErrors.video}</span>
                      </span>
                    )}

                    {/* PDF and EPUB Literary Book Files section */}
                    <div className="flex flex-col gap-3.5 border-t border-stone-900/60 pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-mono text-stone-400 uppercase tracking-widest font-semibold">
                          Book PDF / EPUB Publications
                        </h4>
                      </div>

                      {/* Add new attachment form */}
                      <div className="bg-stone-950/40 border border-stone-900 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                          {/* Title / Name */}
                          <div className="md:col-span-4 flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">File Title / Label</label>
                            <input
                              type="text"
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              placeholder="e.g. Diwan-e-Zauq (Parchment)"
                              className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45"
                            />
                          </div>

                          {/* Format Selector */}
                          <div className="md:col-span-3 flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">Format</label>
                            <select
                              value={newFileType}
                              onChange={(e) => setNewFileType(e.target.value as "pdf" | "epub")}
                              className="w-full bg-stone-950 border border-stone-850 text-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/45"
                            >
                              <option value="pdf">PDF Document (.pdf)</option>
                              <option value="epub">EPUB eBook (.epub)</option>
                            </select>
                          </div>

                          {/* Source Selector (Link vs Upload) */}
                          <div className="md:col-span-5 flex flex-col gap-1.5">
                            <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">Source</label>
                            <div className="grid grid-cols-2 gap-2 bg-stone-950 border border-stone-850 rounded-xl p-1 h-9">
                              <button
                                type="button"
                                onClick={() => setNewFileTypeSource("upload")}
                                className={`py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  newFileTypeSource === "upload"
                                    ? "bg-amber-500/10 text-amber-300 shadow-sm font-bold"
                                    : "text-stone-500 hover:text-stone-300"
                                }`}
                              >
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewFileTypeSource("link")}
                                className={`py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  newFileTypeSource === "link"
                                    ? "bg-amber-500/10 text-amber-300 shadow-sm font-bold"
                                    : "text-stone-500 hover:text-stone-300"
                                }`}
                              >
                                <LinkIcon className="w-3 h-3" />
                                <span>Link URL</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* File input vs URL input */}
                        <div>
                          {newFileTypeSource === "link" ? (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">File URL</label>
                              <input
                                type="text"
                                value={newFileUrl}
                                onChange={(e) => setNewFileUrl(e.target.value)}
                                placeholder="https://example.com/books/ghalib.pdf"
                                className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/45"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">Upload File (.pdf or .epub)</label>
                              <div
                                onClick={() => {
                                  if (!isUploadingAttachment) {
                                    document.getElementById("book-file-uploader")?.click();
                                  }
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (isUploadingAttachment) return;
                                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleDirectFileUpload(e.dataTransfer.files[0]);
                                  }
                                }}
                                className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                                  isUploadingAttachment
                                    ? "border-amber-500 bg-stone-950/80 cursor-wait"
                                    : "border-stone-800 bg-stone-950/40 hover:border-amber-500/30 hover:bg-stone-950/70"
                                }`}
                              >
                                <input
                                  id="book-file-uploader"
                                  type="file"
                                  disabled={isUploadingAttachment}
                                  accept={newFileType === "pdf" ? ".pdf,application/pdf" : ".epub,application/epub+zip"}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleDirectFileUpload(e.target.files[0]);
                                    }
                                  }}
                                  className="hidden"
                                />
                                
                                {isUploadingAttachment ? (
                                  <div className="w-full flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 text-amber-300 font-mono text-xs animate-pulse">
                                      <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
                                      <span>Uploading: {attachmentUploadProgress}% completed...</span>
                                    </div>
                                    <div className="w-full max-w-xs bg-stone-900 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-amber-500 h-full rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${attachmentUploadProgress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ) : newLocalFile ? (
                                  <span className="text-[10px] text-amber-300 font-semibold truncate max-w-xs">
                                    Selected: {newLocalFile.name} ({(newLocalFile.size / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <Upload className="w-6 h-6 text-stone-600 mb-1" />
                                    <span className="text-[10px] text-stone-400 font-medium">
                                      Drag & drop or click to upload local {newFileType.toUpperCase()} file
                                    </span>
                                    <span className="text-[8px] font-mono text-stone-600 uppercase tracking-widest">
                                      File will upload immediately to Firebase Storage
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Add Button */}
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            disabled={isUploadingAttachment}
                            onClick={handleAddBookFile}
                            className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                              isUploadingAttachment
                                ? "border-stone-800 bg-stone-900/20 text-stone-600 cursor-not-allowed"
                                : "border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{newFileTypeSource === "link" ? "Add Link" : "Upload File"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Current attachments list */}
                      {bookFiles.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1">
                          <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Current Book Attachments ({bookFiles.length})</span>
                          <div className="grid grid-cols-1 gap-2.5">
                            {bookFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-start md:items-center justify-between p-3 rounded-2xl bg-stone-900/40 border border-stone-850 text-stone-300 text-xs animate-fade-in gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Auto preview (PDF thumbnail) or file icon */}
                                  {file.thumbnailUrl ? (
                                    <div className="w-10 h-14 bg-stone-950 rounded-lg overflow-hidden border border-stone-800/80 flex-shrink-0 flex items-center justify-center group relative shadow-md">
                                      <img 
                                        src={file.thumbnailUrl} 
                                        alt={file.name} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-14 bg-stone-950 rounded-lg border border-stone-850 flex-shrink-0 flex flex-col items-center justify-center text-amber-500/80 shadow-inner">
                                      <FileText className="w-5 h-5 mb-0.5" />
                                      <span className="text-[7px] font-mono font-bold uppercase tracking-widest text-stone-500">
                                        {file.type}
                                      </span>
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold block truncate text-[11px] text-stone-200">{file.name}</span>
                                    {/* Print actual path */}
                                    <div className="mt-1 flex items-center gap-1.5">
                                      <span className="text-[8px] font-mono text-stone-500 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-900 truncate block max-w-xs md:max-w-md select-all" title={file.url || "No path generated yet"}>
                                        {file.url || "Uploading..."}
                                      </span>
                                      {file.url && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(file.url);
                                            triggerToast("Copied Firebase Storage path! 📋");
                                          }}
                                          className="p-1 hover:bg-stone-800 text-stone-500 hover:text-amber-400 rounded transition-all cursor-pointer"
                                          title="Copy Firebase URL"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-mono text-stone-500 uppercase mt-0.5 block">
                                      Format: {file.type} • {file.isLocal ? "Local Offline File" : "Firebase Cloud Storage"}
                                    </span>
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBookFile(file.id)}
                                  className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all cursor-pointer flex-shrink-0 mt-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                   <div className="flex flex-col gap-3 pt-4 border-t border-stone-900/40">
                     {/* Dynamic Step Status Progress Bar */}
                     {(isSavingBook || isUploadingAttachment) && (
                       <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-pulse">
                         <div className="flex items-center justify-between text-xs font-mono">
                           <span className="text-amber-400 flex items-center gap-1.5 font-semibold">
                             <span className="relative flex h-2 w-2">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                             </span>
                             {bookSavingStatus || "Processing book data..."}
                           </span>
                           <span className="text-stone-500 text-[10px] uppercase">Please do not close this window</span>
                         </div>
                         <div className="w-full bg-stone-950 h-1.5 rounded-full overflow-hidden border border-stone-900">
                           <div 
                             className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500 ease-out"
                             style={{ 
                               width: bookSavingStatus ? "75%" : (attachmentUploadProgress ? `${attachmentUploadProgress}%` : "30%") 
                             }}
                           ></div>
                         </div>
                       </div>
                     )}

                     <div className="flex justify-end gap-3 items-center">
                       {/* Cancel/Reset button (if not currently saving/uploading) */}
                       {!(isSavingBook || isUploadingAttachment) && selectedBookId && (
                         <button
                           type="button"
                           onClick={handleInitNewBook}
                           className="px-4 py-2.5 rounded-xl text-xs font-mono text-stone-400 hover:text-stone-200 border border-stone-850 hover:bg-stone-900/30 transition-all cursor-pointer"
                         >
                           Cancel Edit
                         </button>
                       )}

                       <button
                         type="button"
                         disabled={isSavingBook || isUploadingAttachment}
                         onClick={handleSaveBook}
                         className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
                           isSavingBook || isUploadingAttachment
                             ? "bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-850"
                             : "bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer active:scale-95"
                         }`}
                       >
                         {isSavingBook ? (
                           <>
                             <div className="w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                             <span>Saving Record...</span>
                           </>
                         ) : isUploadingAttachment ? (
                           <>
                             <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                             <span>Uploading ({attachmentUploadProgress}%)...</span>
                           </>
                         ) : (
                           <>
                             <Save className="w-3.5 h-3.5" />
                             <span>Save Book Record</span>
                           </>
                         )}
                       </button>
                     </div>
                   </div>
                </motion.div>
              )}

              {activeSubTab === "couplets" && (
                <div id="zauq-daily-couplets-manager" className="flex flex-col gap-8">
                  {/* HELPER UTILITIES DECLARATION AND CORE COMPUTATIONS */}
                  {(() => {
                    // Local Date Helpers
                    const getTodayStr = () => {
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const date = String(d.getDate()).padStart(2, "0");
                      return `${year}-${month}-${date}`;
                    };

                    const getTomorrowStr = () => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const date = String(d.getDate()).padStart(2, "0");
                      return `${year}-${month}-${date}`;
                    };

                    const formatScheduleDate = (dateStr: string) => {
                      if (!dateStr) return "";
                      try {
                        const parts = dateStr.split("-");
                        if (parts.length === 3) {
                          const year = parseInt(parts[0], 10);
                          const monthIdx = parseInt(parts[1], 10) - 1;
                          const day = parseInt(parts[2], 10);
                          const d = new Date(year, monthIdx, day);
                          return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                        }
                      } catch (e) {}
                      return dateStr;
                    };

                    const todayStr = getTodayStr();

                    // Calculate active inspiration for today (pinned or rotation fallback)
                    const getTodayActiveCouplet = () => {
                      if (!dailyCouplets || dailyCouplets.length === 0) return { couplet: null, isPinned: false };
                      
                      const pinned = dailyCouplets.find(c => c.activeDate === todayStr);
                      if (pinned) {
                        return { couplet: pinned, isPinned: true };
                      }
                      
                      let hash = 0;
                      for (let i = 0; i < todayStr.length; i++) {
                        hash = (hash << 5) - hash + todayStr.charCodeAt(i);
                        hash |= 0;
                      }
                      const index = Math.abs(hash) % dailyCouplets.length;
                      return { couplet: dailyCouplets[index], isPinned: false };
                    };

                    const activeTodayInfo = getTodayActiveCouplet();

                    // Sort scheduled & unscheduled pools
                    const scheduledCouplets = [...dailyCouplets]
                      .filter(c => c.activeDate)
                      .sort((a, b) => a.activeDate.localeCompare(b.activeDate));

                    const unscheduledCouplets = [...dailyCouplets]
                      .filter(c => !c.activeDate);

                    // Check date conflict for currently edited item
                    const conflictingCouplet = coupletActiveDate ? dailyCouplets.find(
                      c => c.activeDate === coupletActiveDate && c.id !== selectedCoupletId
                    ) : null;

                    // Inline Quick Actions
                    const handleQuickUnschedule = async (c: any) => {
                      if (!window.confirm(`Are you sure you want to remove the schedule for this couplet? It will return to the general rotation pool.`)) return;
                      try {
                        const data = { ...c, activeDate: "" };
                        await setDoc(doc(db, "daily_couplets", c.id), data);
                        triggerToast("Couplet unscheduled and returned to the general pool. 🔄");
                      } catch (e) {
                        triggerToast("Error: " + (e as any).message);
                      }
                    };

                    const handleQuickSetToday = async (c: any) => {
                      const existing = dailyCouplets.find(x => x.activeDate === todayStr);
                      if (existing) {
                        if (!window.confirm(`Another couplet ("${existing.urdu.substring(0, 20)}...") is already scheduled for today. Replace it?`)) {
                          return;
                        }
                      }
                      try {
                        const data = { ...c, activeDate: todayStr };
                        await setDoc(doc(db, "daily_couplets", c.id), data);
                        triggerToast("Couplet is now pinned as today's active inspiration! 📌✨");
                      } catch (e) {
                        triggerToast("Error: " + (e as any).message);
                      }
                    };

                    // ==========================================
                    // VIEW MODE A: DASHBOARD VIEW (selectedCoupletId is null)
                    // ==========================================
                    if (selectedCoupletId === null) {
                      return (
                        <motion.div
                          key="couplets_dashboard"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="flex flex-col gap-6"
                        >
                          {/* Welcome Hero Panel */}
                          <div className="bg-stone-900/40 border border-stone-900 p-6 rounded-3xl relative overflow-hidden flex flex-col gap-2 shadow-lg">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.015] rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute inset-2 border border-amber-500/[0.01] rounded-2xl pointer-events-none" />
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <h2 className="text-xl font-serif font-bold text-amber-200">Daily Couplets & Schedule Manager</h2>
                              </div>
                              <button
                                onClick={handleInitNewCouplet}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add New Couplet</span>
                              </button>
                            </div>
                            <p className="text-xs text-stone-400 leading-relaxed max-w-3xl font-serif">
                              Curation engine for the **Daily Poetic Inspiration** banner seen on the homepage. Pinned dates take priority, while empty-date couplets form a fallback pool that rotates deterministically day-by-day.
                            </p>
                          </div>

                          {/* GRID OVERVIEW */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Today's Active Preview Card Mockup */}
                            <div className="lg:col-span-12">
                              <div className="flex flex-col gap-3">
                                <h3 className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Currently Live Today ({formatScheduleDate(todayStr)})</span>
                                </h3>
                                
                                {activeTodayInfo.couplet ? (
                                  <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-stone-900/80 to-stone-950/60 p-6 md:p-8 shadow-xl flex flex-col justify-between gap-6">
                                    <div className="absolute inset-2 border border-amber-500/[0.02] rounded-2xl pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.015] rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border font-semibold ${
                                          activeTodayInfo.isPinned 
                                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20" 
                                            : "bg-stone-950 text-stone-500 border-stone-900"
                                        }`}>
                                          {activeTodayInfo.isPinned ? "📌 Pinned for Today" : "🔄 Rotational Fallback"}
                                        </span>
                                        <span className="text-[10px] font-mono text-stone-500">
                                          Category: {activeTodayInfo.couplet.category}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleSelectCouplet(activeTodayInfo.couplet)}
                                        className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-900 border border-stone-850 hover:border-amber-500/30 text-[10px] font-mono uppercase text-amber-300 flex items-center gap-1 transition-all cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit/Reschedule</span>
                                      </button>
                                    </div>

                                    <div className="text-center flex flex-col gap-4 py-2">
                                      <p className="text-xl md:text-2xl font-serif text-amber-100 font-urdu whitespace-pre-line leading-relaxed" dir="rtl">
                                        {activeTodayInfo.couplet.urdu}
                                      </p>
                                      {activeTodayInfo.couplet.roman && (
                                        <p className="text-xs text-stone-400 font-serif italic tracking-wide">
                                          {activeTodayInfo.couplet.roman}
                                        </p>
                                      )}
                                      {activeTodayInfo.couplet.english && (
                                        <p className="text-xs text-stone-300 font-serif max-w-xl mx-auto">
                                          "{activeTodayInfo.couplet.english}"
                                        </p>
                                      )}
                                      <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 mt-2">
                                        — {activeTodayInfo.couplet.poet}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-stone-800 rounded-3xl p-12 text-center bg-stone-900/10">
                                    <p className="text-sm text-stone-500 font-serif">No couplets registered in the database yet.</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Scheduled timeline list */}
                            <div className="lg:col-span-6 flex flex-col gap-4">
                              <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                                <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span>Scheduled Timeline ({scheduledCouplets.length})</span>
                                </h3>
                              </div>

                              {scheduledCouplets.length === 0 ? (
                                <div className="border border-stone-900/60 rounded-2xl p-6 text-center bg-stone-900/5">
                                  <p className="text-xs text-stone-500 font-serif leading-relaxed">
                                    No upcoming scheduled dates. System will dynamically cycle through the fallback rotation pool.
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                                  {scheduledCouplets.map((c) => {
                                    const isToday = c.activeDate === todayStr;
                                    return (
                                      <div
                                        key={c.id}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                                          isToday
                                            ? "bg-amber-950/10 border-amber-500/25 shadow-sm"
                                            : "bg-stone-950/60 border-stone-900 hover:border-stone-850"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/15">
                                              {formatScheduleDate(c.activeDate)}
                                            </span>
                                            {isToday && (
                                              <span className="text-[8px] font-mono uppercase bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                Active Now
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleSelectCouplet(c)}
                                              className="p-1.5 text-stone-400 hover:text-amber-300 hover:bg-stone-900 rounded-lg transition-all cursor-pointer"
                                              title="Edit Couplet"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleQuickUnschedule(c)}
                                              className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                              title="Remove from Schedule"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        <p className="text-sm font-serif text-stone-200 font-urdu text-right" dir="rtl">
                                          {c.urdu}
                                        </p>
                                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-900/40 pt-1.5">
                                          <span>By {c.poet}</span>
                                          <span className="lowercase">{c.category}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Rotation Pool List */}
                            <div className="lg:col-span-6 flex flex-col gap-4">
                              <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                                <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  <span>Unscheduled Pool ({unscheduledCouplets.length})</span>
                                </h3>
                              </div>

                              {unscheduledCouplets.length === 0 ? (
                                <div className="border border-stone-900/60 rounded-2xl p-6 text-center bg-stone-900/5">
                                  <p className="text-xs text-stone-500 font-serif">No pool couplets available. Create some to populate rotation fallback.</p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                                  {unscheduledCouplets.map((c) => (
                                    <div
                                      key={c.id}
                                      className="p-4 rounded-2xl border border-stone-900 bg-stone-950/20 hover:bg-stone-950/40 hover:border-stone-850 transition-all flex flex-col gap-2.5"
                                    >
                                      <p className="text-sm font-serif text-stone-200 font-urdu text-right" dir="rtl">
                                        {c.urdu}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-900/40 pt-1.5">
                                        <span>By {c.poet} • {c.category}</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleQuickSetToday(c)}
                                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/30 text-[8px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                                            title="Pin as Today's inspiration"
                                          >
                                            Pin Today
                                          </button>
                                          <button
                                            onClick={() => handleSelectCouplet(c)}
                                            className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-850 text-[8px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                                          >
                                            Schedule
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </motion.div>
                      );
                    }

                    // ==========================================
                    // VIEW MODE B: DETAILED EDITOR (selectedCoupletId is non-null)
                    // ==========================================
                    return (
                      <motion.div
                        key={selectedCoupletId}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="grid grid-cols-1 xl:grid-cols-12 gap-8"
                      >
                        {/* Editor Form Column */}
                        <div className="xl:col-span-7 flex flex-col gap-6">
                          <div className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative">
                            <div className="flex justify-between items-center border-b border-stone-900/60 pb-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 font-bold">
                                  {isNewCouplet ? "New Inspiration" : "Modify Inspiration"}
                                </span>
                                <h2 className="text-base font-serif font-bold text-stone-100">
                                  {isNewCouplet ? "Create Poetic Inspiration" : `Modify Couplet #${selectedCoupletId.replace("couplet_", "")}`}
                                </h2>
                              </div>

                              <button
                                onClick={() => setSelectedCoupletId(null)}
                                className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-900 border border-stone-850 text-[10px] font-mono uppercase text-stone-400 hover:text-stone-200 transition-all cursor-pointer"
                              >
                                ← Dashboard
                              </button>
                            </div>

                            <div className="flex flex-col gap-5">
                              {/* Urdu verses */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider flex items-center justify-between">
                                  <span>Urdu Couplet / Verses (Required)</span>
                                  <span className="text-[8px] text-amber-500/70 lowercase font-sans">supports standard line breaks</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={coupletUrdu}
                                  onChange={(e) => setCoupletUrdu(e.target.value)}
                                  placeholder="ہر ایک بات پہ کہتے ہو تم کہ تو کیا ہے..."
                                  className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-amber-500/45 text-right font-serif leading-loose"
                                />
                                {coupletErrors.urdu && (
                                  <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5">
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                    <span>{coupletErrors.urdu}</span>
                                  </span>
                                )}
                              </div>

                              {/* Roman Transliteration */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                                  Roman Transliteration (Optional)
                                </label>
                                <textarea
                                  rows={2}
                                  value={coupletRoman}
                                  onChange={(e) => setCoupletRoman(e.target.value)}
                                  placeholder="Har ek baat pe kehte ho tum ke tu kya hai..."
                                  className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500/45 italic leading-relaxed"
                                />
                              </div>

                              {/* English Translation */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                                  English Translation (Optional)
                                </label>
                                <textarea
                                  rows={2}
                                  value={coupletEnglish}
                                  onChange={(e) => setCoupletEnglish(e.target.value)}
                                  placeholder="At every word you say to me, 'What are you?'..."
                                  className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Poet */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                                    Poet (Required)
                                  </label>
                                  <input
                                    type="text"
                                    value={coupletPoet}
                                    onChange={(e) => setCoupletPoet(e.target.value)}
                                    placeholder="Mirza Ghalib, Iqbal, Faiz, etc."
                                    className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/45"
                                  />
                                  {coupletErrors.poet && (
                                    <span className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1.5">
                                      <AlertCircle className="w-3 h-3 text-rose-500" />
                                      <span>{coupletErrors.poet}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Category */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                                    Category / Genre (Required)
                                  </label>
                                  <div className="grid grid-cols-2 p-1 bg-stone-950 border border-stone-850 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => setCoupletCategory("Sher")}
                                      className={`py-1.5 px-1 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                        coupletCategory === "Sher"
                                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                          : "border border-transparent text-stone-500 hover:text-stone-300"
                                      }`}
                                    >
                                      <span>Sher</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCoupletCategory("Mersiya")}
                                      className={`py-1.5 px-1 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                        coupletCategory === "Mersiya"
                                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                          : "border border-transparent text-stone-500 hover:text-stone-300"
                                      }`}
                                    >
                                      <span>Mersiya</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Interactive Scheduling Card */}
                              <div className="bg-stone-950/60 rounded-2xl border border-stone-850 p-5 flex flex-col gap-4">
                                <div className="flex items-center gap-2 border-b border-stone-900 pb-2.5">
                                  <Calendar className="w-4 h-4 text-amber-400" />
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-300 font-bold">
                                    Schedule & Date Configurations
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-mono uppercase text-stone-400">
                                      Select Specific Date
                                    </label>
                                    <input
                                      type="date"
                                      value={coupletActiveDate}
                                      onChange={(e) => setCoupletActiveDate(e.target.value)}
                                      className="w-full bg-stone-950 border border-stone-850 text-stone-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-500/40"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-mono uppercase text-stone-400">
                                      Quick Scheduling Presets
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setCoupletActiveDate(todayStr)}
                                        className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 text-amber-400 text-[9px] font-mono uppercase border border-stone-800 transition-all cursor-pointer"
                                      >
                                        Today
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setCoupletActiveDate(getTomorrowStr())}
                                        className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 text-emerald-400 text-[9px] font-mono uppercase border border-stone-800 transition-all cursor-pointer"
                                      >
                                        Tomorrow
                                      </button>
                                      {coupletActiveDate && (
                                        <button
                                          type="button"
                                          onClick={() => setCoupletActiveDate("")}
                                          className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-850 text-rose-400 text-[9px] font-mono uppercase border border-stone-800 transition-all cursor-pointer"
                                        >
                                          Clear Date
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Overlap Warning Message */}
                                {conflictingCouplet && (
                                  <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">
                                        ⚠️ Date Conflict Detected
                                      </span>
                                      <p className="text-[10px] text-stone-300 leading-relaxed font-serif">
                                        "{conflictingCouplet.urdu.substring(0, 30)}..." by <strong>{conflictingCouplet.poet}</strong> is already scheduled for <strong>{formatScheduleDate(coupletActiveDate)}</strong>. Saving will overwrite this scheduled date.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <p className="text-[9px] text-stone-500 leading-relaxed">
                                  If a date is set, this couplet will be pinned exclusively on the "Daily Poetic Inspiration" banner for that specific day. If left blank, it stays in the rotation pool.
                                </p>
                              </div>

                              {/* Explanation */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">
                                  Poetic Meaning / Explanation (Optional)
                                </label>
                                <textarea
                                  rows={3}
                                  value={coupletExplanation}
                                  onChange={(e) => setCoupletExplanation(e.target.value)}
                                  placeholder="Provide deep analysis or description of the background context..."
                                  className="w-full bg-stone-950 border border-stone-850 text-stone-200 placeholder-stone-700 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500/45 leading-relaxed font-serif"
                                />
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex justify-between items-center pt-4 border-t border-stone-900/40">
                              <div>
                                {!isNewCouplet && selectedCoupletId && (
                                  <button
                                    onClick={() => handleDeleteCouplet(selectedCoupletId)}
                                    className="px-3 py-2 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Couplet</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedCoupletId(null)}
                                  className="px-4 py-2.5 rounded-xl border border-stone-850 text-stone-400 hover:text-stone-200 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveCouplet}
                                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save record</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Real-Time Preview Column */}
                        <div className="xl:col-span-5 flex flex-col gap-4">
                          <h3 className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-amber-500" />
                            <span>Live Poetic Banner Mockup</span>
                          </h3>

                          {/* Preview container simulating DailySher.tsx */}
                          <div className="w-full relative overflow-hidden rounded-3xl border border-amber-500/10 bg-gradient-to-b from-stone-900/60 to-stone-950/40 p-6 md:p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6 select-none pointer-events-none">
                            <div className="absolute inset-2 border border-amber-500/[0.03] rounded-2xl pointer-events-none" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 font-bold block">
                                    {coupletActiveDate ? "Scheduled Inspiration" : "Aesthetic Discovery"}
                                  </span>
                                  <span className="text-[10px] font-serif text-stone-400 block">
                                    {coupletActiveDate ? `Pinned for ${formatScheduleDate(coupletActiveDate)}` : "Featured rotational sher"}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-600">
                                category: {coupletCategory}
                              </span>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4 py-4">
                              <p className="text-xl md:text-2xl font-serif text-amber-100 font-urdu leading-loose whitespace-pre-line text-right" dir="rtl">
                                {coupletUrdu || "تحریر یہاں نظر آئے گی..."}
                              </p>
                              <p className="text-xs italic text-stone-400 tracking-wide font-serif leading-relaxed px-2">
                                {coupletRoman || "Roman transliteration preview..."}
                              </p>
                              <p className="text-xs text-stone-300 font-serif leading-relaxed px-2">
                                {coupletEnglish ? `"${coupletEnglish}"` : "English translation preview..."}
                              </p>
                              <p className="text-[9px] font-mono uppercase tracking-widest text-stone-500 mt-2">
                                — {coupletPoet || "Anonymous Poet"}
                              </p>
                            </div>
                          </div>

                          <div className="bg-stone-900/10 border border-stone-900 p-4 rounded-2xl text-[10px] text-stone-500 font-serif leading-relaxed">
                            <strong>Interactive Curation Hint:</strong> The layout above updates automatically in real-time as you type, matching the exact styling, font sizing, and margins seen by the public. Make sure lines are balanced and translations are clear.
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              )}

              {/* BRANDING & SETTINGS SUB-FORM */}
              {activeSubTab === "settings" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-8 relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-900/60 pb-4 gap-4">
                    <div className="text-left">
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        Global Branding & Personalization Lounge
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Customize themes, fonts, company logos, and high-visibility home banners. Updates are instantly applied globally.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveBranding}
                      disabled={isSavingBranding}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingBranding ? "Saving..." : "Save Settings"}</span>
                    </button>
                  </div>

                  {/* Section 1: Visual Theme & Backgrounds */}
                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-serif font-semibold text-stone-200">
                        1. Interactive Layout Background & Themes
                      </h5>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Choose the default canvas aesthetic. This sets the background color palettes and highlight tones globally.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {[
                        { id: "midnight", name: "Midnight Slate", desc: "Dark rich obsidian, classic gold", color: "bg-[#0c0a09]" },
                        { id: "royal-velvet", name: "Royal Amethyst", desc: "Deep regal purple, rose accents", color: "bg-[#1a0b22]" },
                        { id: "parchment", name: "Parchment Paper", desc: "Warm tactile light theme", color: "bg-[#faf7ed] border-stone-300" },
                        { id: "emerald-court", name: "Emerald Court", desc: "Deep forest teal-jade and silver", color: "bg-[#0a201a]" },
                        { id: "imperial-gold", name: "Imperial Amber-Gold", desc: "Courtly charcoal-amber", color: "bg-[#0d0b09]" },
                        { id: "rosewood", name: "Rosewood Velvet", desc: "Crimson mahogany cherry-red", color: "bg-[#140507]" },
                        { id: "ivory", name: "Mughal Ivory & Gold", desc: "Aesthetic ivory cream bright theme", color: "bg-[#fcfbf7] border-stone-300" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBgTheme(t.id)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                            bgTheme === t.id
                              ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                              : "border-stone-800 bg-stone-950/40 hover:bg-stone-900"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-serif font-bold text-stone-200">{t.name}</span>
                            <div className={`w-3 h-3 rounded-full ${t.color} border border-stone-850`} />
                          </div>
                          <span className="text-[8px] text-stone-500 font-mono leading-tight">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Global Typography */}
                  <div className="flex flex-col gap-4 border-t border-stone-900 pt-6 text-left">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-serif font-semibold text-stone-200">
                        2. Master Font Selection (Typography Pairing)
                      </h5>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Select the primary typeface applied to headings, body texts, and poetry throughout the lounge.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Typography Dropdown Selector & Live Sample Row */}
                      <div className="lg:col-span-12 bg-stone-950/45 border border-stone-900 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                        <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                          <label className="text-[10px] font-mono uppercase text-stone-400 tracking-wider font-bold">
                            Typography Dropdown Selector
                          </label>
                          <select
                            value={activeFont}
                            onChange={(e) => setActiveFont(e.target.value)}
                            className="bg-stone-900 border border-stone-800 text-stone-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 w-full font-mono cursor-pointer transition-all hover:border-stone-700"
                          >
                            <option value="serif">Pristine Editorial (Playfair Display / Serif)</option>
                            <option value="sans">Modern Geometric (Inter / Sans-serif)</option>
                            <option value="display">Imperial Roman (Cinzel Display / Display)</option>
                            <option value="mono">Technical Monospace (JetBrains Mono / Mono)</option>
                            <option value="nastaliq">Urdu Nastaliq (نستعلیق)</option>
                            <option value="diwani">Diwani / Ruqaa (ديواني رقعة)</option>
                          </select>
                        </div>

                        {/* Live Font Sample immediately next to the dropdown */}
                        <div className="bg-stone-950 border border-amber-500/10 rounded-xl p-3 flex-1 flex items-center justify-between gap-4 w-full md:w-auto h-full min-h-[50px]">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider">Live Sample Preview</span>
                            <span className="text-[10px] text-stone-400">Selected: <strong className="text-amber-500 font-mono font-medium">{activeFont}</strong></span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Urdu / Arabic Word "ذوق" in selected font */}
                            <div className="flex flex-col items-end">
                              <span 
                                className={`text-2xl text-amber-400 font-bold transition-all ${
                                  activeFont === "serif" ? "font-serif" :
                                  activeFont === "sans" ? "font-sans" :
                                  activeFont === "display" ? "font-display" :
                                  activeFont === "mono" ? "font-mono" :
                                  activeFont === "nastaliq" ? "font-nastaliq text-3xl leading-normal" :
                                  activeFont === "diwani" ? "font-diwani text-3xl leading-normal" : ""
                                }`}
                                dir="rtl"
                              >
                                ذوق
                              </span>
                              <span className="text-[7px] font-mono text-stone-600">Urdu / Arabic</span>
                            </div>

                            <div className="w-px h-6 bg-stone-800" />

                            {/* Latin word "Zauq" in selected font */}
                            <div className="flex flex-col items-start">
                              <span 
                                className={`text-base text-stone-200 font-bold transition-all ${
                                  activeFont === "serif" ? "font-serif" :
                                  activeFont === "sans" ? "font-sans" :
                                  activeFont === "display" ? "font-display" :
                                  activeFont === "mono" ? "font-mono" :
                                  activeFont === "nastaliq" ? "font-nastaliq" :
                                  activeFont === "diwani" ? "font-diwani" : ""
                                }`}
                              >
                                Zauq
                              </span>
                              <span className="text-[7px] font-mono text-stone-600">Latin</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Left side: Options list */}
                      <div className="lg:col-span-7 flex flex-col gap-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { id: "serif", name: "Pristine Editorial", sample: "Playfair Display", desc: "Classic Georgia & Playfair, literary tone", fontClass: "font-serif" },
                            { id: "sans", name: "Modern Geometric", sample: "Inter Typeface", desc: "Clean Inter sans-serif, high legibility", fontClass: "font-sans" },
                            { id: "display", name: "Imperial Roman", sample: "Cinzel Display", desc: "Elegant Cinzel serif display fonts", fontClass: "font-display" },
                            { id: "mono", name: "Technical Monospace", sample: "JetBrains Mono", desc: "Technical JetBrains Mono, flat aesthetics", fontClass: "font-mono" },
                            { id: "nastaliq", name: "Urdu Nastaliq", sample: "نستعلیق اردو", desc: "Authentic, beautiful Urdu calligraphy", fontClass: "font-nastaliq" },
                            { id: "diwani", name: "Diwani / Ruqaa", sample: "ديواني رقعة", desc: "Aref Ruqaa cursive Arabic style", fontClass: "font-diwani" },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setActiveFont(f.id)}
                              className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                                activeFont === f.id
                                  ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                                  : "border-stone-800 bg-stone-950/40 hover:bg-stone-900"
                              }`}
                            >
                              <span className="text-[10px] font-mono text-stone-500">{f.name}</span>
                              <span className={`text-sm text-amber-500 font-bold ${f.fontClass}`}>
                                {f.sample}
                              </span>
                              <span className="text-[8px] text-stone-600 leading-tight mt-0.5">{f.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right side: Live Preview */}
                      <div className="lg:col-span-5 bg-stone-950/60 border border-stone-900 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-stone-905 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                              Live Typography Visualizer
                            </span>
                          </div>
                          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase font-bold">
                            {[
                              { id: "serif", name: "Pristine" },
                              { id: "sans", name: "Geometric" },
                              { id: "display", name: "Roman" },
                              { id: "mono", name: "Mono" },
                              { id: "nastaliq", name: "Nastaliq" },
                              { id: "diwani", name: "Diwani" },
                            ].find((o) => o.id === activeFont)?.name || "Active"}
                          </span>
                        </div>

                        {/* Interactive Sample Card */}
                        <div className="relative border border-amber-500/15 rounded-xl p-4 flex flex-col text-center justify-center bg-stone-950/90 shadow-inner overflow-hidden min-h-[160px]">
                          {/* Sitar Accent Border */}
                          <div className="absolute inset-x-4 inset-y-2 border border-amber-500/5 rounded-lg pointer-events-none" />
                          
                          <div className="relative z-10 flex flex-col gap-2">
                            <h6 className="text-stone-500 text-[9px] uppercase tracking-widest font-bold font-mono text-center">
                              Zauq Anthology Sample
                            </h6>
                            
                            <div className="h-px w-10 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent mx-auto" />

                            {previewCustomText.trim() ? (
                              <p className={`text-stone-200 text-sm leading-relaxed ${
                                activeFont === "nastaliq" || activeFont === "diwani" 
                                  ? "text-lg font-medium py-1.5 text-amber-400" 
                                  : "italic"
                              } ${
                                [
                                  { id: "serif", fontClass: "font-serif" },
                                  { id: "sans", fontClass: "font-sans" },
                                  { id: "display", fontClass: "font-display" },
                                  { id: "mono", fontClass: "font-mono" },
                                  { id: "nastaliq", fontClass: "font-nastaliq" },
                                  { id: "diwani", fontClass: "font-diwani" },
                                ].find((o) => o.id === activeFont)?.fontClass || "font-serif"
                              }`}
                              dir={activeFont === "nastaliq" || activeFont === "diwani" ? "rtl" : "ltr"}
                              >
                                {previewCustomText}
                              </p>
                            ) : (
                              <>
                                {/* Urdu verses */}
                                <p className={`text-amber-400 font-medium leading-loose text-base ${
                                  [
                                    { id: "serif", fontClass: "font-serif" },
                                    { id: "sans", fontClass: "font-sans" },
                                    { id: "display", fontClass: "font-display" },
                                    { id: "mono", fontClass: "font-mono" },
                                    { id: "nastaliq", fontClass: "font-nastaliq" },
                                    { id: "diwani", fontClass: "font-diwani" },
                                  ].find((o) => o.id === activeFont)?.fontClass || "font-serif"
                                }`}
                                dir="rtl"
                                >
                                  ہم پرورشِ لوح و قلم کرتے رہیں گے<br/>
                                  جو دل پہ گزرتی ہے رقم کرتے رہیں گے
                                </p>
                                
                                {/* English translation */}
                                <p className={`text-[10px] text-stone-400 leading-relaxed max-w-xs mx-auto italic mt-1.5 ${
                                  [
                                    { id: "serif", fontClass: "font-serif" },
                                    { id: "sans", fontClass: "font-sans" },
                                    { id: "display", fontClass: "font-display" },
                                    { id: "mono", fontClass: "font-mono" },
                                    { id: "nastaliq", fontClass: "font-nastaliq" },
                                    { id: "diwani", fontClass: "font-diwani" },
                                  ].find((o) => o.id === activeFont)?.fontClass || "font-serif"
                                }`}>
                                  "We shall continue to nurture the tablet and the pen; whatever passes over the heart, we shall continue to write."
                                </p>
                                
                                <span className={`text-[9px] text-stone-500 font-mono tracking-wider mt-1 block uppercase ${
                                  [
                                    { id: "serif", fontClass: "font-serif" },
                                    { id: "sans", fontClass: "font-sans" },
                                    { id: "display", fontClass: "font-display" },
                                    { id: "mono", fontClass: "font-mono" },
                                    { id: "nastaliq", fontClass: "font-nastaliq" },
                                    { id: "diwani", fontClass: "font-diwani" },
                                  ].find((o) => o.id === activeFont)?.fontClass || "font-serif"
                                }`}>
                                  — Faiz Ahmed Faiz
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Interactive testing field */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[9px] font-mono uppercase text-stone-500 tracking-wider">
                            Interactive Typography Test Bench
                          </label>
                          <input
                            type="text"
                            value={previewCustomText}
                            onChange={(e) => setPreviewCustomText(e.target.value)}
                            placeholder="Type an English phrase, Urdu, or Arabic verse here to test..."
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-[11px] placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
                          />
                          {previewCustomText && (
                            <button
                              type="button"
                              onClick={() => setPreviewCustomText("")}
                              className="text-[9px] font-mono text-stone-500 hover:text-stone-300 text-left cursor-pointer underline underline-offset-2 self-start"
                            >
                              Reset to Classical Faiz Couplet
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Brand Logo Setup (CRUD) */}
                  <div className="flex flex-col gap-4 border-t border-stone-900 pt-6 text-left">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-serif font-semibold text-stone-200">
                        3. Header Brand Logo Customization (CRUD)
                      </h5>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Modify the brand name text, subtitle tagline, or upload a custom visual image logo to display in the header bar.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-950/20 p-4 rounded-2xl border border-stone-900/60">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Brand Title Text
                        </label>
                        <input
                          type="text"
                          value={logoText}
                          onChange={(e) => setLogoText(e.target.value)}
                          placeholder="e.g. ZAUQ"
                          className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Brand Subtitle Tagline
                        </label>
                        <input
                          type="text"
                          value={logoSubtitle}
                          onChange={(e) => setLogoSubtitle(e.target.value)}
                          placeholder="e.g. Urdu Literary Lounge"
                          className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      
                      <div className="md:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Custom Logo Graphic Image
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="Enter image URL, or leave empty for standard Sitar Chiragh logo"
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 flex-1"
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              id="logo-image-uploader"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadToStorageWithProgress(`branding/logo_${Date.now()}`, file, (progress) => {
                                    setLogoUploadProgress(Math.round(progress));
                                  }).then((url) => {
                                    setLogoUrl(url);
                                    setLogoUploadProgress(null);
                                    triggerToast("Logo graphic uploaded successfully!");
                                  }).catch((err) => {
                                    console.error("Logo upload failed", err);
                                    setLogoUploadProgress(null);
                                    triggerToast("Logo upload failed.");
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor="logo-image-uploader"
                              className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-stone-200 rounded-xl border border-stone-800 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 h-full whitespace-nowrap"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{logoUploadProgress !== null ? `${logoUploadProgress}%` : "Upload File"}</span>
                            </label>
                          </div>
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoUrl("")}
                              className="p-2 bg-stone-900 hover:bg-rose-950/20 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-950/40 rounded-xl text-xs transition-colors cursor-pointer"
                              title="Reset Logo to default SVG"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Home Premium Banner (CRUD) */}
                  <div className="flex flex-col gap-4 border-t border-stone-900 pt-6 text-left">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-amber-400" />
                      <h5 className="text-xs font-serif font-semibold text-stone-200">
                        4. Home Screen Premium Welcome Banner (CRUD)
                      </h5>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Configure the hero display welcoming users on the Deewan home page. Set a custom photo background and link a premium interactive tab call-to-action button.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-950/20 p-4 rounded-2xl border border-stone-900/60">
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Welcome Banner Heading Text
                        </label>
                        <input
                          type="text"
                          value={bannerHeading}
                          onChange={(e) => setBannerHeading(e.target.value)}
                          placeholder="e.g. Zauq Urdu Literary Lounge"
                          className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Welcome Banner Tagline Description
                        </label>
                        <textarea
                          rows={3}
                          value={bannerTagline}
                          onChange={(e) => setBannerTagline(e.target.value)}
                          placeholder="Enter brief description welcoming visitors..."
                          className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Custom Banner Cover Photo
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={bannerImageUrl}
                            onChange={(e) => setBannerImageUrl(e.target.value)}
                            placeholder="Enter image URL, or leave empty for dynamic aesthetic grid"
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 flex-1"
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              id="banner-image-uploader"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadToStorageWithProgress(`branding/banner_${Date.now()}`, file, (progress) => {
                                    setBannerUploadProgress(Math.round(progress));
                                  }).then((url) => {
                                    setBannerImageUrl(url);
                                    setBannerUploadProgress(null);
                                    triggerToast("Banner graphic uploaded successfully!");
                                  }).catch((err) => {
                                    console.error("Banner upload failed", err);
                                    setBannerUploadProgress(null);
                                    triggerToast("Banner upload failed.");
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor="banner-image-uploader"
                              className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-stone-200 rounded-xl border border-stone-800 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 h-full whitespace-nowrap"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{bannerUploadProgress !== null ? `${bannerUploadProgress}%` : "Upload File"}</span>
                            </label>
                          </div>
                          {bannerImageUrl && (
                            <button
                              type="button"
                              onClick={() => setBannerImageUrl("")}
                              className="p-2 bg-stone-900 hover:bg-rose-950/20 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-950/40 rounded-xl text-xs transition-colors cursor-pointer"
                              title="Reset Banner to default gradient background"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                          Welcome Button Action Destination Link
                        </label>
                        <select
                          value={bannerLink}
                          onChange={(e) => setBannerLink(e.target.value)}
                          className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 cursor-pointer"
                        >
                          <option value="deewan">Deewan (Keep home anthology view)</option>
                          <option value="beitbazi">Beitbazi (Real-time AI Poetic Duel)</option>
                          <option value="sitar">Interactive Sitar (Sound Synthesis Room)</option>
                          <option value="dictionary">Zauq-e-Lafz (Classical Urdu Dictionary)</option>
                          <option value="card">Card Designer (Quote Card Customizer)</option>
                          <option value="videos">Sama'a Lounge (Video Performance Stage)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CMS SUB-FORM */}
              {activeSubTab === "cms" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-900/60 pb-4 gap-4">
                    <div className="text-left">
                      <h4 className="text-sm font-serif font-bold text-amber-300">
                        Content Management System (CMS) Lounge
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Create, edit, and publish custom static pages like "About Us" and "Privacy Policy" that are seamlessly linked to your homepage footer.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    {/* Left Column: Pages List */}
                    <div className="lg:col-span-4 bg-stone-950/40 p-4 rounded-2xl border border-stone-900 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-semibold">
                          Published Pages
                        </h5>
                        <button
                          onClick={() => {
                            setSelectedCmsPageId("new");
                            setCmsPageTitle("");
                            setCmsPageContent("");
                            setCmsPageIdInput("");
                          }}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New Page</span>
                        </button>
                      </div>

                      {isLoadingCms ? (
                        <div className="py-8 text-center text-xs text-stone-500">Loading CMS Pages...</div>
                      ) : cmsPages.length === 0 ? (
                        <div className="py-6 text-center text-xs text-stone-500 flex flex-col gap-3">
                          <p>No custom pages found.</p>
                          <div className="flex flex-col gap-2 px-2">
                            <button
                              onClick={async () => {
                                try {
                                  setIsSavingCms(true);
                                  const aboutRef = doc(db, "cms_pages", "about-us");
                                  await setDoc(aboutRef, {
                                    id: "about-us",
                                    title: DEFAULT_CMS_TEMPLATES["about-us"].title,
                                    content: DEFAULT_CMS_TEMPLATES["about-us"].content,
                                    updatedAt: serverTimestamp()
                                  });
                                  const privacyRef = doc(db, "cms_pages", "privacy-policy");
                                  await setDoc(privacyRef, {
                                    id: "privacy-policy",
                                    title: DEFAULT_CMS_TEMPLATES["privacy-policy"].title,
                                    content: DEFAULT_CMS_TEMPLATES["privacy-policy"].content,
                                    updatedAt: serverTimestamp()
                                  });
                                  triggerToast("Successfully bootstrapped About Us & Privacy Policy pages!");
                                  // Refresh
                                  const querySnapshot = await getDocs(collection(db, "cms_pages"));
                                  const pages: CMSPage[] = [];
                                  querySnapshot.forEach((docSnap) => {
                                    pages.push({
                                      id: docSnap.id,
                                      ...docSnap.data()
                                    } as CMSPage);
                                  });
                                  setCmsPages(pages);
                                } catch (err) {
                                  console.error(err);
                                  triggerToast("Failed to bootstrap pages.");
                                } finally {
                                  setIsSavingCms(false);
                                }
                              }}
                              className="w-full py-2 bg-amber-500 text-stone-950 font-mono font-bold text-[10px] uppercase rounded-xl hover:bg-amber-400 cursor-pointer"
                            >
                              🚀 Bootstrap Standard Pages
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
                          {cmsPages.map((page) => (
                            <div
                              key={page.id}
                              onClick={() => {
                                setSelectedCmsPageId(page.id);
                                setCmsPageTitle(page.title);
                                setCmsPageContent(page.content);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                selectedCmsPageId === page.id
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                  : "bg-stone-900/40 border-stone-900 hover:border-stone-850 text-stone-300 hover:text-stone-100"
                              }`}
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs font-serif font-bold truncate">{page.title}</span>
                                <span className="text-[9px] font-mono text-stone-500">/{page.id}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCmsPageId(page.id);
                                    setCmsPageTitle(page.title);
                                    setCmsPageContent(page.content);
                                  }}
                                  className="p-1 text-stone-400 hover:text-amber-400 hover:bg-stone-900/60 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {page.id !== "about-us" && page.id !== "privacy-policy" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCmsPage(page.id);
                                    }}
                                    className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-900/60 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Prefill Assist card */}
                      <div className="mt-4 p-3 rounded-xl bg-stone-900/20 border border-stone-900 flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-stone-500 uppercase">Quick templates</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setSelectedCmsPageId("new");
                              setCmsPageIdInput("about-us");
                              setCmsPageTitle(DEFAULT_CMS_TEMPLATES["about-us"].title);
                              setCmsPageContent(DEFAULT_CMS_TEMPLATES["about-us"].content);
                              triggerToast("Prefilled template for 'about-us'!");
                            }}
                            className="p-2 text-center rounded border border-stone-800 hover:border-amber-500/30 text-[9px] font-mono text-stone-400 hover:text-amber-300 transition-all cursor-pointer"
                          >
                            About Us
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCmsPageId("new");
                              setCmsPageIdInput("privacy-policy");
                              setCmsPageTitle(DEFAULT_CMS_TEMPLATES["privacy-policy"].title);
                              setCmsPageContent(DEFAULT_CMS_TEMPLATES["privacy-policy"].content);
                              triggerToast("Prefilled template for 'privacy-policy'!");
                            }}
                            className="p-2 text-center rounded border border-stone-800 hover:border-amber-500/30 text-[9px] font-mono text-stone-400 hover:text-amber-300 transition-all cursor-pointer"
                          >
                            Privacy Policy
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Page Editor */}
                    <div className="lg:col-span-8 bg-stone-950/20 p-5 rounded-2xl border border-stone-900 flex flex-col gap-4">
                      {selectedCmsPageId ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-stone-900 pb-3">
                            <h5 className="text-xs font-mono uppercase text-amber-400 font-bold">
                              {selectedCmsPageId === "new" ? "Create New Page" : `Editing: /${selectedCmsPageId}`}
                            </h5>
                            <button
                              onClick={handleSaveCmsPage}
                              disabled={isSavingCms}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingCms ? "Saving..." : "Save Page"}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                                Page Slug/ID (URL Path)
                              </label>
                              <input
                                type="text"
                                value={selectedCmsPageId === "new" ? cmsPageIdInput : selectedCmsPageId}
                                onChange={(e) => setCmsPageIdInput(e.target.value)}
                                disabled={selectedCmsPageId !== "new"}
                                placeholder="e.g. about-us, privacy-policy"
                                className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                                User-Facing Page Title
                              </label>
                              <input
                                type="text"
                                value={cmsPageTitle}
                                onChange={(e) => setCmsPageTitle(e.target.value)}
                                placeholder="e.g. About Our Lounge, Terms of Service"
                                className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                                Page Content (Markdown Supported)
                              </label>
                              <span className="text-[9px] text-stone-600 font-mono">Supports standard markdown formatting</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <textarea
                                rows={14}
                                value={cmsPageContent}
                                onChange={(e) => setCmsPageContent(e.target.value)}
                                placeholder="# Page Title&#10;&#10;Write markdown content here..."
                                className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
                              />
                              <div className="bg-stone-950/60 border border-stone-900 rounded-xl p-3 text-xs overflow-y-auto max-h-[290px] leading-relaxed text-stone-300 text-left">
                                <span className="text-[9px] font-mono text-stone-600 uppercase block mb-2 border-b border-stone-900 pb-1">Live Preview</span>
                                {cmsPageContent ? (
                                  <div className="markdown-preview whitespace-pre-wrap font-sans">
                                    {cmsPageContent.split("\n").map((line, idx) => {
                                      if (line.trim().startsWith("# ")) {
                                        return <h1 key={idx} className="text-sm font-serif font-bold text-amber-400 mt-2 mb-1">{line.trim().substring(2)}</h1>;
                                      } else if (line.trim().startsWith("## ")) {
                                        return <h2 key={idx} className="text-xs font-serif font-bold text-amber-300 mt-2 mb-1">{line.trim().substring(3)}</h2>;
                                      } else if (line.trim().startsWith("### ")) {
                                        return <h3 key={idx} className="text-xs font-serif font-semibold text-stone-200 mt-1 mb-1">{line.trim().substring(4)}</h3>;
                                      } else if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                                        return <li key={idx} className="list-disc list-inside text-stone-400 pl-2">{line.trim().substring(2)}</li>;
                                      } else if (line.trim().startsWith("> ")) {
                                        return <blockquote key={idx} className="border-l-2 border-amber-500 pl-2 italic my-1 text-stone-400 bg-stone-900/30 p-1 rounded">{line.trim().substring(2)}</blockquote>;
                                      } else {
                                        return <p key={idx} className="mb-1 text-stone-300 min-h-[1em]">{line}</p>;
                                      }
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-stone-600 italic">No content written yet. Preview will appear here.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-24 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
                          <FileText className="w-8 h-8 text-stone-700" />
                          <p className="text-xs">Select an existing CMS Page from the sidebar or click "New Page" to create a custom publishing route.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECURITY & ACCESS CONTROLS SUB-FORM */}
              {activeSubTab === "security" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-stone-900/30 border border-stone-900 p-6 md:p-8 rounded-3xl flex flex-col gap-6 relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-900/60 pb-4 gap-4">
                    <div className="text-left">
                      <h4 className="text-sm font-serif font-bold text-amber-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        Gatekeeper Control Panel & Access Rules
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Control global authentication accessibility, view registered bans, and restrict specific user UIDs or Emails from accessing personal notebooks.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                    {/* Left Column: Global Toggle and Ban Form */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                      <div className="bg-stone-950/40 border border-stone-900/60 p-5 rounded-2xl flex flex-col gap-4">
                        <h5 className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-900 pb-2">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          Authentication Gatekeeper
                        </h5>
                        <p className="text-[10px] text-stone-400 leading-normal">
                          Decide whether standard users are permitted to authenticate and access cloud notebooks. If disabled, only the Primary Administrator (amancib007@gmail.com) can authenticate.
                        </p>
                        
                        <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-900 mt-2">
                          <span className="text-xs font-serif font-medium text-stone-300">
                            User Login Status
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSaveSecuritySettings(!userLoginAllowed)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              userLoginAllowed 
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" 
                                : "bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                            }`}
                          >
                            {userLoginAllowed ? "Allowed (Active) ✓" : "Banned (Disabled) ✗"}
                          </button>
                        </div>
                      </div>

                      {/* Ban a User Form */}
                      <form onSubmit={handleBanUser} className="bg-stone-950/40 border border-stone-900/60 p-5 rounded-2xl flex flex-col gap-4">
                        <h5 className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-900 pb-2">
                          <UserX className="w-3.5 h-3.5 text-amber-500" />
                          Apply New Ban Rule
                        </h5>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                            Target User Email
                          </label>
                          <input
                            type="email"
                            value={banEmail}
                            onChange={(e) => setBanEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                            Target User ID (UID - Optional)
                          </label>
                          <input
                            type="text"
                            value={banUserIdInput}
                            onChange={(e) => setBanUserIdInput(e.target.value)}
                            placeholder="e.g. F8daKlsd8Fskd..."
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50 font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                            Reason for Ban
                          </label>
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="e.g. Wrong activity visible, spamming reviews"
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-stone-500 tracking-wider">
                            Activity Log / Evidence
                          </label>
                          <textarea
                            rows={3}
                            value={banWrongActivityLog}
                            onChange={(e) => setBanWrongActivityLog(e.target.value)}
                            placeholder="Details of the malicious or incorrect activity detected..."
                            className="bg-stone-950 border border-stone-900 text-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500/50 resize-none font-sans"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isBanning}
                          className="w-full mt-2 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{isBanning ? "Registering Ban..." : "Ban User"}</span>
                        </button>
                      </form>
                    </div>

                    {/* Right Column: Active Bans List */}
                    <div className="lg:col-span-7 bg-stone-950/20 p-5 rounded-2xl border border-stone-900 flex flex-col gap-4">
                      <h5 className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1.5 border-b border-stone-900 pb-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        Active Ban Registry ({bannedUsers.length})
                      </h5>

                      {bannedUsers.length > 0 ? (
                        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                          {bannedUsers.map((banned) => (
                            <div
                              key={banned.docId}
                              className="bg-stone-950 border border-stone-900 p-4 rounded-xl flex items-start justify-between gap-4 transition-all hover:border-rose-500/20"
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-stone-300 font-semibold block truncate">
                                    {banned.email || "No Email Specified"}
                                  </span>
                                  {banned.userId && (
                                    <span className="text-[8px] bg-stone-900 text-stone-500 px-1.5 py-0.5 rounded font-mono">
                                      UID: {banned.userId.substring(0, 8)}...
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-rose-400/90 font-serif italic mt-1.5">
                                  Ban Reason: {banned.reason}
                                </p>
                                {banned.wrongActivityLog && banned.wrongActivityLog !== "N/A" && (
                                  <div className="mt-2 bg-stone-900/65 rounded p-2 text-[9px] font-mono text-stone-500 leading-normal border border-stone-900/40">
                                    Evidence Log: {banned.wrongActivityLog}
                                  </div>
                                )}
                                <span className="text-[8px] font-mono text-stone-600 block mt-2">
                                  Banned At: {banned.bannedAt ? new Date(banned.bannedAt).toLocaleString() : "Unknown"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleUnbanUser(banned.docId)}
                                className="p-1.5 rounded-lg border border-stone-800 hover:border-emerald-500/30 text-stone-600 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
                                title="Unban User"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-24 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
                          <Shield className="w-8 h-8 text-stone-700" />
                          <p className="text-xs">No active user bans recorded in the database.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
}
