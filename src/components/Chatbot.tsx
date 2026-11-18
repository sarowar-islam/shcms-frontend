import { useState, useRef, useEffect } from "react";
import type { ComplaintCategory, UrgencyLevel } from "../dummy";
import api from "../utils/api";

interface ParsedComplaint {
  title: string;
  description: string;
  category: ComplaintCategory;
  urgency: UrgencyLevel;
}

interface ChatMessage {
  role: "bot" | "user";
  text: string;
}

interface ChatbotReply {
  reply: string;
  complaint: ParsedComplaint | null;
}

interface ChatbotProps {
  onFillForm: (data: ParsedComplaint) => void;
  onClose: () => void;
}

const GREETINGS = [
  "Hi! I'm here to help you file a complaint. Describe your issue and I'll fill in the form for you.",
  "You can say things like: 'My fan switch is not working' or 'The washroom tap is leaking.'",
];

export default function Chatbot({ onFillForm, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: GREETINGS[0] },
    { role: "bot", text: GREETINGS[1] },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingParsed, setPendingParsed] = useState<ParsedComplaint | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    setInput("");
    const conversation = [...messages, { role: "user" as const, text: trimmed }].slice(-20);
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setShowConfirm(false);
    setPendingParsed(null);
    setIsTyping(true);

    try {
      const { data } = await api.post<ChatbotReply>("/chatbot/chat", {
        messages: conversation.map((message) => ({
          role: message.role === "bot" ? "model" : "user",
          text: message.text,
        })),
      });
      setMessages((m) => [...m, { role: "bot", text: data.reply }]);
      if (data.complaint) {
        setPendingParsed(data.complaint);
        setShowConfirm(true);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "I couldn't reach the assistant. Please check the backend Gemini configuration and try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirm = () => {
    if (pendingParsed) {
      onFillForm(pendingParsed);
      setShowConfirm(false);
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Form filled! Please review and submit your complaint." },
      ]);
      setTimeout(onClose, 1200);
    }
  };

  const handleDeny = () => {
    setShowConfirm(false);
    setPendingParsed(null);
    setMessages((m) => [
      ...m,
      { role: "bot", text: "No problem. Please describe your issue again in more detail." },
    ]);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col rounded-xl shadow-2xl overflow-hidden"
      style={{
        width: "360px",
        height: "480px",
        backgroundColor: "#fff",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#0F1B2D" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
            style={{ backgroundColor: "#0E7C7B" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p
              className="text-xs font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hall Assistant
            </p>
            <p className="text-xs" style={{ color: "#6B8099" }}>
              AI-powered complaint helper
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed"
              style={{
                backgroundColor:
                  m.role === "user" ? "#0E7C7B" : "#F4F5F7",
                color: m.role === "user" ? "#fff" : "#111827",
                fontFamily: "var(--font-body)",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#F4F5F7" }}
            >
              <div className="flex gap-1 items-center h-4">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        {showConfirm && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="px-3 py-1.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0E7C7B", fontFamily: "var(--font-display)" }}
              >
                Yes, fill form
              </button>
              <button
                onClick={handleDeny}
                className="px-3 py-1.5 rounded text-xs font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: "var(--border)", color: "#6B7280" }}
              >
                No, rephrase
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 py-3 border-t flex gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          maxLength={2000}
          placeholder="e.g. My fan switch is not working"
          className="flex-1 px-3 py-2 rounded text-sm outline-none"
          style={{
            backgroundColor: "#F4F5F7",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            color: "#111827",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={isTyping || !input.trim()}
          className="px-3 py-2 rounded text-white transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#0E7C7B",
            opacity: isTyping || !input.trim() ? 0.6 : 1,
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
