"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function ChefMessagesPage() {
  useEffect(() => {
    // The chef messaging portal lives at /chef/portal/messages. Legacy links
    // (including "Open Messages" links in chat notification emails) point here,
    // so the query string is carried across — dropping it silently discarded
    // ?roomId=... and opened the inbox instead of the conversation.
    const search = window.location.search;
    redirect(`/chef/portal/messages${search}`);
  }, []);

  return null;
}
