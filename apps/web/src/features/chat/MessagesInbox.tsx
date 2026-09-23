"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  fetchChatRooms,
  fetchChatMessages,
  sendChatMessage,
  type ChatRoom,
  type ChatMessage,
} from "./api/chatClient";
import {
  IconMessageCircle,
  IconSearch,
  IconChevronLeft,
} from "@/components/ui/icons";

export interface MessagesInboxProps {
  readonly initialRoomId?: string;
  readonly basePath?: string;
}

function getInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return new Intl.DateTimeFormat("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
    return new Intl.DateTimeFormat("en-ZA", {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function MessagesInbox({ initialRoomId }: MessagesInboxProps) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<readonly ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId ?? null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputContent, setInputContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll rooms list
  useEffect(() => {
    let cancelled = false;

    const loadRooms = () => {
      fetchChatRooms()
        .then((data) => {
          if (cancelled) return;
          setRooms(data);
          setLoadingRooms(false);

          // If no room selected and we have rooms on initial load, optionally select the first one or initialRoomId
          if (!selectedRoomId && initialRoomId) {
            setSelectedRoomId(initialRoomId);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Failed to load chats");
          setLoadingRooms(false);
        });
    };

    loadRooms();
    const interval = setInterval(loadRooms, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [initialRoomId, selectedRoomId]);

  // Poll messages for active room
  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);

    const loadMessages = () => {
      fetchChatMessages(selectedRoomId, { page: 1, limit: 100 })
        .then((res) => {
          if (cancelled) return;
          setMessages(res.items);
          setLoadingMessages(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Failed to load messages");
          setLoadingMessages(false);
        });
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedRoomId]);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !inputContent.trim() || sending) return;

    const textToSend = inputContent.trim();
    setInputContent("");
    setSending(true);

    try {
      const newMsg = await sendChatMessage(selectedRoomId, textToSend);
      setMessages((prev) => [...prev, newMsg]);
      // Update room preview locally
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? { ...r, messages: [newMsg], updatedAt: new Date().toISOString() }
            : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInputContent(textToSend);
    } finally {
      setSending(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Filter rooms by search query
  const filteredRooms = rooms.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    // Check participants
    const otherParticipants = r.participants.filter((p) => p.userId !== user?.id);
    const participantMatch = otherParticipants.some(
      (p) =>
        p.user?.displayName?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q),
    );

    // Check booking details
    const bookingMatch =
      r.booking?.reference?.toLowerCase().includes(q) ||
      r.booking?.mainName?.toLowerCase().includes(q);

    // Check latest message
    const messageMatch = r.messages?.[0]?.content?.toLowerCase().includes(q);

    return participantMatch || bookingMatch || messageMatch;
  });

  const getOtherParticipantNames = (room: ChatRoom): string => {
    const others = room.participants.filter((p) => p.userId !== user?.id);
    if (others.length === 0) return "Support / ChefMate Team";
    return others.map((p) => p.user?.displayName ?? p.user?.email ?? "User").join(", ");
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[500px] overflow-hidden rounded-2xl border border-[var(--color-oxblood)]/15 bg-white shadow-sm">
      {/* Rooms List Pane */}
      <div
        className={`flex w-full flex-col border-r border-[var(--color-oxblood)]/10 md:w-80 lg:w-96 ${
          selectedRoomId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header / Search */}
        <div className="border-b border-[var(--color-oxblood)]/10 p-4">
          <h2 className="text-lg font-bold text-[var(--color-oxblood)]">Conversations</h2>
          <div className="relative mt-3">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-charcoal)]/40"
              width={16}
              height={16}
            />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-[var(--color-warm-cream)]/50 py-2 pl-9 pr-3 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Room items list */}
        <div className="flex-1 divide-y divide-[var(--color-oxblood)]/5 overflow-y-auto">
          {loadingRooms && rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--color-charcoal)]/50">
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-oxblood)] border-t-transparent" />
              Loading conversations...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--color-charcoal)]/50">
              <IconMessageCircle width={32} height={32} className="mb-2 text-[var(--color-charcoal)]/30" />
              {searchQuery ? "No matching conversations" : "No messages yet"}
            </div>
          ) : (

            filteredRooms.map((room) => {
              const active = room.id === selectedRoomId;
              const otherParticipants = room.participants.filter((p) => p.userId !== user?.id);
              const displayName = getOtherParticipantNames(room);
              const initials = getInitials(displayName);
              const latestMessage = room.messages?.[0];
              const timeDisplay = latestMessage
                ? formatMessageTime(latestMessage.createdAt)
                : formatMessageTime(room.updatedAt);
              const hasUnread = (room.unreadCount ?? 0) > 0;

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  type="button"
                  className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--color-warm-cream)]/50 ${
                    active ? "bg-[var(--color-warm-cream)]" : ""
                  }`}
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-xs font-bold text-white">
                    {initials}
                    {hasUnread ? (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`truncate text-sm ${
                          hasUnread
                            ? "font-bold text-[var(--color-charcoal)]"
                            : "font-medium text-[var(--color-charcoal)]"
                        }`}
                      >
                        {displayName}
                      </p>
                      {timeDisplay ? (
                        <span className="shrink-0 text-xs text-[var(--color-charcoal)]/40">
                          {timeDisplay}
                        </span>
                      ) : null}
                    </div>

                    {room.booking ? (
                      <p className="truncate text-xs font-medium text-[var(--color-oxblood)]">
                        {room.booking.mainName} • #{room.booking.reference}
                      </p>
                    ) : (
                      <p className="truncate text-xs text-[var(--color-charcoal)]/50">
                        {room.type === "SUPPORT" ? "Support Inquiry" : "Direct Message"}
                      </p>
                    )}

                    <p className="mt-0.5 truncate text-xs text-[var(--color-charcoal)]/60">
                      {latestMessage ? latestMessage.content : "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation Pane */}
      <div
        className={`flex flex-1 flex-col bg-white ${
          !selectedRoomId ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedRoom ? (
          <>
            {/* Conversation Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-oxblood)]/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRoomId(null)}
                  className="rounded-lg p-1 text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)] md:hidden"
                  aria-label="Back to conversations"
                >
                  <IconChevronLeft width={20} height={20} />
                </button>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-sm font-bold text-white">
                  {getInitials(getOtherParticipantNames(selectedRoom))}
                </div>

                <div>
                  <h3 className="font-bold text-[var(--color-oxblood)]">
                    {getOtherParticipantNames(selectedRoom)}
                  </h3>
                  {selectedRoom.booking ? (
                    <p className="text-xs text-[var(--color-charcoal)]/60">
                      Booking #{selectedRoom.booking.reference} •{" "}
                      {selectedRoom.booking.mainName} ({selectedRoom.booking.scheduledDate}{" "}
                      {selectedRoom.booking.timeSlot})
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-charcoal)]/60">
                      {selectedRoom.type === "SUPPORT" ? "Customer Support" : "Chat Room"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error ? (
              <div className="bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-warm-cream)]/20 p-6">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-charcoal)]/50">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-oxblood)] border-t-transparent" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[var(--color-charcoal)]/50">
                  <IconMessageCircle width={36} height={36} className="mb-2 text-[var(--color-charcoal)]/30" />
                  <p className="font-medium">No messages in this chat yet</p>
                  <p className="text-xs text-[var(--color-charcoal)]/40">
                    Send a message below to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const isSystem = msg.type === "SYSTEM";

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center py-1">
                        <div className="rounded-full bg-[var(--color-charcoal)]/10 px-3 py-1 text-[11px] font-medium text-[var(--color-charcoal)]/70">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      {!isMine && msg.sender ? (
                        <span className="mb-1 text-[11px] font-medium text-[var(--color-charcoal)]/50">
                          {msg.sender.displayName}
                        </span>
                      ) : null}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isMine
                            ? "bg-[var(--color-oxblood)] text-white"
                            : "bg-white text-[var(--color-charcoal)] border border-[var(--color-oxblood)]/10"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMine ? "text-white/70" : "text-[var(--color-charcoal)]/40"
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-3 border-t border-[var(--color-oxblood)]/10 bg-white p-4"
            >
              <input
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1 rounded-xl border border-[var(--color-oxblood)]/20 bg-[var(--color-warm-cream)]/30 px-4 py-2.5 text-sm text-[var(--color-charcoal)] placeholder:text-[var(--color-charcoal)]/40 focus:border-[var(--color-oxblood)] focus:bg-white focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || !inputContent.trim()}
                className="rounded-xl bg-[var(--color-oxblood)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[var(--color-charcoal)]/40">
            <IconMessageCircle width={48} height={48} className="mb-3 text-[var(--color-oxblood)]/30" />
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]/80">Select a conversation</h3>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">
              Choose a message thread from the left to view messages and reply.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
