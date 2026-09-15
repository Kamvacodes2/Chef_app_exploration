interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly valueColor?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  valueColor = "text-[var(--color-oxblood)]",
}: StatCardProps) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl bg-white p-3.5 shadow-[0_10px_30px_rgba(70,33,24,0.06)] sm:rounded-3xl sm:p-5 sm:shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-charcoal)]/60 sm:text-xs sm:tracking-[0.2em] line-clamp-2">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-black tracking-tight sm:mt-2 sm:text-2xl lg:text-3xl ${valueColor} truncate`}
        title={typeof value === "string" ? value : String(value)}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-[10px] text-[var(--color-charcoal)]/50 sm:text-xs truncate">
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}
