"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/features/hero/components/BrandMark";
import { useAuth } from "@/features/auth/AuthContext";

interface SiteHeaderProps {
  /**
   * "marketing" shows the public site nav and customer CTAs (Book a chef /
   * Login). "chefPortal" shows only the brand and a chef-portal indicator,
   * for signed-in chef flows where the customer CTAs would be misleading.
   */
  readonly variant?: "marketing" | "chefPortal";
}

/** Homepage-level brand header. It belongs before every page section rather
 * than inside one feature, so the first thing in the document is always the
 * ChefMate identity. Reloading the root route also restores any client-side
 * feature state when the wordmark is activated.
 */
export function SiteHeader({ variant = "marketing" }: SiteHeaderProps) {
  const { user, logout } = useAuth();
  const isCustomer = user?.roles.includes("CUSTOMER") ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const returnToStart = (): void => {
    window.location.assign("/");
  };

  const handleLogout = (): void => {
    setMenuOpen(false);
    void logout().finally(() => {
      window.location.assign("/");
    });
  };

  const ctaClassName =
    "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg border border-[var(--color-oxblood)]/35 px-3 text-xs font-bold text-[var(--color-oxblood)] transition hover:border-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:px-4 sm:text-sm";

  const navLinks = (
    <>
      <Link
        className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
        href="/#how-it-works"
      >
        How it works
      </Link>
      <Link
        className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
        href="/#meals"
      >
        Meals
      </Link>
      <Link
        className="inline-flex min-h-10 items-center transition hover:text-[var(--color-oxblood)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
        href="/#plans"
      >
        Plans
      </Link>
    </>
  );

  const ctaActions = (
    <>
      <Link
        href="/#order-flow"
        className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[var(--color-oxblood)] px-3 text-xs font-bold text-white transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:px-5 sm:text-sm"
      >
        Book a chef
      </Link>
      {user ? (
        <>
          {isCustomer ? (
            <Link href="/customer/dashboard" className={ctaClassName}>
              My Dashboard
            </Link>
          ) : null}
          <button className={ctaClassName} onClick={handleLogout} type="button">
            Log out
          </button>
        </>
      ) : (
        <a href="/login" className={ctaClassName}>
          Login
        </a>
      )}
    </>
  );

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6"
      data-testid="site-header"
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
        <BrandMark onReset={returnToStart} />
        {variant === "chefPortal" ? (
          <span
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-oxblood)]/25 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-oxblood)]"
            data-testid="chef-portal-indicator"
          >
            Chef portal
          </span>
        ) : (
          <>
            {/* Desktop navigation */}
            <nav
              className="hidden items-center gap-6 text-sm font-semibold text-[var(--color-charcoal)]/80 md:flex"
              aria-label="Primary"
            >
              {navLinks}
            </nav>
            <div className="hidden shrink-0 items-center gap-1.5 sm:gap-2 md:flex">
              {ctaActions}
            </div>
            {/* Mobile hamburger */}
            <button
              aria-controls="site-header-mobile-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--color-oxblood)]/25 text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* Mobile menu panel */}
      {variant === "marketing" && menuOpen ? (
        <div
          className="border-t border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)] px-4 pt-3 pb-4 md:hidden"
          id="site-header-mobile-menu"
        >
          <nav
            className="flex flex-col items-start gap-1 text-sm font-semibold text-[var(--color-charcoal)]/80"
            aria-label="Primary"
          >
            {navLinks}
          </nav>
          <div className="mt-4 flex w-full items-center gap-2">{ctaActions}</div>
        </div>
      ) : null}
    </header>
  );
}
