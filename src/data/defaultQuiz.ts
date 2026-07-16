export interface QuizOption {
  text: string;
  description: string;
  tag: string;
}

export interface QuizQuestion {
  id: string;
  column: "quiz_mood" | "quiz_format" | "quiz_hook" | "quiz_pace";
  question: string;
  subtitle: string;
  options: QuizOption[];
}

export const defaultQuiz: QuizQuestion[] = [
  {
    id: "mood",
    column: "quiz_mood",
    question: "What mood are you in the mood for?",
    subtitle: "Pick the vibe that speaks to you right now.",
    options: [
      { text: "Inspiring & Uplifting", description: "Feel-good stories that leave you energized", tag: "inspiring" },
      { text: "Dark & Gritty", description: "Raw, intense narratives with high stakes", tag: "dark" },
      { text: "Cerebral & Thoughtful", description: "Deep ideas and philosophical explorations", tag: "cerebral" },
      { text: "Light & Whimsical", description: "Playful, charming, easy-going fun", tag: "light" },
      { text: "Suspenseful & Thrilling", description: "Edge-of-your-seat tension and twists", tag: "suspenseful" },
      { text: "Warm & Heartfelt", description: "Emotional connections and human moments", tag: "heartfelt" },
      { text: "Humorous & Witty", description: "Smart laughs and clever observations", tag: "humorous" },
      { text: "Romantic & Tender", description: "Love stories and heartfelt connections", tag: "romantic" },
      { text: "Mysterious & Enigmatic", description: "Puzzles, secrets, and the unknown", tag: "mysterious" },
      { text: "Empowering & Bold", description: "Stories of courage and self-discovery", tag: "empowering" },
      { text: "Nostalgic & Reflective", description: "Journeys through memory and meaning", tag: "nostalgic" },
      { text: "Epic & Grandiose", description: "Sweeping tales of massive scale", tag: "epic" },
    ],
  },
  {
    id: "format",
    column: "quiz_format",
    question: "How do you like to consume your content?",
    subtitle: "Choose the format that fits your lifestyle.",
    options: [
      { text: "Quick Read", description: "Short, punchy content you can finish in one sitting", tag: "quick-read" },
      { text: "Deep Dive", description: "Long-form immersive experiences", tag: "deep-dive" },
      { text: "Interactive Course", description: "Learn by doing with structured lessons", tag: "interactive" },
      { text: "Listen on the Go", description: "Audiobooks and podcasts for commutes", tag: "audio" },
      { text: "Visual Guide", description: "Video-first walkthroughs and tutorials", tag: "visual" },
      { text: "Practical Handbook", description: "Reference material you can apply immediately", tag: "practical" },
      { text: "Serialized Story", description: "Episodic content released in parts", tag: "serialized" },
      { text: "Coffee-Table Style", description: "Beautiful, browsable visual content", tag: "coffee-table" },
      { text: "Workbook & Exercises", description: "Active participation with prompts", tag: "workbook" },
      { text: "Hybrid Combo", description: "Mix of text, audio, and video in one", tag: "hybrid" },
    ],
  },
  {
    id: "hook",
    column: "quiz_hook",
    question: "What world do you want to escape into?",
    subtitle: "Pick the setting that pulls you in.",
    options: [
      { text: "Fantasy World", description: "Magic, mythical creatures, and epic quests", tag: "fantasy" },
      { text: "Real-World Business", description: "Entrepreneurship, strategy, and professional growth", tag: "business" },
      { text: "Sci-Fi Frontier", description: "Future tech, space exploration, and AI", tag: "sci-fi" },
      { text: "Historical Epic", description: "Period dramas and tales from the past", tag: "historical" },
      { text: "True Crime & Mystery", description: "Real-life investigations and cold cases", tag: "crime" },
      { text: "Self-Discovery Journey", description: "Personal development and mindfulness", tag: "self-discovery" },
      { text: "Survival & Adventure", description: "Thrills, danger, and overcoming odds", tag: "adventure" },
      { text: "Academic & Scientific", description: "Research, discoveries, and intellectual pursuits", tag: "academic" },
      { text: "Creative Arts", description: "Art, music, writing, and creative expression", tag: "creative" },
      { text: "Culinary & Lifestyle", description: "Food, travel, and everyday wellness", tag: "lifestyle" },
      { text: "Supernatural & Paranormal", description: "Ghosts, psychics, and the unexplained", tag: "supernatural" },
      { text: "Dystopian & Post-Apocalyptic", description: "Fractured societies and rebuilding", tag: "dystopian" },
    ],
  },
  {
    id: "pace",
    column: "quiz_pace",
    question: "How much time can you commit?",
    subtitle: "Choose your ideal investment level.",
    options: [
      { text: "Bite-Sized (15 min)", description: "Quick bursts perfect for a short break", tag: "bite-sized" },
      { text: "Lunch Break (30-60 min)", description: "Satisfying content for your lunch hour", tag: "lunch-break" },
      { text: "Evening Wind Down", description: "Unwind after a long day", tag: "evening" },
      { text: "Weekend Binge", description: "Dive deep when you have time to spare", tag: "weekend" },
      { text: "Ongoing Series", description: "Come back again and again over time", tag: "series" },
      { text: "Multi-Week Course", description: "Structured learning over several sessions", tag: "course" },
      { text: "Daily Habit (5-10 min)", description: "Tiny commitments that build consistency", tag: "daily" },
      { text: "One-Sitting Marathon", description: "Can't put it down until it's done", tag: "marathon" },
      { text: "Commute Companion", description: "Perfect for your daily travel time", tag: "commute" },
      { text: "Reference Library", description: "Something to consult whenever needed", tag: "reference" },
    ],
  },
];
