import { Ghazal, Sher, Author, Book } from "./types";

export const CLASSIC_POETS = [
  { name: "Mohammad Ibrahim Zauq", era: "1789–1854", title: "Khaqani-e-Hind (Poet Laureate of Mughal Court)", bio: "He was the royal poet and mentor (Ustaad) of the last Mughal Emperor Bahadur Shah Zafar. His poetry is characterized by rich idiom, linguistic precision, and profound philosophical depth." },
  { name: "Mirza Ghalib", era: "1797–1869", title: "Dabir-ul-Mulk", bio: "The ultimate philosopher poet of the Urdu language, famous for his intricate thoughts, intellectual complexity, and timeless questioning of existence." },
  { name: "Allama Iqbal", era: "1877–1938", title: "Shair-e-Mashriq (Poet of the East)", bio: "A visionary philosopher and political thinker who revived the Urdu language through powerful, inspiring concepts of Selfhood (Khudi) and action." },
  { name: "Faiz Ahmed Faiz", era: "1911–1984", title: "Revolutionary Poet", bio: "A modern master who blended classical romantic ghazal imagery with socialist and revolutionary political struggle." },
  { name: "Mir Taqi Mir", era: "1723–1810", title: "Khuda-e-Sukhan (God of Poetry)", bio: "The pioneer of classical Urdu ghazal, celebrated for his soulful simplicity, gentle pathos, and deep romantic melancholy." }
];

export const DICTIONARY_WORDS = [
  {
    wordUrdu: "ذوق",
    wordRoman: "Zauq",
    pronunciation: "Zawq / Zowq",
    meanings: ["Aesthetic taste", "Refined appreciation of beauty", "Delight", "Elegance", "Passion"],
    etymology: "Arabic (ذَوْق) - originally meaning to taste food, evolved into the appreciation of art, poetry, and divine beauty.",
    zauqPerspective: "Zauq is the very soul of this application. It represents that inner eye which recognizes and melts in the presence of true elegance, whether in a single spoken line (Misra) or a simple melody.",
    poeticUsage: {
      sherUrdu: "لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
      sherRoman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
      sherEnglish: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
      poet: "Mohammad Ibrahim Zauq"
    }
  },
  {
    wordUrdu: "لطافت",
    wordRoman: "Latafat",
    pronunciation: "La-taa-fat",
    meanings: ["Gracefulness", "Delicacy", "Exquisite purity", "Subtlety"],
    etymology: "Arabic (لطافة) - referring to thinness, lightness, or ethereal elegance.",
    zauqPerspective: "Latafat is the softness in voice and design. It is the opposite of harshness, bringing a gentle, almost weightless harmony to poetry and art.",
    poeticUsage: {
      sherUrdu: "کہوں کیا اس کے لب کی کیا لطافت ہے\nکہ جیسے اک گلاب کی پنکھڑی ہے",
      sherRoman: "Kahūñ kyā us ke lab kī kyā latāfat hai\nKi jaise ik gulāb kī pañkhuṛī hai",
      sherEnglish: "How do I describe the exquisite grace of those lips?\nIt is as if a delicate petal of a rose has blossomed.",
      poet: "Mir Taqi Mir"
    }
  },
  {
    wordUrdu: "سخن",
    wordRoman: "Sukhan",
    pronunciation: "Su-khan",
    meanings: ["Speech", "Poetic discourse", "The spoken word", "Eloquence"],
    etymology: "Persian (سخن) - meaning talk, conversation, or verse.",
    zauqPerspective: "In the court of literature, Sukhan is the currency. It represents not just raw speech, but highly structured, beautifully polished articulation.",
    poeticUsage: {
      sherUrdu: "ہیں اور بھی دنیا میں سخن ور بہت اچھے\nکہتے ہیں کہ غالب کا ہے اندازِ بیاں اور",
      sherRoman: "Haiñ aur bhī duniyā meñ sukhan-var bahut achche\nKahate haiñ ki Ghalib kā hai andāz-e-bayāñ aur",
      sherEnglish: "There are indeed many excellent masters of poetry in this world;\nBut they say Ghalib's style of expression is in a realm of its own.",
      poet: "Mirza Ghalib"
    }
  },
  {
    wordUrdu: "کیفیت",
    wordRoman: "Kaifiyat",
    pronunciation: "Kai-fee-yat",
    meanings: ["State of mind", "Intoxication", "Spiritual atmosphere", "Subtle vibe"],
    etymology: "Arabic (كَيْفِيَّة) - from 'Kaif' (how/joy), meaning quality, condition, or a state of ecstatic feeling.",
    zauqPerspective: "Kaifiyat is the unexplainable mood created by a beautiful ghazal. It is that warm, comforting sensation that lingers long after the words stop.",
    poeticUsage: {
      sherUrdu: "اثر اس کو ذرا نہیں ہوتا\nرنج راحت فزا نہیں ہوتا",
      sherRoman: "Asar us ko zarā nahīñ hotā\nRañj rāhat-fizā nahīñ hotā",
      sherEnglish: "It does not have any effect on her at all;\nMy grief never transforms into a source of comfort.",
      poet: "Momin Khan Momin"
    }
  },
  {
    wordUrdu: "جستجو",
    wordRoman: "Justaju",
    pronunciation: "Jus-ta-joo",
    meanings: ["Incessant quest", "Search", "Longing for discovery", "Desire"],
    etymology: "Persian (جستجو) - derived from 'justan' (to search).",
    zauqPerspective: "Justaju is the romantic and philosophical fuel of life. It is the endless seeking of the beloved, of truth, or of the perfect poetic meter.",
    poeticUsage: {
      sherUrdu: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں",
      sherRoman: "Sitāroñ se āge jahāñ aur bhī haiñ\nAbhī ishq ke imtihān aur bhī haiñ",
      sherEnglish: "Beyond these stars lie worlds yet undiscovered;\nThere are still many trials of love left to endure.",
      poet: "Allama Iqbal"
    }
  }
];

