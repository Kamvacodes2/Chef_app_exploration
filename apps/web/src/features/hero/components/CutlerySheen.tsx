export function CutlerySheen() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      data-testid="cutlery-sheen"
      aria-hidden="true"
    >
      <div className="cutlery-sheen absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}
