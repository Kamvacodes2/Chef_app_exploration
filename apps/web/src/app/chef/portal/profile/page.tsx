"use client";

import { ChefProfileEditor } from "@/features/platform/ChefProfileEditor";
import { useEffect, useState } from "react";
import { fetchChefProfile, type ChefProfile } from "@/features/platform/api/platformClient";

export default function ChefProfileRoute() {
  const [profile, setProfile] = useState<ChefProfile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setBusy(true);
        setProfile(await fetchChefProfile());
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  if (busy || !profile) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-[var(--color-charcoal)]/75">
        {busy ? "Loading profile..." : "No profile yet."}
      </p>
    );
  }

  return <ChefProfileEditor onSaved={setProfile} profile={profile} />;
}
