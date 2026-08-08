import { SiteFooter } from "@/components/layout/SiteFooter";

export default function LegalLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-warm-cream)]">
      <main className="flex-1 px-4 py-10 text-[var(--color-charcoal)] sm:px-6">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
