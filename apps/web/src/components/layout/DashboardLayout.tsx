"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { IconLogOut, IconMenu, IconX } from "@/components/ui/icons";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon: ReactNode;
}

interface DashboardLayoutProps {
  readonly navItems: readonly NavItem[];
  readonly children: ReactNode;
  readonly title?: string;
  readonly userDisplayName?: string;
  readonly userEmail?: string;
  readonly userInitials?: string;
  readonly onLogout?: () => void;
}

export function DashboardLayout({
  navItems,
  children,
  title,
  userDisplayName,
  userEmail,
  userInitials,
  onLogout,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-warm-cream)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:bg-white md:border-r md:border-[var(--color-oxblood)]/10">
        <div className="p-6 border-b border-[var(--color-oxblood)]/10">
          <Link href="/" className="font-brand text-xl text-[var(--color-oxblood)]">
            ChefMate
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--color-oxblood)] font-bold text-white"
                    : "text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)] hover:text-[var(--color-charcoal)]"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        {userDisplayName ? (
          <div className="border-t border-[var(--color-oxblood)]/10 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-sm font-semibold text-white">
                {userInitials ?? userDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-charcoal)]">
                  {userDisplayName}
                </p>
                {userEmail ? (
                  <p className="truncate text-xs text-[var(--color-charcoal)]/50">{userEmail}</p>
                ) : null}
              </div>
            </div>
            {onLogout ? (
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-600/80"
                type="button"
              >
                <IconLogOut className="h-4 w-4" />
                Log Out
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>

      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-oxblood)]/10 bg-white px-4 md:hidden">
        <Link href="/" className="font-brand text-lg text-[var(--color-oxblood)]">
          ChefMate
        </Link>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg p-2 transition-colors hover:bg-[var(--color-warm-cream)]"
          type="button"
        >
          <IconMenu width={22} height={22} className="text-[var(--color-charcoal)]" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-oxblood)]/10 p-4">
              <Link href="/" className="font-brand text-lg text-[var(--color-oxblood)]">
                ChefMate
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-[var(--color-warm-cream)]"
                type="button"
              >
                <IconX width={20} height={20} className="text-[var(--color-charcoal)]" />
              </button>
            </div>

            {userDisplayName ? (
              <div className="flex items-center gap-3 border-b border-[var(--color-oxblood)]/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-sm font-semibold text-white">
                  {userInitials ?? userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-charcoal)]">
                    {userDisplayName}
                  </p>
                  {userEmail ? (
                    <p className="truncate text-xs text-[var(--color-charcoal)]/50">{userEmail}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {navItems.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-[var(--color-oxblood)] font-bold text-white"
                        : "text-[var(--color-charcoal)]/70 hover:bg-[var(--color-warm-cream)] hover:text-[var(--color-charcoal)]"
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {onLogout ? (
              <div className="border-t border-[var(--color-oxblood)]/10 p-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  type="button"
                >
                  <IconLogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {title ? (
          <div className="border-b border-[var(--color-oxblood)]/10 bg-white px-6 py-5 md:px-8">
            <h1 className="text-2xl font-black text-[var(--color-oxblood)]">{title}</h1>
          </div>
        ) : null}
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
