export default function LegalLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--color-warm-cream)] px-4 py-10 text-[var(--color-charcoal)] sm:px-6">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}
