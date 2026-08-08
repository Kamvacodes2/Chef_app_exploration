const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-800" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-800" },
  pending: { bg: "bg-amber-50", text: "text-amber-800" },
  requested: { bg: "bg-amber-50", text: "text-amber-800" },
  cancelled: { bg: "bg-red-50", text: "text-red-800" },
  active: { bg: "bg-emerald-50", text: "text-emerald-800" },
  applied: { bg: "bg-blue-50", text: "text-blue-800" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-800" },
  rejected: { bg: "bg-red-50", text: "text-red-800" },
  invited: { bg: "bg-purple-50", text: "text-purple-800" },
  suspended: { bg: "bg-red-50", text: "text-red-800" },
  en_route: { bg: "bg-sky-50", text: "text-sky-800" },
  chef_matched: { bg: "bg-sky-50", text: "text-sky-800" },
  awaiting_chef: { bg: "bg-amber-50", text: "text-amber-800" },
  needs_review: { bg: "bg-amber-50", text: "text-amber-800" },
  open: { bg: "bg-amber-50", text: "text-amber-800" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-800" },
  resolved: { bg: "bg-emerald-50", text: "text-emerald-800" },
  closed: { bg: "bg-[var(--color-charcoal)]/10", text: "text-[var(--color-charcoal)]/60" },
  queued: { bg: "bg-purple-50", text: "text-purple-800" },
  sent: { bg: "bg-emerald-50", text: "text-emerald-800" },
  skipped: { bg: "bg-[var(--color-warm-cream)]", text: "text-[var(--color-charcoal)]/60" },
  failed: { bg: "bg-red-50", text: "text-red-800" },
  interview_scheduled: { bg: "bg-purple-50", text: "text-purple-800" },
  interview_conducted: { bg: "bg-blue-50", text: "text-blue-800" },
};

interface StatusBadgeProps {
  readonly status: string;
  readonly label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const colors = STATUS_COLORS[key] ?? {
    bg: "bg-[var(--color-warm-cream)]",
    text: "text-[var(--color-charcoal)]/70",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
