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
    <article className="rounded-3xl bg-white p-5 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black ${valueColor}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">{subtitle}</p> : null}
    </article>
  );
}