export const CURATED_GHAZALS: Ghazal[] = [
  {
    id: "zauq-1",
    title: "Layi Hayat Aye Qaza (لائی حیات آئے)",
    poet: "Mohammad Ibrahim Zauq",
    category: "Philosophical / Sufi",
    backgroundStory: "This is Ibrahim Zauq's most celebrated philosophical masterpiece, meditating on the ephemeral nature of life, destiny, and the beautiful resignation to the flow of time. It was famously recited in the royal court.",
    shers: [
      {
        id: "zauq-1-1",
        urdu: "لائی حیات آئے قضا لے چلی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
        roman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
        english: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
        poet: "Mohammad Ibrahim Zauq",
        explanation: "Reflects the absolute surrender to cosmic destiny, suggesting human agency is beautiful but ultimately transient in the grand design of existence."
      },
      {
        id: "zauq-1-2",
        urdu: "بہتر تو ہے یہی کہ نہ دنیا سے دل لگے\nپر کیا کریں جو کام نہ بے دل لگی چلے",
        roman: "Behtar to hai yahī ki na duniyā se dil lage\nPar kyā kareñ jo kām na be dil-lagī chale",
        english: "It is indeed best not to attach one's heart to this worldly theater;\nBut what is one to do, when life cannot go on without some passionate attachment?",
        poet: "Mohammad Ibrahim Zauq",
        explanation: "An exquisite paradox of the human condition. While detached wisdom is ideal, love and emotional attachment are essential to experience existence."
      },
      {
        id: "zauq-1-3",
        urdu: "دنیا نے کس کا راہِ فنا میں دیا ہے ساتھ\nتم بھی چلے چلو یونہی جب تک چلی چلے",
        roman: "Duniyā ne kis kā rāh-e-fanā meñ diyā hai sāth\nTum bhī chale chalo yūñhī jab tak chalī chale",
        english: "Who has this world ever accompanied on the path of annihilation?\nYou too should keep walking, as long as the journey of life carries you forward.",
        poet: "Mohammad Ibrahim Zauq",
        explanation: "Acceptance of impermanence. Since everyone must walk the path of departure alone, one should embrace the flow of life gracefully without holding on."
      }
    ]
  },
  {
    id: "ghalib-1",
    title: "Dil-e-Nadaan Tujhe Hua Kya Hai (دلِ ناداں تجھے ہوا کیا ہے)",
    poet: "Mirza Ghalib",
    category: "Romantic / Intellectual",
    backgroundStory: "Written in Delhi during Ghalib's mid-career, this Ghazal represents a dialogical exploration of romantic curiosity, intense longing, and self-irony.",
    shers: [
      {
        id: "ghalib-1-1",
        urdu: "دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے",
        roman: "Dil-e-nādāñ tujhe huā kyā hai\nĀkhir is dard kī davā kyā hai",
        english: "Oh foolish heart, what has befallen you?\nAfter all, what is the cure for this sweet ache of love?",
        poet: "Mirza Ghalib",
        explanation: "Ghalib converses with his own heart with playful helplessness, questioning the nature of romantic obsession and its lack of any rational cure."
      },
      {
        id: "ghalib-1-2",
        urdu: "ہم ہیں مشتاق اور وہ بیزار\nیا الٰہی یہ ماجرا کیا ہے",
        roman: "Ham haiñ mushtāq aur voh bezār\nYā ilāhī yeh mājarā kyā hai",
        english: "I am full of eager yearning, while she is utterly indifferent;\nO Lord, what kind of strange dynamic is this?",
        poet: "Mirza Ghalib",
        explanation: "Highlights the classical trope of the unrequited lover vs. the indifferent beloved, asking the divine why yearning is distributed so unequally."
      },
      {
        id: "ghalib-1-3",
        urdu: "میں بھی منہ میں زبان رکھتا ہوں\nکاش پوچھو کہ مدعا کیا ہے",
        roman: "Maiñ bhī muñh meñ zabān rakhtā hūñ\nKāsh pūchho ki mudda'ā kyā hai",
        english: "I too possess a tongue in my mouth and can express myself;\nIf only you would ask me what my heart truly desires.",
        poet: "Mirza Ghalib",
        explanation: "A proud yet tender plea. The lover yearns for the beloved to take the initiative and ask about his feelings rather than keeping silent."
      }
    ]
  },
  {
    id: "iqbal-1",
    title: "Khudi Ko Kar Buland Itna (خودی کو کر بلند اتنا)",
    poet: "Allama Iqbal",
    category: "Inspirational / Philosophical",
    backgroundStory: "A revolutionary couplet set of Allama Iqbal, inspiring youth and seekers toward absolute self-realization, elevation of character, and spiritual agency.",
    shers: [
      {
        id: "iqbal-1-1",
        urdu: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے",
        roman: "Khudī ko kar buland itnā ki har taqdīr se pahle\nKhudā bande se khud pūchhe batā terī razā kyā hai",
        english: "Elevate your Selfhood (Khudi) to such sublime heights that before writing any destiny,\nGod Himself shall ask His servant: Tell Me, what is your desire?",
        poet: "Allama Iqbal",
        explanation: "An empowering message. It suggests that strength of character and self-mastery allow a human being to become a co-creator of their own destiny."
      },
      {
        id: "iqbal-1-2",
        urdu: "ہزاروں سال نرگس اپنی بے نوری پہ روتی ہے\nبڑی مشکل سے ہوتا ہے چمن میں دیدہ ور پیدا",
        roman: "Hazāroñ sāl nargis apnī be-nūrī pe rotī hai\nBaṛī mushkil se hotā hai chaman meñ dīda-var paidā",
        english: "For thousands of years, the narcissus weeps over its lack of luster;\nWith great difficulty does a visionary, deep-seeing soul blossom in the garden.",
        poet: "Allama Iqbal",
        explanation: "Speaks to the extreme rarity of truly enlightened, wise leadership and visionaries in society, who arise only after centuries of longing."
      }
    ]
  },
  {
    id: "sher-curated-1",
    title: "Guldasta-e-Sher • Standalone Couplets",
    poet: "Mirza Ghalib",
    category: "Sher",
    backgroundStory: "A selection of Mirza Ghalib's most celebrated standalone philosophical couplets.",
    shers: [
      {
        id: "sher-curated-1-1",
        urdu: "عشق پر زور نہیں ہے یہ وہ آتش غالب\nکہ لگائے نہ لگے اور بجھائے نہ بنے",
        roman: "Ishq par zor nahīñ hai yeh voh ātish Ghalib\nKi lagāye na lage aur bujhāye na bane",
        english: "Love is not within our control, it is such a fire, O Ghalib\nWhich cannot be lit at will, nor extinguished when once aflame.",
        poet: "Mirza Ghalib",
        explanation: "Discusses the involuntary, spiritual, and uncontrollable force of true romantic obsession."
      }
    ]
  },
  {
    id: "mersiya-curated-1",
    title: "Mersiya-e-Anis • Elegiac Poetry",
    poet: "Mir Babar Ali Anis",
    category: "Mersiya",
    backgroundStory: "The pinnacle of elegiac eloquence. Mir Anis's unparalleled epic verses illustrating honor, sacrifice, and supreme human principles.",
    shers: [
      {
        id: "mersiya-curated-1-1",
        urdu: "رنگِ چہرہ جو اڑا تھا وہ بحال اب تو ہوا\nشکرِ حق دل کو مرے چین و ملال اب تو ہوا",
        roman: "Rang-e-chehra jo uda tha wo bahaal ab to hua\nShukr-e-haq dil ko mere chain o malaal ab to hua",
        english: "The color of the face that had faded is now restored;\nThank God, my heart has found peace as well as melancholy now.",
        poet: "Mir Babar Ali Anis",
        explanation: "Expresses a sublime transition from grief to quiet, graceful composure, capturing the high-contrast drama of Urdu's grandest elegiac tradition."
      }
    ]
  }
];

