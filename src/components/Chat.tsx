import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import type { ChatMessage, ChatSender } from "../lib/types";
import { subscribeMessages, sendMessage } from "../lib/firestore";
import {
  DRIVER_QUICK_MESSAGES,
  PASSENGER_QUICK_MESSAGES,
} from "../lib/notification";

interface ChatProps {
  tripId: string;
  sender: ChatSender;
}

export function Chat({ tripId, sender }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const quickMessages =
    sender === "driver" ? DRIVER_QUICK_MESSAGES : PASSENGER_QUICK_MESSAGES;

  useEffect(() => {
    return subscribeMessages(tripId, setMessages);
  }, [tripId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(messageText?: string) {
    const trimmed = (messageText ?? text).trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      await sendMessage(tripId, trimmed, sender);
    } catch (e) {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-ink-card rounded-card border border-ink-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-ink-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse-gold" />
        <span className="text-sm font-bold text-txt">المحادثة</span>
      </div>

      <div
        ref={listRef}
        className="px-3 py-3 max-h-48 min-h-[80px] overflow-y-auto space-y-2 bg-ink-bg/50"
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-txt-muted py-4">
            لا رسائل بعد — أرسل رسالة
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === sender;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? "bg-gold/15 border border-gold/30 text-txt rounded-bl-sm"
                      : "bg-ink-card border border-ink-border text-txt rounded-br-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick messages */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-t border-ink-border bg-ink-bg/30">
        {quickMessages.map((msg, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(msg)}
            className="shrink-0 px-3 py-1.5 text-xs border border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-colors whitespace-nowrap"
          >
            {msg}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-ink-border">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="اكتب رسالة..."
          className="flex-1 bg-ink-bg text-sm text-txt placeholder:text-txt-muted px-3 py-2 rounded-lg border border-ink-border focus:outline-none focus:border-gold/40"
          dir="rtl"
        />
        <button
          onClick={() => handleSend()}
          disabled={!text.trim() || sending}
          className="p-2.5 rounded-lg bg-gold text-ink-bg disabled:opacity-40 hover:opacity-90 transition"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
