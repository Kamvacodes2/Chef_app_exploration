"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessagesInbox } from "@/features/chat/MessagesInbox";

function MessagesContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? undefined;

  return <MessagesInbox initialRoomId={roomId} />;
}

export default function ChefPortalMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-oxblood)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
          Chat directly with customers regarding their scheduled cooking sessions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-96 flex items-center justify-center text-sm text-charcoal/40">
            Loading messages...
          </div>
        }
      >
        <MessagesContent />
      </Suspense>
    </div>
  );
}