export const STARTER_SHERS: Sher[] = [
  {
    id: "s-1",
    urdu: "عشق پر زور نہیں ہے یہ وہ آتش غالب\nکہ لگائے نہ لگے اور بجھائے نہ بنے",
    roman: "Ishq par zor nahīñ hai yeh voh ātish Ghalib\nKi lagāye na lage aur bujhāye na bane",
    english: "Love is not within our control, it is such a fire, O Ghalib\nWhich cannot be lit at will, nor extinguished when once aflame.",
    poet: "Mirza Ghalib",
    tags: ["Love", "Philosophy"]
  },
  {
    id: "s-2",
    urdu: "دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے",
    roman: "Dil-e-nādāñ tujhe huā kyā hai\nĀkhir is dard kī davā kyā hai",
    english: "Oh foolish heart, what has befallen you?\nAfter all, what is the cure for this sweet ache of love?",
    poet: "Mirza Ghalib",
    tags: ["Heartache", "Love"]
  },
  {
    id: "s-3",
    urdu: "لائی حیات آئے قضا لے چالی چلے\nاپنی خوشی نہ آئے نہ اپنی خوشی چلے",
    roman: "Lāyī hayāt āye qazā le chalī chale\nApnī khushī na āye na apnī khushī chale",
    english: "Life brought us here; death took us away.\nNeither did we come of our own accord, nor do we leave by our own choice.",
    poet: "Mohammad Ibrahim Zauq",
    tags: ["Existence", "Philosophy"]
  },
  {
    id: "s-4",
    urdu: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں",
    roman: "Sitāroñ se āge jahāñ aur bhī haiñ\nAbhī ishq ke imtihān aur bhī haiñ",
    english: "Beyond these stars lie worlds yet undiscovered;\nThere are still many trials of love left to endure.",
    poet: "Allama Iqbal",
    tags: ["Inspirational", "Universe"]
  },
  {
    id: "s-5",
    urdu: "ہم نے مانا کہ تغافل نہ کرو گے لیکن\nخاک ہو جائیں گے ہم تم کو خبر ہونے تک",
    roman: "Hum ne mānā ke taghāful na karo ge lekin\nKhāk ho jāyeñ ge hum tum ko khabar hone tak",
    english: "I accept that you will not intentionally neglect me, but\nI will have turned to ashes by the time my plight is known to you.",
    poet: "Mirza Ghalib",
    tags: ["Longing", "Pathos"]
  }
];

