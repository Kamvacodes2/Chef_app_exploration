import Link from "next/link";
import { IconInstagram, IconTikTok } from "@/components/ui/icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-oxblood)]/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-brand text-lg text-[var(--color-oxblood)]">
              ChefMate
            </Link>
            <span className="text-xs text-[var(--color-charcoal)]/40">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--color-charcoal)]/50">
              <Link
                href="/legal/terms"
                className="transition-colors hover:text-[var(--color-charcoal)]"
              >
                Terms
              </Link>
              <Link
                href="/legal/privacy"
                className="transition-colors hover:text-[var(--color-charcoal)]"
              >
                Privacy
              </Link>
              <Link
                href="/legal/chef-agreement"
                className="transition-colors hover:text-[var(--color-charcoal)]"
              >
                Chef Agreement
              </Link>
              <Link
                href="/legal/code-of-conduct"
                className="transition-colors hover:text-[var(--color-charcoal)]"
              >
                Code of Conduct
              </Link>
              <Link
                href="/legal/customer-terms"
                className="transition-colors hover:text-[var(--color-charcoal)]"
              >
                Customer Terms
              </Link>
            </nav>
            <div className="flex items-center gap-3 border-l border-[var(--color-oxblood)]/10 pl-4">
              <a
                href="https://www.instagram.com/chefmateza"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ChefMate on Instagram"
                className="text-[var(--color-charcoal)]/40 transition-colors hover:text-[var(--color-oxblood)]"
              >
                <IconInstagram width={18} height={18} />
              </a>
              <a
                href="https://www.tiktok.com/@chef.mate.za"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ChefMate on TikTok"
                className="text-[var(--color-charcoal)]/40 transition-colors hover:text-[var(--color-oxblood)]"
              >
                <IconTikTok width={18} height={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
