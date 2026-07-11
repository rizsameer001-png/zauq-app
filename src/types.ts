export interface Sher {
  id: string;
  urdu: string;
  roman: string;
  english: string;
  poet: string;
  explanation?: string;
  tags?: string[];
  isUserAdded?: boolean;
  category?: string;
}

export interface Ghazal {
  id: string;
  title: string;
  poet: string;
  shers: Sher[];
  category?: string;
  backgroundStory?: string;
  genre?: string;
}

export interface BeitBaziTurn {
  sender: "user" | "bot";
  coupletUrdu: string;
  coupletRoman: string;
  coupletEnglish: string;
  detectedLetterUrdu?: string;
  detectedLetterEnglish?: string;
  poet: string;
  explanation?: string;
  dialogue?: string;
  nextLetter?: string;
  timestamp: string;
}

export interface PoetryAssistSuggestion {
  urdu: string;
  roman: string;
  english: string;
  poeticContext: string;
}

export interface PoetryAssistResponse {
  title: string;
  analysis: string;
  suggestions: PoetryAssistSuggestion[];
  ustadsWords: string;
}

export interface WordLookupResult {
  wordUrdu: string;
  wordRoman: string;
  pronunciation: string;
  meanings: string[];
  etymology: string;
  zauqPerspective: string;
  poeticUsage: {
    sherUrdu: string;
    sherRoman: string;
    sherEnglish: string;
    poet: string;
  };
}

export interface CustomCardConfig {
  backgroundType: "color" | "gradient" | "pattern" | "image";
  backgroundValue: string;
  textColor: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  fontFamily: "nastaliq" | "naskh" | "diwani" | "serif" | "sans" | "mono";
  borderStyle: "none" | "simple" | "elegant" | "classic-floral";
  borderColor: string;
  opacity: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  instrument: string;
  url: string; // synthesis or external open-source URL
  isPlaying?: boolean;
}

export interface ZauqVideo {
  id: string;
  title: string;
  artist: string;
  url: string;
  description?: string;
  category: string;
  createdAt: any; // Can be Timestamp or String depending on sync
  isLocal?: boolean;
}

export interface Author {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  isLocalImage?: boolean;
  birthPlace?: string;
  activeYears?: string;
  createdAt?: any;
}

export interface BookFile {
  id: string;
  name: string;
  type: "pdf" | "epub";
  url: string;
  isLocal: boolean;
  thumbnailUrl?: string;
}

export interface Book {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isLocalCover?: boolean;
  audioUrl?: string;
  isLocalAudio?: boolean;
  videoUrl?: string;
  videoType?: "youtube" | "direct" | "upload";
  createdAt?: any;
  files?: BookFile[];
  averageRating?: number;
  reviewsCount?: number;
  genre?: string;
  literaryPeriod?: string;
  publisher?: string;
}

export interface BookProgress {
  bookId: string;
  userId: string;
  readProgress: number; // percentage 0 to 100
  listenProgress: number; // percentage 0 to 100
  currentPage?: number;
  totalPages?: number;
  lastUpdated: any;
}

export interface BookReview {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  text: string;
  rating?: number;
  createdAt: any;
  updatedAt: any;
}