export const STARTER_VIDEOS = [
  {
    id: "vid_1",
    title: "Yeh Jo Halka Halka Suroor Hai (Original Qawwali)",
    artist: "Ustad Nusrat Fateh Ali Khan",
    url: "https://www.youtube.com/watch?v=Ssk8S2X_k7E",
    description: "The legendary, transcendent composition of love and longing. A masterclass in rhythmic improvisation and classical Qawwali heritage.",
    category: "Qawwali",
    createdAt: null
  },
  {
    id: "vid_2",
    title: "Yaar Ko Humne Ja Ba Ja Dekha (Sufiana Kalam)",
    artist: "Abida Parveen",
    url: "https://www.youtube.com/watch?v=9oNCOv6eAoo",
    description: "An evocative rendering of Hazrat Shah Niyaz's mystical poetry, performed with supreme spiritual intensity.",
    category: "Sufiana Kalam",
    createdAt: null
  },
  {
    id: "vid_3",
    title: "Hum Dekhenge (Live in Lahore 1986)",
    artist: "Iqbal Bano",
    url: "https://www.youtube.com/watch?v=d_M_8Z_gXGk",
    description: "The historic live recitation of Faiz Ahmed Faiz's revolutionary anthem that shook the stadium in Lahore.",
    category: "Ghazal Recitation",
    createdAt: null
  },
  {
    id: "vid_4",
    title: "Raga Yaman Kalyan - Sitar Performance",
    artist: "Ustad Shahid Parvez Khan",
    url: "https://www.youtube.com/watch?v=B96Ico_u0X0",
    description: "An elegant evening Raga Yaman on Sitar, illustrating microtonal ornamentations and intricate rhythmic play.",
    category: "Sitar Recitation",
    createdAt: null
  }
];

