import Link from "next/link";
import { ChefApplicationPage } from "@/features/platform/ChefApplicationPage";

export default function Page() {
  return (
    <>
      {/* Minimal apply header — no customer nav */}
      <header className="border-b border-[var(--color-oxblood)]/10 bg-white px-6 py-4">
        <Link href="/chef/apply" className="font-brand text-xl text-[var(--color-oxblood)]">
          ChefMate
        </Link>
      </header>
      <ChefApplicationPage />
    </>
  );
}
