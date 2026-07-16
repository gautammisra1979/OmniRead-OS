// Chat Session History

const CHAT_KEY = "omnimedia_librarian_history";
const MAX_MESSAGES = 50;

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  tokens: number;
  timestamp: string;
}

function generateMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch { /* ignore */ }
  return [];
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }
}

export function clearChatHistory(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CHAT_KEY);
  }
}

export function addChatMessage(msg: Omit<ChatMessage, "id" | "timestamp">): void {
  const history = getChatHistory();
  const full: ChatMessage = {
    ...msg,
    id: generateMsgId(),
    timestamp: new Date().toISOString(),
  };
  history.push(full);
  // Cap at 50, remove oldest
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
  saveChatHistory(history);
}