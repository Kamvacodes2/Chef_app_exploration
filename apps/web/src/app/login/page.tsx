import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthPage } from "@/features/auth/AuthPage";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-[var(--color-warm-cream)]">
            <p className="text-sm font-semibold text-[var(--color-charcoal)]/75" role="status">
              Loading sign in...
            </p>
          </main>
        }
      >
        <AuthPage />
      </Suspense>
    </>
  );
}
