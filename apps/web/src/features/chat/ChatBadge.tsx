"use client";

import { useEffect, useState } from "react";
import { fetchChatUnreadCount } from "./api/chatClient";

export interface ChatBadgeProps {
  readonly className?: string;
  readonly pollIntervalMs?: number;
}

export function ChatBadge({ className = "", pollIntervalMs = 15000 }: ChatBadgeProps) {
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      fetchChatUnreadCount()
        .then((res) => {
          if (!cancelled) setUnread(res.unread);
        })
        .catch(() => {
          // Silent catch for polling
        });
    };

    check();
    const interval = setInterval(check, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs]);

  if (unread <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white ${className}`}
      data-testid="chat-unread-badge"
    >
      {unread > 9 ? "9+" : unread}
    </span>
  );
}
