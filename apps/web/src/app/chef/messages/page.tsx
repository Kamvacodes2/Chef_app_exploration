"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function ChefMessagesPage() {
  useEffect(() => {
    redirect("/chef/portal/messages");
  }, []);

  return null;
}
