import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../../context/LanguageContext";
import { matchIntent, getFallback } from "./guideKnowledge";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  route?: string;
  linkLabel?: string;
}

interface GuideChatProps {
  onClose: () => void;
}

const UI = {
  en: {
    title:       "B2A Guide",
    welcome:     "Hi! I'm the B2A guide. Ask me anything about the platform — for example: \"How do I upload a timesheet?\" or \"Where can I see projects?\"",
    placeholder: "Ask your question...",
    ariaInput:   "Message to guide",
    ariaClose:   "Close guide",
    ariaSend:    "Send",
  },
  fr: {
    title:       "Guide B2A",
    welcome:     "Bonjour ! Je suis le guide B2A. Posez-moi une question sur la plateforme — par exemple : \"Comment importer une feuille de temps ?\" ou \"Où voir les projets ?\"",
    placeholder: "Posez votre question...",
    ariaInput:   "Message au guide",
    ariaClose:   "Fermer le guide",
    ariaSend:    "Envoyer",
  },
} as const;

export default function GuideChat({ onClose }: GuideChatProps) {
  const { lang }   = useLanguage();
  const l          = (lang === "fr" ? "fr" : "en") as "en" | "fr";
  const ui         = UI[l];
  const navigate   = useNavigate();
  const counterRef = useRef(2);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "bot", text: ui.welcome },
  ]);
  const [input, setInput] = useState("");
  const hasText = input.trim().length > 0;

  // Re-seed welcome message when language changes
  useEffect(() => {
    setMessages([{ id: 1, from: "bot", text: UI[l].welcome }]);
  }, [l]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function send() {
    const text = input.trim();
    if (!text) return;

    const intent  = matchIntent(text);
    const userMsg: Message = { id: counterRef.current++, from: "user", text };
    const botMsg: Message  = intent
      ? {
          id:        counterRef.current++,
          from:      "bot",
          text:      intent.response[l],
          route:     intent.route,
          linkLabel: intent.linkLabel?.[l],
        }
      : { id: counterRef.current++, from: "bot", text: getFallback(l) };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function goTo(route: string) {
    navigate(route);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label={ui.title}
      style={{
        position: "fixed",
        bottom: "88px",
        right: "24px",
        width: "340px",
        maxHeight: "500px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg-sidebar)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "18px",
        boxShadow: "var(--shadow-elevated)",
        zIndex: 9998,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--color-border-default)",
          backgroundColor: "var(--color-accent)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bot style={{ width: "18px", height: "18px", color: "#0D0D0D" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0D0D0D" }}>{ui.title}</span>
        </div>
        <button
          onClick={onClose}
          aria-label={ui.ariaClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#0D0D0D", display: "flex", alignItems: "center",
            padding: "4px", borderRadius: "6px",
          }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.from === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", flexDirection: isUser ? "row-reverse" : "row" }}>
                <div
                  style={{
                    width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                    backgroundColor: isUser ? "var(--color-label-bg)" : "var(--color-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {isUser
                    ? <User style={{ width: "13px", height: "13px", color: "var(--color-text-secondary)" }} />
                    : <Bot  style={{ width: "13px", height: "13px", color: "#0D0D0D" }} />
                  }
                </div>
                <div
                  style={{
                    maxWidth: "230px",
                    padding: "9px 12px",
                    borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    backgroundColor: isUser ? "var(--color-accent)" : "var(--color-bg-card-nested)",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: isUser ? "#0D0D0D" : "var(--color-text-primary)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {msg.text}
                </div>
              </div>

              {msg.route && msg.linkLabel && (
                <button
                  onClick={() => goTo(msg.route!)}
                  style={{
                    marginLeft: isUser ? 0 : "32px",
                    marginRight: isUser ? "32px" : 0,
                    padding: "5px 12px",
                    borderRadius: "9999px",
                    backgroundColor: "var(--color-accent)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0D0D0D",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {msg.linkLabel} →
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--color-border-default)",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexShrink: 0,
          backgroundColor: "var(--color-bg-sidebar)",
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={ui.placeholder}
          aria-label={ui.ariaInput}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid var(--color-border-default)",
            backgroundColor: "var(--color-input-bg)",
            fontSize: "13px",
            color: "var(--color-text-primary)",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--color-border-default)")}
        />
        <button
          onClick={send}
          disabled={!hasText}
          aria-label={ui.ariaSend}
          style={{
            width: "34px", height: "34px",
            borderRadius: "10px",
            backgroundColor: hasText ? "var(--color-accent)" : "var(--color-label-bg)",
            border: "none",
            cursor: hasText ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background-color 0.15s",
          }}
        >
          <Send style={{ width: "14px", height: "14px", color: hasText ? "#0D0D0D" : "var(--color-text-tertiary)" }} />
        </button>
      </div>
    </div>
  );
}
