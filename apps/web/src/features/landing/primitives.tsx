import type { ReactElement, ReactNode } from "react";

export function Container({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-oxblood)]/75">
      {children}
    </p>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
    >
      {children}
    </a>
  );
}
