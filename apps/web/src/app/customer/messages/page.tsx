"use client";

import { useSearchParams } from "next/navigation";
import { MessagesInbox } from "@/features/chat/MessagesInbox";

export default function CustomerMessagesPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
          Communicate with your assigned chefs and ChefMate support.
        </p>
      </div>

      <MessagesInbox initialRoomId={roomId} />
    </div>
  );
}
