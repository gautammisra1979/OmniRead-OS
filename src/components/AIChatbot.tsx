import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getCatalogItems } from "~/data/catalog";
import { calculateTokens, deductCredits, addCredits, getWallet } from "~/data/wallet";
import { searchKnowledge } from "~/data/knowledgeBase";
import {
  getChatHistory,
  saveChatHistory,
  addChatMessage,
  clearChatHistory,
  type ChatMessage,
} from "~/data/chatHistory";

const MAX_RESPONSE_TOKENS = 200;

interface AIChatbotProps {
  activeBookId?: string;
  activeBookTitle?: string;
}

function generateBotResponse(userText: string, bookId?: string, bookTitle?: string): string {
  const lower = userText.toLowerCase();
  const isRecommendation =
    lower.includes("recommend") ||
    lower.includes("suggest") ||
    lower.includes("what should i read") ||
    lower.includes("what to read");

  // Vertical thinking: if book context is active, search knowledge base
  if (bookId) {
    const kbResults = searchKnowledge(userText, bookId);
    if (kbResults.length > 0) {
      const entries = kbResults
        .slice(0, 3)
        .map((r) => `📖 [${r.knowledge_type}] ${r.marker_reference}: ${r.content_body.slice(0, 200)}`)
        .join("\n\n");
      return `Here's what I found about "${bookTitle}":\n\n${entries}`;
    }
    return `I don't have specific knowledge about "${bookTitle}" matching your query. Try asking about themes, notes, or recommendations!`;
  }

  // Horizontal thinking: catalog-wide recommendations
  if (isRecommendation) {
    const catalog = getCatalogItems();
    if (catalog.length === 0) {
      return "Our catalog is currently empty. Check back soon for new additions!";
    }
    const picks = catalog.slice(0, 3);
    const productList = picks
      .map((p) => `• **${p.title}** by ${p.author} — $${p.price.toFixed(2)} (${p.format})`)
      .join("\n");
    return `Based on our catalog, I recommend checking out:\n\n${productList}\n\nYou can also take the Book Concierge Quiz at /quiz for personalized recommendations!`;
  }

  // Default: guide the user
  return "Browse our collection or try the Book Concierge Quiz to find your perfect read! You can also join the 30-Day Reading Challenge at /challenge to track your progress.";
}

export function AIChatbot({ activeBookId, activeBookTitle }: AIChatbotProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [saveHistory, setSaveHistory] = useState(true);
  const [privacyDismissed, setPrivacyDismissed] = useState(false);
  const [credits, setCredits] = useState(getWallet().credits);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    if (saveHistory) {
      setMessages(getChatHistory());
    }
  }, [saveHistory]);

  // Listen for wallet updates
  useEffect(() => {
    const handler = () => setCredits(getWallet().credits);
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    // Deduct tokens
    const tokensNeeded = calculateTokens(text);
    if (!deductCredits(tokensNeeded)) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "bot",
        text: t("chat.insufficientCredits"),
        tokens: 0,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, msg]);
      if (saveHistory) addChatMessage(msg);
      setInput("");
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      text,
      tokens: tokensNeeded,
      timestamp: new Date().toISOString(),
    };
    const updatedMsgs = [...messages, userMsg];

    // Generate bot response
    let botText = generateBotResponse(text, activeBookId, activeBookTitle);
    const botTokens = calculateTokens(botText);

    // Enforce max 200 tokens
    if (botTokens > MAX_RESPONSE_TOKENS) {
      const maxChars = MAX_RESPONSE_TOKENS * 4;
      botText = botText.slice(0, maxChars) + `\n\n— ${t("chat.tokensUsed").replace("{count}", String(MAX_RESPONSE_TOKENS))}`;
    } else {
      botText += `\n\n— ${t("chat.tokensUsed").replace("{count}", String(botTokens))}`;
    }

    const botMsg: ChatMessage = {
      id: `msg-bot-${Date.now()}`,
      role: "bot",
      text: botText,
      tokens: botTokens,
      timestamp: new Date().toISOString(),
    };

    setMessages([...updatedMsgs, botMsg]);
    setCredits(getWallet().credits);
    setInput("");

    if (saveHistory) {
      addChatMessage(userMsg);
      addChatMessage(botMsg);
    }
  }, [input, messages, saveHistory, t, activeBookId, activeBookTitle]);

  const handleClear = useCallback(() => {
    clearChatHistory();
    setMessages([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
        aria-label={open ? "Close chatbot" : "Open OmniRead Librarian chatbot"}
      >
        {open ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span role="img" aria-label="Librarian">👓</span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex w-80 flex-col rounded-xl border shadow-2xl sm:w-96"
          style={{
            backgroundColor: "var(--color-surface,#1e293b)",
            borderColor: "var(--color-border,#334155)",
          }}
          role="dialog"
          aria-label={t("chat.title")}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-border,#334155)" }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {t("chat.title")}
              </h3>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {t("chat.credits").replace("{balance}", String(credits))}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Clear chat history"
            >
              Clear
            </button>
          </div>

          {/* Privacy Banner */}
          {!privacyDismissed && (
            <div className="mx-3 mt-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-muted)" }}>
              <div className="flex items-start gap-2">
                <span>🔒</span>
                <span className="flex-1">{t("chat.privacy")}</span>
                <button
                  type="button"
                  onClick={() => setPrivacyDismissed(true)}
                  className="text-xs hover:opacity-80"
                  aria-label="Dismiss privacy notice"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Save Toggle */}
          <div className="mx-3 mt-2 flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={saveHistory}
              onClick={() => setSaveHistory(!saveHistory)}
              className={`relative h-4 w-7 rounded-full transition-colors ${
                saveHistory ? "bg-[var(--color-primary,#6366f1)]" : "bg-gray-600"
              }`}
              aria-label={t("chat.saveToggle")}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                  saveHistory ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {t("chat.saveToggle")}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" style={{ maxHeight: "320px", minHeight: "200px" }}>
            {messages.length === 0 && (
              <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("chat.inputPlaceholder")}
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "text-white"
                      : ""
                  }`}
                  style={{
                    backgroundColor:
                      msg.role === "user"
                        ? "var(--color-primary,#6366f1)"
                        : "var(--color-bg)",
                    color: msg.role === "user" ? "white" : "var(--color-text)",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: "var(--color-border,#334155)" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.inputPlaceholder")}
              className="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
              aria-label={t("chat.inputPlaceholder")}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              aria-label={t("chat.send")}
            >
              {t("chat.send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}