export const STARTER_AUTHORS: Author[] = [
  {
    id: "auth_ghalib",
    name: "Mirza Ghalib",
    bio: "The ultimate philosopher-poet of the Urdu language, famous for his intricate thoughts, intellectual complexity, and timeless questioning of existence.",
    birthPlace: "Agra, India",
    activeYears: "1817–1869",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop",
    isLocalImage: false
  },
  {
    id: "auth_iqbal",
    name: "Sir Allama Muhammad Iqbal",
    bio: "A visionary philosopher, scholar, and national poet, celebrated for his works reviving selfhood (Khudi) and sparking literary and political renaissance.",
    birthPlace: "Sialkot, Pakistan",
    activeYears: "1900–1938",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop",
    isLocalImage: false
  },
  {
    id: "auth_faiz",
    name: "Faiz Ahmed Faiz",
    bio: "A towering figure of 20th-century literature, combining classical romanticism with powerful humanitarian advocacy and socialist activism.",
    birthPlace: "Sialkot, Pakistan",
    activeYears: "1930–1984",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop",
    isLocalImage: false
  }
];

export const STARTER_BOOKS: Book[] = [
  {
    id: "book_divan_ghalib",
    authorId: "auth_ghalib",
    title: "Diwan-e-Ghalib",
    description: "The definitive Urdu anthology of Mirza Ghalib. Features philosophical ghazals dealing with life, grief, and the illusion of reality.",
    coverImageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop",
    isLocalCover: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    isLocalAudio: false,
    videoUrl: "https://www.youtube.com/watch?v=S8g359G8_gY",
    videoType: "youtube"
  },
  {
    id: "book_bal_jibril",
    authorId: "auth_iqbal",
    title: "Bal-e-Jibril (Wings of Gabriel)",
    description: "Iqbal's magnificent Urdu anthology, expanding on his philosophy of active faith, self-discovery, and cosmic ascension.",
    coverImageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop",
    isLocalCover: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    isLocalAudio: false,
    videoUrl: "https://www.youtube.com/watch?v=F0fMh2fE44M",
    videoType: "youtube"
  },
  {
    id: "book_nuskha_hai",
    authorId: "auth_faiz",
    title: "Nuskha-ha-e-Hameed (Collected Works)",
    description: "The comprehensive compendium of Faiz Ahmed Faiz's poetical works including 'Naqsh-e-Faryadi', 'Dast-e-Saba', and 'Zindan-Nama'.",
    coverImageUrl: "https://images.unsplash.com/photo-1474932430478-367db2683bfc?w=400&auto=format&fit=crop",
    isLocalCover: false,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    isLocalAudio: false,
    videoUrl: "https://www.youtube.com/watch?v=d_M_8Z_gXGk",
    videoType: "youtube"
  }
];


