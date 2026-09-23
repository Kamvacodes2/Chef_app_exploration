"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  createChatRoom,
  fetchChatMessages,
  sendChatMessage,
  type ChatMessage,
} from "./api/chatClient";
import { IconMessageCircle, IconX } from "@/components/ui/icons";

export interface ChatPanelProps {
  readonly bookingRequestId?: string;
  readonly initialRoomId?: string;
  readonly bookingRef?: string;
  readonly mealName?: string;
  readonly recipientName?: string;
  readonly onClose: () => void;
  readonly pollIntervalMs?: number;
}

function getInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export function ChatPanel({
  bookingRequestId,
  initialRoomId,
  bookingRef,
  mealName,
  recipientName,
  onClose,
  pollIntervalMs = 4000,
}: ChatPanelProps) {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ?? null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(!initialRoomId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Resolve room if not provided
  useEffect(() => {
    let cancelled = false;
    if (initialRoomId) {
      setRoomId(initialRoomId);
      return;
    }

    if (!bookingRequestId) return;

    setLoading(true);
    createChatRoom(bookingRequestId)
      .then((room) => {
        if (!cancelled) {
          setRoomId(room.id);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open chat room");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingRequestId, initialRoomId]);

  // 2. Poll messages
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const loadMessages = () => {
      fetchChatMessages(roomId, { page: 1, limit: 100 })
        .then((res) => {
          if (!cancelled) {
            setMessages(res.items);
          }
        })
        .catch(() => {
          // Poll error ignored
        });
    };

    loadMessages();
    const interval = setInterval(loadMessages, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, pollIntervalMs]);

  // 3. Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length]);


  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || !roomId || sending) return;

    setSending(true);
    setError(null);
    try {
      const newMsg = await sendChatMessage(roomId, trimmed);
      setContent("");
      setMessages((prev) => [...prev, newMsg]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex h-[540px] w-[360px] sm:w-[400px] flex-col rounded-3xl border border-[var(--color-oxblood)]/15 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5"
      role="dialog"
      aria-label="Chat conversation"
    >
      {/* Header */}
      <header className="flex items-center justify-between bg-[var(--color-oxblood)] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
            <IconMessageCircle width={18} height={18} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold leading-tight">
              {recipientName ? recipientName : mealName ? mealName : "Booking Chat"}
            </h3>
            {bookingRef ? (
              <p className="truncate text-xs text-white/70">Ref {bookingRef}</p>
            ) : null}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
          type="button"
          aria-label="Close chat"
        >
          <IconX width={18} height={18} />
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-warm-cream)]/30">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs font-semibold text-[var(--color-charcoal)]/50">
              Opening conversation...
            </p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-semibold text-rose-600">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-semibold text-[var(--color-charcoal)]/50">
              No messages yet. Send a message to get started!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;

            if (msg.type === "SYSTEM") {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="rounded-full bg-[var(--color-bone)] px-3 py-1 text-[11px] font-semibold text-[var(--color-charcoal)]/70">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const senderName = msg.sender?.displayName ?? "User";

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMine ? (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bone)] text-[10px] font-bold text-[var(--color-oxblood)]"
                    title={senderName}
                  >
                    {getInitials(senderName)}
                  </div>
                ) : null}

                <div
                  className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  {!isMine ? (
                    <span className="mb-0.5 px-1 text-[10px] font-semibold text-[var(--color-charcoal)]/50">
                      {senderName}
                    </span>
                  ) : null}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isMine
                        ? "bg-[var(--color-oxblood)] font-medium text-white rounded-br-xs"
                        : "bg-white border border-[var(--color-oxblood)]/10 text-[var(--color-charcoal)] rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  <span className="mt-0.5 px-1 text-[10px] text-[var(--color-charcoal)]/40">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <footer className="border-t border-[var(--color-oxblood)]/10 bg-white p-3">
        {error ? (
          <p className="mb-1 text-[11px] font-semibold text-rose-600 truncate">{error}</p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={loading || !roomId}
            className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-[var(--color-oxblood)]/20 bg-[var(--color-warm-cream)]/30 px-3.5 py-2.5 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:bg-white focus:outline-none"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!content.trim() || sending || loading || !roomId}
            className="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-[var(--color-oxblood)] px-3 text-xs font-bold text-white transition hover:opacity-95 disabled:opacity-40"
            type="button"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[var(--color-charcoal)]/40">
          Press Enter to send · Shift+Enter for new line
        </p>
      </footer>
    </div>
  );
}
