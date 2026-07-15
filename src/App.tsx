import React, { useState, useEffect } from "react";
import { BookOpen, Sword, MessageSquare, Feather, Compass, Palette, Music, Heart, Sparkles, AlertCircle, CloudLightning, Settings, Tv, Shuffle, Library, Menu, X, ChevronDown, RefreshCw, Search, FileText, ShieldAlert, Cpu } from "lucide-react";
import DeewanView from "./components/DeewanView";
import { makeUrlRelative } from "./utils/url";
import BeitBaziView from "./components/BeitBaziView";
import UstaadView from "./components/UstaadView";
import WordExplorer from "./components/WordExplorer";
import CardCreator from "./components/CardCreator";
import SitarRoom from "./components/SitarRoom";
import MyDeewanView from "./components/MyDeewanView";
import AudioControl from "./components/AudioControl";
import AdminPanel from "./components/AdminPanel";
import VideosView from "./components/VideosView";
import LibraryView from "./components/LibraryView";
import ApiPortal from "./components/ApiPortal";
import DailySherModal from "./components/DailySherModal";
import RandomSherModal from "./components/RandomSherModal";
import AuthModal from "./components/AuthModal";
import { Sher, Ghazal, ZauqVideo, Author, Book } from "./types";
import { STARTER_SHERS, CLASSIC_POETS, CURATED_GHAZALS, STARTER_VIDEOS, STARTER_AUTHORS, STARTER_BOOKS, DICTIONARY_WORDS } from "./data";
import { motion, AnimatePresence } from "motion/react";

// Firebase integration
import { auth, db, googleProvider, OperationType, handleFirestoreError, testConnection, logUserActivity } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, serverTimestamp, getDoc, getDocs } from "firebase/firestore";

const ZauqLogo = ({ className = "w-8.5 h-8.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    className={`text-amber-500 fill-current drop-shadow-[0_0_8px_rgba(217,119,6,0.35)] transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] transform hover:scale-105 aspect-square flex-shrink-0 ${className}`}
    id="zauq-header-svg-logo"
  >
    {/* Royal Mughal Arch Frame */}
    <path
      d="M50 12 C32 26, 22 41, 22 64 L22 83 C22 86, 24 88, 27 88 L73 88 C76 88, 78 86, 78 83 L78 64 C78 41, 68 26, 50 12 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="opacity-30"
    />
    {/* Burning Flame (Chiragh / Dia) */}
    <path
      d="M50 34 C44 43, 43 51, 50 60 C57 51, 56 43, 50 34 Z"
      fill="currentColor"
      className="text-amber-400 animate-pulse"
    />
    {/* Base Holder */}
    <path
      d="M36 67 C36 67, 41 65, 50 65 C59 65, 64 67, 64 67 L60 74 C59 75, 58 76, 56 76 L44 76 C42 76, 41 75, 40 74 Z"
      fill="currentColor"
      className="text-amber-600"
    />
    {/* Base Stand Line */}
    <line
      x1="28"
      y1="82"
      x2="72"
      y2="82"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="opacity-50"
    />
  </svg>
);

type TabID = "deewan" | "beitbazi" | "ustaad" | "dictionary" | "card" | "sitar" | "diary" | "videos" | "admin" | "authors" | "api";

const THEMES = [
  { id: "midnight", name: "Midnight", color: "#0c0a09" },
  { id: "royal-velvet", name: "Royal Velvet", color: "#1a0b22" },
  { id: "parchment", name: "Parchment", color: "#f5f5f4" },
  { id: "emerald-court", name: "Emerald Court", color: "#0a201a" },
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>("deewan");
  const [selectedSherForCard, setSelectedSherForCard] = useState<Sher | null>(null);
  const [savedShers, setSavedShers] = useState<Sher[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Reset focus mode when leaving the deewan tab
  useEffect(() => {
    if (activeTab !== "deewan") {
      setIsFocusMode(false);
    }
  }, [activeTab]);

  // Security & Ban States
  const [appUserLoginAllowed, setAppUserLoginAllowed] = useState<boolean>(true);
  const [currentUserIsBanned, setCurrentUserIsBanned] = useState<boolean>(false);
  const [currentUserBanReason, setCurrentUserBanReason] = useState<string>("");

  // Dynamic Branding Settings (overridden by admin global_config)
  const [globalTheme, setGlobalTheme] = useState<string>("midnight");
  const [globalFont, setGlobalFont] = useState<string>("serif");
  const [globalLogoText, setGlobalLogoText] = useState<string>("ZAUQ");
  const [globalLogoSubtitle, setGlobalLogoSubtitle] = useState<string>("Urdu Literary Lounge");
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string>("");
  const [globalBannerHeading, setGlobalBannerHeading] = useState<string>("Zauq Urdu Literary Lounge");
  const [globalBannerTagline, setGlobalBannerTagline] = useState<string>("");
  const [globalBannerImageUrl, setGlobalBannerImageUrl] = useState<string>("");
  const [globalBannerLink, setGlobalBannerLink] = useState<string>("deewan");

  // Real-time listener for dynamic branding settings
  useEffect(() => {
    const docRef = doc(db, "settings", "global_config");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.background) setGlobalTheme(data.background);
        if (data.font) setGlobalFont(data.font);
        if (data.logoText) setGlobalLogoText(data.logoText);
        if (data.logoSubtitle) setGlobalLogoSubtitle(data.logoSubtitle);
        setGlobalLogoUrl(makeUrlRelative(data.logoUrl || ""));
        setLogoError(false);
        if (data.bannerHeading) setGlobalBannerHeading(data.bannerHeading);
        setGlobalBannerTagline(data.bannerTagline || "");
        setGlobalBannerImageUrl(makeUrlRelative(data.bannerImageUrl || ""));
        if (data.bannerLink) setGlobalBannerLink(data.bannerLink);
        setAppUserLoginAllowed(data.userLoginAllowed !== undefined ? data.userLoginAllowed : true);
      }
    }, (err) => {
      console.error("Error watching global config:", err);
    });
    return () => unsubscribe();
  }, []);

  // CMS Dynamic Pages States
  const [dynamicCmsPages, setDynamicCmsPages] = useState<{ id: string; title: string }[]>([]);
  const [activeCmsPage, setActiveCmsPage] = useState<{ id: string; title: string; content: string } | null>(null);
  const [isLoadingCmsPage, setIsLoadingCmsPage] = useState(false);

  // Load published CMS page list for the footer
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "cms_pages"), (querySnapshot) => {
      const pages: { id: string; title: string }[] = [];
      querySnapshot.forEach((docSnap) => {
        pages.push({
          id: docSnap.id,
          title: docSnap.data().title || docSnap.id
        });
      });
      setDynamicCmsPages(pages);
    }, (err) => {
      console.error("Error watching cms pages:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenCmsPage = async (slug: string) => {
    try {
      setIsLoadingCmsPage(true);
      const docRef = doc(db, "cms_pages", slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setActiveCmsPage({
          id: slug,
          ...docSnap.data()
        } as any);
      } else {
        // Fallbacks for standard pages in case they are not in the db yet
        if (slug === "about-us") {
          setActiveCmsPage({
            id: "about-us",
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
          });
        } else if (slug === "privacy-policy") {
          setActiveCmsPage({
            id: "privacy-policy",
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
          });
        } else {
          triggerToast(`The page "/${slug}" is not published yet.`);
        }
      }
    } catch (err) {
      console.error("Failed to load CMS page:", err);
      triggerToast("Failed to load the requested page.");
    } finally {
      setIsLoadingCmsPage(false);
    }
  };

  // Theme state
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem("zauq_theme") || "midnight";
  });

  // Keep in sync with admin theme pushes
  useEffect(() => {
    if (globalTheme) {
      setTheme(globalTheme);
    }
  }, [globalTheme]);

  useEffect(() => {
    document.body.classList.remove(
      "theme-midnight",
      "theme-royal-velvet",
      "theme-parchment",
      "theme-emerald-court",
      "theme-imperial-gold",
      "theme-rosewood",
      "theme-ivory"
    );
    if (theme !== "midnight") {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem("zauq_theme", theme);
  }, [theme]);

  // Apply typography pairing globally to body
  useEffect(() => {
    document.body.classList.remove(
      "font-serif",
      "font-sans",
      "font-display",
      "font-mono",
      "font-nastaliq",
      "font-diwani"
    );
    const fontClassMap: Record<string, string> = {
      serif: "font-serif",
      sans: "font-sans",
      display: "font-display",
      mono: "font-mono",
      nastaliq: "font-nastaliq",
      diwani: "font-diwani"
    };
    const targetFontClass = fontClassMap[globalFont] || "font-serif";
    document.body.classList.add(targetFontClass);
  }, [globalFont]);

  // Dynamic collections from Firestore
  const [poets, setPoets] = useState<any[]>(CLASSIC_POETS);
  const [ghazals, setGhazals] = useState<Ghazal[]>(CURATED_GHAZALS);
  const [videos, setVideos] = useState<ZauqVideo[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [autoOpenBook, setAutoOpenBook] = useState<Book | null>(null);
  const [dailyCouplets, setDailyCouplets] = useState<any[]>([]);

  // Auth states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check if current user is banned or user logins are disabled
  useEffect(() => {
    if (!user) {
      setCurrentUserIsBanned(false);
      setCurrentUserBanReason("");
      return;
    }

    // Admin is never banned
    if (user.email === "amancib007@gmail.com") {
      setCurrentUserIsBanned(false);
      setCurrentUserBanReason("");
      return;
    }

    // 1. Check if user logins are globally disabled and this is not admin
    if (!appUserLoginAllowed) {
      setCurrentUserIsBanned(true);
      setCurrentUserBanReason("Logins for standard users have been temporarily disabled by the Administrator.");
      return;
    }

    // 2. Setup subscription to check if this user is in banned_users (by UID or by Email)
    const uidRef = doc(db, "banned_users", user.uid);
    const unsubUid = onSnapshot(uidRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserIsBanned(true);
        setCurrentUserBanReason(docSnap.data().reason || "Wrong activity detected.");
      } else {
        // Also check by email if we have it
        if (user.email) {
          const emailRef = doc(db, "banned_users", user.email.toLowerCase());
          const unsubEmail = onSnapshot(emailRef, (emailSnap) => {
            if (emailSnap.exists()) {
              setCurrentUserIsBanned(true);
              setCurrentUserBanReason(emailSnap.data().reason || "Wrong activity detected.");
            } else {
              setCurrentUserIsBanned(false);
              setCurrentUserBanReason("");
            }
          }, (err) => console.error("Error checking email ban:", err));
          return () => unsubEmail();
        } else {
          setCurrentUserIsBanned(false);
          setCurrentUserBanReason("");
        }
      }
    }, (err) => {
      console.error("Error checking uid ban:", err);
    });

    return () => unsubUid();
  }, [user, appUserLoginAllowed]);

  // Global search query and focus states
  const [globalSearch, setGlobalSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Selected entities from global search to route to specific views
  const [focusedSearchPoet, setFocusedSearchPoet] = useState<string | null>(null);
  const [focusedSearchGhazal, setFocusedSearchGhazal] = useState<Ghazal | null>(null);
  const [focusedSearchWord, setFocusedSearchWord] = useState<any | null>(null);

  // Real-time search matches computed dynamically
  const searchResults = React.useMemo(() => {
    if (!globalSearch.trim()) return { poets: [], ghazals: [], words: [] };
    const query = globalSearch.toLowerCase().trim();

    // 1. Poets matching name, bio or era
    const matchedPoets = poets.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.title?.toLowerCase().includes(query) ||
      p.bio?.toLowerCase().includes(query) ||
      p.era?.toLowerCase().includes(query)
    );

    // 2. Ghazals matching title, poet, or shers' urdu, roman, english
    const matchedGhazals = ghazals.filter(g => 
      g.title?.toLowerCase().includes(query) ||
      g.poet?.toLowerCase().includes(query) ||
      g.category?.toLowerCase().includes(query) ||
      g.shers?.some((s: any) => 
        s.urdu?.toLowerCase().includes(query) ||
        s.roman?.toLowerCase().includes(query) ||
        s.english?.toLowerCase().includes(query)
      )
    );

    // 3. Dictionary words matching wordUrdu, wordRoman, meanings or perspective
    const matchedWords = DICTIONARY_WORDS.filter(w => 
      w.wordUrdu?.toLowerCase().includes(query) ||
      w.wordRoman?.toLowerCase().includes(query) ||
      w.pronunciation?.toLowerCase().includes(query) ||
      w.meanings?.some(m => m.toLowerCase().includes(query)) ||
      w.zauqPerspective?.toLowerCase().includes(query)
    );

    return {
      poets: matchedPoets.slice(0, 5),
      ghazals: matchedGhazals.slice(0, 5),
      words: matchedWords.slice(0, 5)
    };
  }, [globalSearch, poets, ghazals]);

  // Search item selection click handlers
  const handleSelectSearchPoet = (poetName: string) => {
    setFocusedSearchPoet(poetName);
    setFocusedSearchGhazal(null);
    setFocusedSearchWord(null);
    setActiveTab("deewan");
    setGlobalSearch("");
    setIsSearchFocused(false);
    triggerToast(`Selected poet: ${poetName} ✍️`);
  };

  const handleSelectSearchGhazal = (ghazal: Ghazal) => {
    setFocusedSearchGhazal(ghazal);
    setFocusedSearchPoet(null);
    setFocusedSearchWord(null);
    setActiveTab("deewan");
    setGlobalSearch("");
    setIsSearchFocused(false);
    triggerToast(`Opened ghazal: ${ghazal.title} 📖`);
  };

  const handleSelectSearchWord = (word: any) => {
    setFocusedSearchWord(word);
    setFocusedSearchPoet(null);
    setFocusedSearchGhazal(null);
    setActiveTab("dictionary");
    setGlobalSearch("");
    setIsSearchFocused(false);
    triggerToast(`Opened word: ${word.wordRoman} 🔍`);
  };

  // Random Sher Modal state
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  // Track if collections are empty for lazy seeding upon auth resolution
  const [isPoetsEmpty, setIsPoetsEmpty] = useState(false);
  const [isGhazalsEmpty, setIsGhazalsEmpty] = useState(false);
  const [isVideosEmpty, setIsVideosEmpty] = useState(false);
  const [isAuthorsEmpty, setIsAuthorsEmpty] = useState(false);
  const [isBooksEmpty, setIsBooksEmpty] = useState(false);

  // Live sync of public Poets, Ghazals, and Videos from Firestore
  useEffect(() => {
    const poetsRef = collection(db, "poets");
    const unsubscribePoets = onSnapshot(poetsRef, (snapshot) => {
      if (snapshot.empty) {
        setPoets(CLASSIC_POETS);
        setIsPoetsEmpty(true);
      } else {
        setIsPoetsEmpty(false);
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPoets(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "poets");
    });

    const ghazalsRef = collection(db, "ghazals");
    const unsubscribeGhazals = onSnapshot(ghazalsRef, (snapshot) => {
      if (snapshot.empty) {
        setGhazals(CURATED_GHAZALS);
        setIsGhazalsEmpty(true);
      } else {
        setIsGhazalsEmpty(false);
        const list: Ghazal[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || "",
            poet: data.poet || "",
            category: data.category || "",
            backgroundStory: data.backgroundStory || "",
            shers: data.shers || []
          });
        });
        setGhazals(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "ghazals");
    });

    const videosRef = collection(db, "videos");
    const unsubscribeVideos = onSnapshot(videosRef, (snapshot) => {
      if (snapshot.empty) {
        setVideos(STARTER_VIDEOS);
        setIsVideosEmpty(true);
      } else {
        setIsVideosEmpty(false);
        const list: ZauqVideo[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || "",
            artist: data.artist || "",
            url: data.url || "",
            category: data.category || "Qawwali",
            description: data.description || "",
            createdAt: data.createdAt
          });
        });
        // Sort by createdAt timestamp
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA; // Newest first
        });
        setVideos(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "videos");
    });

    const authorsRef = collection(db, "authors");
    const unsubscribeAuthors = onSnapshot(authorsRef, (snapshot) => {
      if (snapshot.empty) {
        setAuthors(STARTER_AUTHORS);
        setIsAuthorsEmpty(true);
      } else {
        setIsAuthorsEmpty(false);
        const list: Author[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || "",
            bio: data.bio || "",
            imageUrl: data.imageUrl || "",
            isLocalImage: !!data.isLocalImage,
            birthPlace: data.birthPlace || "",
            activeYears: data.activeYears || "",
            createdAt: data.createdAt
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAuthors(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "authors");
    });

    const booksRef = collection(db, "books");
    const unsubscribeBooks = onSnapshot(booksRef, (snapshot) => {
      if (snapshot.empty) {
        setBooks(STARTER_BOOKS);
        setIsBooksEmpty(true);
      } else {
        setIsBooksEmpty(false);
        const list: Book[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            authorId: data.authorId || "",
            title: data.title || "",
            description: data.description || "",
            coverImageUrl: data.coverImageUrl || "",
            isLocalCover: !!data.isLocalCover,
            audioUrl: data.audioUrl || "",
            isLocalAudio: !!data.isLocalAudio,
            videoUrl: data.videoUrl || "",
            videoType: data.videoType || "youtube",
            files: data.files || [],
            averageRating: data.averageRating,
            reviewsCount: data.reviewsCount,
            createdAt: data.createdAt
          });
        });
        setBooks(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "books");
    });

    const dailyCoupletsRef = collection(db, "daily_couplets");
    const unsubscribeDailyCouplets = onSnapshot(dailyCoupletsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDailyCouplets(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "daily_couplets");
    });

    return () => {
      unsubscribePoets();
      unsubscribeGhazals();
      unsubscribeVideos();
      unsubscribeAuthors();
      unsubscribeBooks();
      unsubscribeDailyCouplets();
    };
  }, []);

  // Seeding effect upon successful authentication if collections are empty
  useEffect(() => {
    if (authLoading || !user) return;

    if (isPoetsEmpty) {
      const seedPoets = async () => {
        try {
          const batch = writeBatch(db);
          CLASSIC_POETS.forEach((poet) => {
            const pId = poet.name.replace(/\s+/g, "_").toLowerCase();
            batch.set(doc(db, "poets", pId), poet);
          });
          await batch.commit();
          setIsPoetsEmpty(false);
        } catch (e) {
          console.error("Failed to seed poets to Firestore:", e);
        }
      };
      seedPoets();
    }

    if (isGhazalsEmpty) {
      const seedGhazals = async () => {
        try {
          const batch = writeBatch(db);
          CURATED_GHAZALS.forEach((ghazal) => {
            batch.set(doc(db, "ghazals", ghazal.id), ghazal);
          });
          await batch.commit();
          setIsGhazalsEmpty(false);
        } catch (e) {
          console.error("Failed to seed ghazals to Firestore:", e);
        }
      };
      seedGhazals();
    }

    if (isVideosEmpty) {
      const seedVideos = async () => {
        try {
          const batch = writeBatch(db);
          STARTER_VIDEOS.forEach((vid) => {
            batch.set(doc(db, "videos", vid.id), {
              ...vid,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          setIsVideosEmpty(false);
        } catch (e) {
          console.error("Failed to seed videos to Firestore:", e);
        }
      };
      seedVideos();
    }

    if (isAuthorsEmpty) {
      const seedAuthors = async () => {
        try {
          const batch = writeBatch(db);
          STARTER_AUTHORS.forEach((authItem) => {
            batch.set(doc(db, "authors", authItem.id), {
              ...authItem,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          setIsAuthorsEmpty(false);
        } catch (e) {
          console.error("Failed to seed authors to Firestore:", e);
        }
      };
      seedAuthors();
    }

    if (isBooksEmpty) {
      const seedBooks = async () => {
        try {
          const batch = writeBatch(db);
          STARTER_BOOKS.forEach((bookItem) => {
            batch.set(doc(db, "books", bookItem.id), {
              ...bookItem,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          setIsBooksEmpty(false);
        } catch (e) {
          console.error("Failed to seed books to Firestore:", e);
        }
      };
      seedBooks();
    }
  }, [user, authLoading, isPoetsEmpty, isGhazalsEmpty, isVideosEmpty, isAuthorsEmpty, isBooksEmpty]);

  // Sync favorites with local storage / Firestore
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle local data and live Firestore sync
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Offline/Logged out mode fallback: load from localStorage
      const stored = localStorage.getItem("zauq_saved_shers");
      if (stored) {
        try {
          setSavedShers(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse saved shers:", e);
        }
      } else {
        // Seed notebook with starter shers so it's not totally empty on first launch
        const starters = STARTER_SHERS.slice(0, 2);
        setSavedShers(starters);
        localStorage.setItem("zauq_saved_shers", JSON.stringify(starters));
      }
    } else {
      // Online/Logged in mode: Setup Firestore subscription listener
      const collectionPath = `users/${user.uid}/saved_shers`;
      const q = collection(db, collectionPath);
      
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const shersList: Sher[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            shersList.push({
              id: docSnap.id,
              urdu: data.urdu,
              roman: data.roman,
              english: data.english,
              poet: data.poet,
              explanation: data.explanation,
              isUserAdded: data.isUserAdded,
            });
          });
          
          // Sort based on Firestore createdAt if available
          shersList.sort((a, b) => {
            const docA = snapshot.docs.find(d => d.id === a.id);
            const docB = snapshot.docs.find(d => d.id === b.id);
            const timeA = docA?.data().createdAt?.toMillis?.() || 0;
            const timeB = docB?.data().createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });

          // Check and sync legacy local storage shers if cloud is empty
          const stored = localStorage.getItem("zauq_saved_shers");
          let localShers: Sher[] = [];
          if (stored) {
            try {
              localShers = JSON.parse(stored);
            } catch (e) {}
          }

          if (shersList.length === 0 && localShers.length > 0) {
            triggerToast("Syncing your local notebook to the cloud... ☁️");
            try {
              const batch = writeBatch(db);
              localShers.forEach((s) => {
                const docRef = doc(db, collectionPath, s.id);
                batch.set(docRef, {
                  id: s.id,
                  urdu: s.urdu,
                  roman: s.roman,
                  english: s.english,
                  poet: s.poet,
                  explanation: s.explanation || "",
                  isUserAdded: !!s.isUserAdded,
                  userId: user.uid,
                  createdAt: serverTimestamp(),
                });
              });
              await batch.commit();
              triggerToast("Notebook synchronized with your cloud Deewan! ☁️📖");
            } catch (err) {
              console.error("Failed to sync legacy local shers to Firestore:", err);
            }
          }

          setSavedShers(shersList);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, collectionPath);
        }
      );

      return () => unsubscribe();
    }
  }, [user, authLoading]);

  // Fallback direct persistence for logged-out state
  const updateNotebookLocal = (newShers: Sher[]) => {
    setSavedShers(newShers);
    localStorage.setItem("zauq_saved_shers", JSON.stringify(newShers));
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const handleSaveSher = async (sher: Sher) => {
    const alreadySaved = savedShers.some((s) => s.urdu === sher.urdu);
    if (alreadySaved) {
      triggerToast("Already saved in your Deewan Notebook! ✨");
      return;
    }

    if (user) {
      const collectionPath = `users/${user.uid}/saved_shers`;
      try {
        await setDoc(doc(db, collectionPath, sher.id), {
          id: sher.id,
          urdu: sher.urdu,
          roman: sher.roman,
          english: sher.english,
          poet: sher.poet,
          explanation: sher.explanation || "",
          isUserAdded: !!sher.isUserAdded,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        logUserActivity("save_sher", `Saved sher by ${sher.poet || "Unknown"}: "${sher.urdu.substring(0, 40)}..."`);
        triggerToast("Sher saved to your cloud Deewan! ☁️✨");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, collectionPath);
      }
    } else {
      const updated = [sher, ...savedShers];
      updateNotebookLocal(updated);
      triggerToast("Sher saved locally! 📖 (Sign in to sync with cloud)");
    }
  };

  const handleRemoveSher = async (id: string) => {
    if (user) {
      const collectionPath = `users/${user.uid}/saved_shers`;
      try {
        await deleteDoc(doc(db, collectionPath, id));
        logUserActivity("delete_sher", `Deleted saved sher ID ${id}`);
        triggerToast("Sher removed from your cloud notebook.");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionPath);
      }
    } else {
      const updated = savedShers.filter((s) => s.id !== id);
      updateNotebookLocal(updated);
      triggerToast("Sher removed from your local notebook.");
    }
  };

  const handleAddCustomSher = async (sher: Sher) => {
    if (user) {
      const collectionPath = `users/${user.uid}/saved_shers`;
      try {
        await setDoc(doc(db, collectionPath, sher.id), {
          id: sher.id,
          urdu: sher.urdu,
          roman: sher.roman,
          english: sher.english,
          poet: sher.poet,
          explanation: sher.explanation || "",
          isUserAdded: true,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        logUserActivity("save_sher", `Added custom composition: "${sher.urdu.substring(0, 40)}..."`);
        triggerToast("Composition saved to cloud! ✍️☁️");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, collectionPath);
      }
    } else {
      const updated = [sher, ...savedShers];
      updateNotebookLocal(updated);
      triggerToast("Original composition saved successfully! ✍️");
    }
  };

  const handleSaveComposition = async (sher: Sher) => {
    if (user) {
      const collectionPath = `users/${user.uid}/saved_shers`;
      try {
        await setDoc(doc(db, collectionPath, sher.id), {
          id: sher.id,
          urdu: sher.urdu,
          roman: sher.roman,
          english: sher.english,
          poet: sher.poet,
          explanation: sher.explanation || "",
          isUserAdded: !!sher.isUserAdded,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        logUserActivity("save_sher", `Saved customized card sher: "${sher.urdu.substring(0, 40)}..."`);
        triggerToast("Designed card composition saved to cloud! 🎨☁️");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, collectionPath);
      }
    } else {
      const updated = [sher, ...savedShers];
      updateNotebookLocal(updated);
      triggerToast("Designed card composition saved locally! 🎨");
    }
  };

  const handleEditInCardCreator = (sher: Sher) => {
    setSelectedSherForCard(sher);
    setActiveTab("card");
    triggerToast("Poetry loaded into Card Designer! 🎨");
  };

  const handleSignIn = () => {
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      triggerToast("Logged out successfully.");
    } catch (error) {
      console.error("Sign out error:", error);
      triggerToast("Sign out failed.");
    }
  };

  const handleBannedSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUserIsBanned(false);
      setCurrentUserBanReason("");
      triggerToast("Disconnected successfully.");
    } catch (error) {
      console.error("Banned sign out error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans pb-24 relative selection:bg-amber-500/30 selection:text-amber-200">
      {/* Absolute Full Screen Ban Overlay */}
      {currentUserIsBanned && (
        <div className="fixed inset-0 z-[1000] bg-stone-950 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="absolute inset-0 bg-radial-gradient from-rose-950/20 via-stone-950/80 to-stone-950 pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-stone-900/40 border border-stone-800/80 p-8 md:p-12 rounded-[2.5rem] max-w-lg w-full flex flex-col items-center gap-6 backdrop-blur-xl shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-rose-400">
                Access Restriction Active
              </h2>
              <p className="text-stone-500 text-xs font-mono tracking-widest uppercase">
                Zauq Security Gatekeeper
              </p>
            </div>

            <div className="bg-stone-950/80 border border-stone-900/60 p-5 rounded-2xl text-left text-xs text-stone-300 font-sans leading-relaxed w-full">
              <span className="text-[10px] text-stone-500 font-mono uppercase block mb-1">Reason for Restriction:</span>
              <p>{currentUserBanReason || "Suspicious or wrong activity visible. Your access has been restricted by the Administrator."}</p>
            </div>

            <p className="text-[10px] text-stone-500 leading-normal">
              If you believe this is an error, please contact the primary administrator at <span className="text-amber-300 font-semibold font-mono">amancib007@gmail.com</span> with your Google user details.
            </p>

            <button
              type="button"
              onClick={handleBannedSignOut}
              className="mt-2 w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold uppercase tracking-widest border border-stone-700 transition-all cursor-pointer hover:border-stone-600"
            >
              Disconnect & Exit
            </button>
          </motion.div>
        </div>
      )}

      {/* Decorative Golden Ambient Background Dusts */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-amber-600/[0.01] rounded-full blur-[120px] pointer-events-none" />

      {/* Persistent global floating audio engine */}
      <AudioControl />

      {/* Sticky Universal Navigation Header Bar & Menu */}
      <header className={`sticky top-0 z-40 w-full bg-stone-950/80 backdrop-blur-md border-b border-stone-900/60 shadow-lg px-4 md:px-8 py-3.5 flex items-center justify-between transition-all ${isFocusMode ? "hidden" : ""}`}>
        {/* Logo and Branding */}
        <div 
          onClick={() => {
            setActiveTab("deewan");
            setSelectedSherForCard(null);
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
          id="zauq-branding-logo"
        >
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {globalLogoUrl && !logoError ? (
              <img 
                src={globalLogoUrl} 
                alt="Brand Logo" 
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain aspect-square rounded-lg border border-amber-500/20 shadow-sm transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] transform hover:scale-105" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <ZauqLogo className="w-full h-full" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base md:text-lg font-bold text-amber-500 tracking-widest leading-none group-hover:text-amber-400 transition-colors uppercase">
                {globalLogoText || "ZAUQ"}
              </span>
              <span className="font-urdu text-base font-bold text-amber-400 leading-none">
                ذوق
              </span>
            </div>
            <span className="text-[8px] font-mono uppercase tracking-widest text-stone-500 hidden sm:inline-block leading-none mt-1">
              {globalLogoSubtitle || "Urdu Literary Lounge"}
            </span>
          </div>
        </div>

        {/* Desktop Global Search Bar */}
        <div className="hidden md:block relative max-w-[280px] lg:max-w-[340px] w-full mx-4" id="zauq-desktop-global-search">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search Ghazals, poets, vocabulary..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-10 pr-10 py-1.5 bg-stone-900/60 border border-stone-800/85 rounded-xl text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1.5 focus:ring-amber-500/50 focus:border-amber-500/40 focus:bg-stone-900 transition-all font-serif"
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Floating Search Results Dropdown Panel */}
          <AnimatePresence>
            {isSearchFocused && globalSearch.trim().length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSearchFocused(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute left-0 mt-2 w-[420px] max-h-[480px] overflow-y-auto rounded-2xl bg-stone-950 border border-stone-900 shadow-2xl p-3.5 z-50 flex flex-col gap-3.5 backdrop-blur-md"
                >
                  {/* Category: Poets */}
                  {searchResults.poets.length > 0 && (
                    <div className="flex flex-col gap-1.5 pb-2.5 border-b border-stone-900/80">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 font-bold px-2">Poets (Shu'ara)</span>
                      {searchResults.poets.map((poet) => (
                        <button
                          key={poet.name}
                          onClick={() => handleSelectSearchPoet(poet.name)}
                          className="flex flex-col items-start text-left px-2 py-1.5 rounded-xl hover:bg-stone-900/60 transition-colors cursor-pointer w-full group/item"
                        >
                          <span className="text-xs font-serif font-bold text-stone-200 group-hover/item:text-amber-400 transition-colors">{poet.name}</span>
                          <span className="text-[10px] text-stone-400 font-serif italic">{poet.title} ({poet.era})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Ghazals */}
                  {searchResults.ghazals.length > 0 && (
                    <div className="flex flex-col gap-1.5 pb-2.5 border-b border-stone-900/80">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 font-bold px-2">Ghazals & Verses</span>
                      {searchResults.ghazals.map((ghazal) => (
                        <button
                          key={ghazal.id}
                          onClick={() => handleSelectSearchGhazal(ghazal)}
                          className="flex flex-col items-start text-left px-2 py-1.5 rounded-xl hover:bg-stone-900/60 transition-colors cursor-pointer w-full group/item"
                        >
                          <span className="text-xs font-serif font-bold text-stone-200 truncate w-full group-hover/item:text-amber-400 transition-colors">{ghazal.title}</span>
                          <span className="text-[10px] text-stone-400 font-serif">By {ghazal.poet} • {ghazal.category}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Vocabulary */}
                  {searchResults.words.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 font-bold px-2">Urdu Vocabulary (Lafz)</span>
                      {searchResults.words.map((word) => (
                        <button
                          key={word.wordRoman}
                          onClick={() => handleSelectSearchWord(word)}
                          className="flex items-center justify-between text-left px-2 py-1.5 rounded-xl hover:bg-stone-900/60 transition-colors cursor-pointer w-full group/item"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-serif font-bold text-stone-200 group-hover/item:text-amber-400 transition-colors">{word.wordRoman} ({word.pronunciation})</span>
                            <span className="text-[10px] text-stone-400 font-serif truncate max-w-[280px]">{word.meanings.join(", ")}</span>
                          </div>
                          <span className="font-urdu text-base text-amber-400 font-bold group-hover/item:text-amber-300 transition-colors">{word.wordUrdu}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.poets.length === 0 && searchResults.ghazals.length === 0 && searchResults.words.length === 0 && (
                    <div className="py-8 text-center text-stone-500 text-xs italic">
                      No matching results found for "{globalSearch}"
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-stone-900/20 p-1 rounded-xl border border-stone-900/40" id="zauq-desktop-nav-menu">
          {[
            { id: "deewan", label: "Deewan-e-Zauq", icon: BookOpen, sub: "Anthology", primary: true },
            { id: "authors", label: "Adab Library", icon: Library, sub: "Library", primary: true },
            { id: "beitbazi", label: "Beit-Bazi Game", icon: Sword, sub: "Poetic Duel", primary: true },
            { id: "ustaad", label: "Ustaad's Desk", icon: Feather, sub: "AI Advisor", primary: true },
            { id: "diary", label: "Mera Deewan", icon: Heart, sub: "My Journal", primary: true }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabID);
                  if (item.id !== "card") setSelectedSherForCard(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-300 relative text-left cursor-pointer group ${
                  isActive
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300 shadow-sm"
                    : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : "text-stone-500 group-hover:text-stone-300"}`} />
                <span className="text-xs font-serif font-semibold">{item.label}</span>
              </button>
            );
          })}

          {/* More Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer group ${
                ["dictionary", "card", "sitar", "videos", "admin", "api"].includes(activeTab)
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  : isMoreDropdownOpen
                    ? "bg-stone-900 border-stone-800 text-stone-200"
                    : "border-transparent text-stone-400 hover:text-stone-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300" />
              <span className="text-xs font-serif font-semibold">Bayt-ul-Hunur (More)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isMoreDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMoreDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMoreDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-stone-950 border border-stone-900 shadow-2xl p-1.5 z-20 flex flex-col gap-0.5"
                  >
                    {[
                      { id: "dictionary", label: "Zauq-e-Lafz", icon: Compass, sub: "Urdu Dictionary" },
                      { id: "card", label: "Card Designer", icon: Palette, sub: "Quote Customizer" },
                      { id: "sitar", label: "Interactive Sitar", icon: Music, sub: "Sound Room" },
                      { id: "videos", label: "Sama'a Lounge", icon: Tv, sub: "Classical Sama" },
                      { id: "admin", label: "Admin Panel", icon: Settings, sub: "Content Manager" },
                      { id: "api", label: "Mobile API Portal", icon: Cpu, sub: "Flutter Gateway" }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id as TabID);
                            setIsMoreDropdownOpen(false);
                            if (item.id !== "card") setSelectedSherForCard(null);
                          }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left cursor-pointer w-full group ${
                            isActive
                              ? "bg-amber-500/10 text-amber-300"
                              : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : "text-stone-500 group-hover:text-stone-300"}`} />
                          <div>
                            <span className="text-xs font-serif font-semibold block leading-none">{item.label}</span>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-stone-600 block mt-0.5 group-hover:text-stone-500">{item.sub}</span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right Side Header Utilities */}
        <div className="flex items-center gap-2">
          {/* Random Sher */}
          <button
            onClick={() => setIsRandomModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 hover:text-amber-300 rounded-lg px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            title="Reveal a random couplet"
          >
            <Shuffle className="w-3 h-3 text-amber-400" />
            <span>Random Sher</span>
          </button>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-stone-900/40 border border-stone-800/60 rounded-xl px-1.5 py-1 shadow-inner">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-3 h-3 rounded-full border transition-all relative group cursor-pointer ${
                  theme === t.id 
                    ? "ring-1.5 ring-amber-500 scale-110 border-transparent" 
                    : "border-stone-700 hover:scale-110"
                }`}
                style={{ backgroundColor: t.color }}
              >
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-1.5 py-0.5 rounded bg-stone-900 text-[8px] font-mono uppercase tracking-wider text-stone-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-stone-800 shadow-md z-30">
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          {/* Cloud Sync Auth Widget */}
          {authLoading ? (
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2 bg-stone-900/60 hover:bg-stone-900 border border-stone-800 rounded-xl pl-1.5 pr-2 py-0.5 transition-all">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Adeeeb"}
                  className="w-4.5 h-4.5 rounded-md border border-amber-500/25"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-4.5 h-4.5 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center font-serif text-[10px] font-bold">
                  {user.displayName?.[0] || "U"}
                </div>
              )}
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] font-serif font-medium text-stone-300 max-w-[50px] truncate">
                  {user.displayName?.split(" ")[0] || "Adeeeb"}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-[6px] font-mono uppercase text-amber-500 hover:text-amber-400 cursor-pointer tracking-wider"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 hover:text-amber-300 rounded-lg px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Cloud Sync</span>
              <span className="inline sm:hidden">Login</span>
            </button>
          )}

          {/* Mobile hamburger trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer ml-1"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-45 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-stone-950 border-l border-stone-900 shadow-2xl p-5 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between border-b border-stone-900 pb-3">
                <div className="flex items-center gap-2 group cursor-pointer flex-shrink-0">
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {globalLogoUrl && !logoError ? (
                      <img 
                        src={globalLogoUrl} 
                        alt="Brand Logo" 
                        onError={() => setLogoError(true)}
                        className="w-full h-full object-contain aspect-square rounded-md border border-amber-500/20 transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] transform hover:scale-105" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ZauqLogo className="w-full h-full" />
                    )}
                  </div>
                  <span className="font-display text-base font-bold text-amber-500 tracking-wider uppercase leading-none">
                    {globalLogoText || "ZAUQ"}
                  </span>
                  <span className="font-urdu text-base font-bold text-amber-400 leading-none">ذوق</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Mobile Search Bar */}
              <div className="relative w-full" id="zauq-mobile-global-search">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Search Ghazals, poets, vocabulary..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1.5 focus:ring-amber-500/50 transition-all font-serif"
                  />
                  {globalSearch && (
                    <button 
                      onClick={() => setGlobalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mobile Results Dropdown */}
                {globalSearch.trim().length > 0 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl bg-stone-900 border border-stone-850 p-2 flex flex-col gap-2 shadow-xl">
                    {/* Category: Poets */}
                    {searchResults.poets.length > 0 && (
                      <div className="flex flex-col gap-1 pb-1.5 border-b border-stone-800/60">
                        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500 font-bold px-1.5">Poets</span>
                        {searchResults.poets.map((poet) => (
                          <button
                            key={poet.name}
                            onClick={() => {
                              handleSelectSearchPoet(poet.name);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex flex-col items-start text-left px-1.5 py-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer w-full"
                          >
                            <span className="text-xs font-serif font-bold text-stone-200">{poet.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Category: Ghazals */}
                    {searchResults.ghazals.length > 0 && (
                      <div className="flex flex-col gap-1 pb-1.5 border-b border-stone-800/60">
                        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500 font-bold px-1.5">Ghazals</span>
                        {searchResults.ghazals.map((ghazal) => (
                          <button
                            key={ghazal.id}
                            onClick={() => {
                              handleSelectSearchGhazal(ghazal);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex flex-col items-start text-left px-1.5 py-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer w-full"
                          >
                            <span className="text-xs font-serif font-bold text-stone-200 truncate w-full">{ghazal.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Category: Vocabulary */}
                    {searchResults.words.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500 font-bold px-1.5">Vocabulary</span>
                        {searchResults.words.map((word) => (
                          <button
                            key={word.wordRoman}
                            onClick={() => {
                              handleSelectSearchWord(word);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center justify-between text-left px-1.5 py-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer w-full"
                          >
                            <span className="text-xs font-serif font-bold text-stone-200">{word.wordRoman}</span>
                            <span className="font-urdu text-xs text-amber-400 font-bold">{word.wordUrdu}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.poets.length === 0 && searchResults.ghazals.length === 0 && searchResults.words.length === 0 && (
                      <div className="py-4 text-center text-stone-500 text-[10px] italic">
                        No results found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile list */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {[
                  { id: "deewan", label: "Deewan-e-Zauq", icon: BookOpen, sub: "Anthology" },
                  { id: "authors", label: "Adab Library", icon: Library, sub: "Authors & Books" },
                  { id: "beitbazi", label: "Beit-Bazi Game", icon: Sword, sub: "AI Poetic Duel" },
                  { id: "ustaad", label: "Ustaad's Desk", icon: Feather, sub: "AI Advisor" },
                  { id: "diary", label: "Mera Deewan", icon: Heart, sub: "My Journal" },
                  { id: "dictionary", label: "Zauq-e-Lafz", icon: Compass, sub: "Urdu Dictionary" },
                  { id: "card", label: "Card Designer", icon: Palette, sub: "Quote Customizer" },
                  { id: "sitar", label: "Interactive Sitar", icon: Music, sub: "Sound Room" },
                  { id: "videos", label: "Sama'a Lounge", icon: Tv, sub: "Classical Sama" },
                  { id: "admin", label: "Admin Panel", icon: Settings, sub: "Content Manager" },
                  { id: "api", label: "Mobile API Portal", icon: Cpu, sub: "Flutter Gateway" }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as TabID);
                        setIsMobileMenuOpen(false);
                        if (item.id !== "card") setSelectedSherForCard(null);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer border ${
                        isActive
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                          : "border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/40"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-amber-500/20 text-amber-300" : "bg-stone-900 text-stone-500"}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-serif font-semibold block leading-tight">{item.label}</span>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-stone-500 mt-0.5 block">{item.sub}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-stone-900 pt-3 flex flex-col gap-2.5">
                {/* Random Sher Mobile */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsRandomModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 rounded-xl py-2.5 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reveal Random Sher</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Master Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 flex flex-col gap-8">
        
        {/* Calligraphic Royal Welcome Hero (Shown only on Home Anthology view for a beautiful royal introduction) */}
        {activeTab === "deewan" && !isFocusMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex flex-col items-center justify-center text-center py-12 md:py-20 border border-stone-800 bg-stone-900/40 rounded-3xl p-6 md:p-12 shadow-xl overflow-hidden"
            style={{
              backgroundImage: globalBannerImageUrl 
                ? `${theme === "parchment" ? "linear-gradient(to bottom, rgba(249, 250, 251, 0.85), rgba(249, 250, 251, 0.98))" : "linear-gradient(to bottom, rgba(12, 10, 9, 0.82), rgba(12, 10, 9, 0.96))"}, url(${globalBannerImageUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Mughal Royal Arch Border Outline */}
            <div className="absolute inset-x-8 inset-y-2 border border-amber-500/10 rounded-2xl pointer-events-none" />

            <div className="flex flex-col items-center max-w-3xl relative z-10">
              {/* Cursive golden title Urdu calligraphic text */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl md:text-6xl font-serif text-amber-600 font-bold select-none tracking-widest font-display uppercase">
                  {globalLogoText || "ZAUQ"}
                </span>
                <span className="text-4xl md:text-6xl font-urdu text-amber-500 font-bold select-none">
                  ذوق
                </span>
              </div>
              
              <h2 className="text-stone-200 text-2xl md:text-3.5xl lg:text-4xl font-serif font-bold mb-4 tracking-tight leading-snug">
                {globalBannerHeading || "Zauq Urdu Literary Lounge"}
              </h2>

              <p className="text-xs md:text-sm text-amber-600 font-mono uppercase tracking-widest flex items-center gap-2 justify-center bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full font-semibold">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Full-Stack Anthology • AI Poetic Duel • Card Customizer</span>
              </p>

              <div className="h-px w-36 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent my-6" />

              <p className="text-sm md:text-base lg:text-lg text-stone-400 leading-relaxed font-serif max-w-2xl italic mb-8">
                {globalBannerTagline || "Welcome to your courtly sanctuary. Dive into our live curated anthology of classical masters, test your literary wit in real-time AI verse battles, craft designed quote cards, or meditate to the gentle background drone of the Tanpura."}
              </p>

              {globalBannerLink && globalBannerLink !== "deewan" && (
                <button
                  onClick={() => {
                    setActiveTab(globalBannerLink as TabID);
                    setSelectedSherForCard(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer flex items-center gap-2 hover:shadow-lg hover:scale-[1.02]"
                >
                  <span>Explore Featured Experience</span>
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Dynamic Connected Success/Alert Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500/40 text-amber-100 rounded-2xl py-3 px-5 shadow-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master View Router Stage */}
        <main className="min-h-[500px] transition-[background-color,border-color,color,box-shadow] duration-500 ease-in-out border border-transparent rounded-3xl" id="zauq-portal-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {activeTab === "deewan" && (
                <DeewanView
                  onSaveSher={handleSaveSher}
                  onEditInCardCreator={handleEditInCardCreator}
                  savedSherIds={savedShers.map((s) => s.id)}
                  savedShers={savedShers}
                  onRemoveSher={handleRemoveSher}
                  poets={poets}
                  ghazals={ghazals}
                  dailyCouplets={dailyCouplets}
                  books={books}
                  onOpenBook={(book) => {
                    setAutoOpenBook(book);
                    setActiveTab("authors");
                  }}
                  initialPoet={focusedSearchPoet}
                  initialGhazal={focusedSearchGhazal}
                  onClearInitialPoet={() => setFocusedSearchPoet(null)}
                  onClearInitialGhazal={() => setFocusedSearchGhazal(null)}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={setIsFocusMode}
                />
              )}

              {activeTab === "beitbazi" && (
                <BeitBaziView
                  onSaveSher={handleSaveSher}
                  onEditInCardCreator={handleEditInCardCreator}
                  savedSherIds={savedShers.map((s) => s.id)}
                />
              )}

              {activeTab === "ustaad" && (
                <UstaadView
                  onSaveSher={handleSaveSher}
                  onEditInCardCreator={handleEditInCardCreator}
                  savedSherIds={savedShers.map((s) => s.id)}
                />
              )}

              {activeTab === "dictionary" && (
                <WordExplorer
                  onSaveSher={handleSaveSher}
                  onEditInCardCreator={handleEditInCardCreator}
                  savedSherIds={savedShers.map((s) => s.id)}
                  initialWord={focusedSearchWord}
                  onClearInitialWord={() => setFocusedSearchWord(null)}
                />
              )}

              {activeTab === "card" && (
                <CardCreator
                  initialSher={selectedSherForCard}
                  onSaveComposition={handleSaveComposition}
                  savedSherIds={savedShers.map((s) => s.id)}
                />
              )}

              {activeTab === "sitar" && (
                <SitarRoom />
              )}

              {activeTab === "diary" && (
                <MyDeewanView
                  savedShers={savedShers}
                  onRemoveSher={handleRemoveSher}
                  onAddCustomSher={handleAddCustomSher}
                  onEditInCardCreator={handleEditInCardCreator}
                  user={user}
                  onSignIn={handleSignIn}
                  dailyCouplets={dailyCouplets}
                  onSaveSher={handleSaveSher}
                />
              )}

              {activeTab === "videos" && (
                <VideosView
                  videos={videos}
                  triggerToast={triggerToast}
                />
              )}

              {activeTab === "authors" && (
                <LibraryView
                  authors={authors}
                  books={books}
                  triggerToast={triggerToast}
                  user={user}
                  autoOpenBook={autoOpenBook}
                  onClearAutoOpenBook={() => setAutoOpenBook(null)}
                />
              )}

              {activeTab === "admin" && (
                <AdminPanel
                  poets={poets}
                  ghazals={ghazals}
                  videos={videos}
                  authors={authors}
                  books={books}
                  dailyCouplets={dailyCouplets}
                  user={user}
                  onSignIn={handleSignIn}
                  triggerToast={triggerToast}
                />
              )}

              {activeTab === "api" && (
                <ApiPortal />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Multi-column Royal Footer */}
        <footer className={`mt-16 py-12 border-t border-stone-900 text-stone-500 select-none ${isFocusMode ? "hidden" : ""}`}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4 text-xs">
            {/* Column 1: App Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 group cursor-pointer">
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {globalLogoUrl && !logoError ? (
                    <img 
                      src={globalLogoUrl} 
                      alt="Brand Logo" 
                      onError={() => setLogoError(true)}
                      className="w-full h-full object-contain aspect-square rounded-md border border-amber-500/20 transition-all duration-1000 ease-in-out group-hover:rotate-[360deg] transform hover:scale-105" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ZauqLogo className="w-full h-full" />
                  )}
                </div>
                <span className="font-display text-sm font-semibold text-amber-500 tracking-widest uppercase">
                  {globalLogoText || "ZAUQ"}
                </span>
                <span className="font-urdu text-base font-semibold text-amber-400">ذوق</span>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-400 font-serif italic">
                An aesthetic Urdu literary lounge. Explore, play, compose, and meditate with the classical arts of South Asia.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="flex flex-col gap-2.5">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-300 font-semibold">Silsila (Anthology)</h4>
              <ul className="flex flex-col gap-1.5 text-[11px] font-serif">
                <li>
                  <button onClick={() => setActiveTab("deewan")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Deewan-e-Zauq
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab("authors")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Adab Library
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab("videos")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Sama'a Lounge
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: AI & Sound */}
            <div className="flex flex-col gap-2.5">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-300 font-semibold">Funoon (Skills & AI)</h4>
              <ul className="flex flex-col gap-1.5 text-[11px] font-serif">
                <li>
                  <button onClick={() => setActiveTab("beitbazi")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Beit-Bazi Game (AI Duel)
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab("ustaad")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Ustaad's Advisor Desk
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab("card")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Card Designer Tool
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveTab("sitar")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Interactive Sitar
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Info & Pages */}
            <div className="flex flex-col gap-2.5 text-left">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-stone-300 font-semibold text-left">Tazkirah (About & Info)</h4>
              <ul className="flex flex-col gap-1.5 text-[11px] font-serif mb-2 text-left">
                <li>
                  <button onClick={() => handleOpenCmsPage("about-us")} className="hover:text-amber-400 transition-colors cursor-pointer text-left font-semibold text-amber-500/90">
                    About Our Lounge
                  </button>
                </li>
                <li>
                  <button onClick={() => handleOpenCmsPage("privacy-policy")} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                    Privacy Policy
                  </button>
                </li>
                {dynamicCmsPages.filter(p => p.id !== "about-us" && p.id !== "privacy-policy").map(page => (
                  <li key={page.id}>
                    <button onClick={() => handleOpenCmsPage(page.id)} className="hover:text-amber-400 transition-colors cursor-pointer text-left">
                      {page.title}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 text-[10px] font-mono text-left">
                <div className="flex items-center gap-1.5 bg-stone-900/40 border border-stone-800/50 rounded-lg p-2 text-stone-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud DB Connected</span>
                </div>
                <p className="leading-relaxed text-[10px] text-stone-600 font-serif italic text-left">
                  Handcrafted for lovers of courtly South Asian literature. Inspired by <a href="https://zauq.site/" target="_blank" rel="noreferrer" className="text-amber-500/80 hover:text-amber-400 hover:underline">zauq.site</a>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-900/60 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 text-[9px] font-mono text-stone-600">
            <p>© 2026 Zauq App. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span>Powered by</span>
              <strong className="text-stone-400">Gemini 3.5 Flash</strong>
            </p>
          </div>
        </footer>

        {/* Startup Daily Couplet Pop-up Modal */}
        <DailySherModal
          ghazals={ghazals}
          onSaveSher={handleSaveSher}
          savedSherIds={savedShers.map((s) => s.id)}
          onRemoveSher={handleRemoveSher}
          onEditInCardCreator={handleEditInCardCreator}
        />

        {/* Random Sher Quick Overlay Modal */}
        <RandomSherModal
          isOpen={isRandomModalOpen}
          onClose={() => setIsRandomModalOpen(false)}
          ghazals={ghazals}
          onSaveSher={handleSaveSher}
          savedSherIds={savedShers.map((s) => s.id)}
          onRemoveSher={handleRemoveSher}
          onEditInCardCreator={handleEditInCardCreator}
        />

        {/* Auth Interface: User Sign In, Registration and Admin Credentials */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          triggerToast={triggerToast}
        />

        {/* Dynamic CMS Page Overlay Modal */}
        <AnimatePresence>
          {activeCmsPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto"
              onClick={() => setActiveCmsPage(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-stone-900/90 border border-stone-850 rounded-3xl p-6 md:p-8 max-w-2xl w-full relative shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              >
                {/* Decorative Background Accents */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                  onClick={() => setActiveCmsPage(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-stone-950/60 border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-all cursor-pointer z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="border-b border-stone-800/80 pb-4 mb-6 text-left">
                  <div className="flex items-center gap-2 text-amber-500 font-mono text-[9px] uppercase tracking-widest mb-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Zauq Publication Route</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-amber-100 tracking-tight leading-snug">
                    {activeCmsPage.title}
                  </h2>
                </div>

                {/* Main Content Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-left text-stone-300 leading-relaxed text-sm font-serif space-y-4">
                  {/* Markdown Renderer */}
                  {activeCmsPage.content ? (
                    <div className="prose prose-invert prose-amber max-w-none text-left">
                      {activeCmsPage.content.split("\n").map((line, idx) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("# ")) {
                          return <h1 key={idx} className="text-xl md:text-2xl font-serif font-bold text-amber-400 mt-6 mb-3 border-b border-stone-850 pb-2">{trimmed.substring(2)}</h1>;
                        } else if (trimmed.startsWith("## ")) {
                          return <h2 key={idx} className="text-lg font-serif font-bold text-amber-300 mt-5 mb-2.5">{trimmed.substring(3)}</h2>;
                        } else if (trimmed.startsWith("### ")) {
                          return <h3 key={idx} className="text-sm font-serif font-semibold text-stone-200 mt-4 mb-2">{trimmed.substring(4)}</h3>;
                        } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                          return <li key={idx} className="list-disc list-inside text-stone-300 pl-2 ml-2 my-1 leading-relaxed">{trimmed.substring(2)}</li>;
                        } else if (trimmed.startsWith("> ")) {
                          return <blockquote key={idx} className="border-l-4 border-amber-500/60 pl-4 py-1 italic my-4 text-stone-400 bg-stone-950/40 p-2 rounded-r-xl">{trimmed.substring(2)}</blockquote>;
                        } else {
                          return <p key={idx} className="mb-3 text-stone-300 leading-relaxed min-h-[1em]">{line}</p>;
                        }
                      })}
                    </div>
                  ) : (
                    <p className="text-stone-500 italic">This page has no content published.</p>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-stone-800/80 pt-4 mt-6 flex justify-between items-center text-[10px] font-mono text-stone-500">
                  <span>Slug: /{activeCmsPage.id}</span>
                  <span>Zauq CMS Core</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
