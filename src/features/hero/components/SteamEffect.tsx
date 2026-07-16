export function SteamEffect() {
  return (
    <div className="pointer-events-none absolute -top-4 left-1/2 flex -translate-x-1/2 gap-2" data-testid="steam-effect" aria-hidden="true">
      <span className="steam-wisp h-10 w-2 rounded-full bg-white/60 blur-sm [animation-delay:0s]" />
      <span className="steam-wisp h-12 w-2 rounded-full bg-white/50 blur-sm [animation-delay:0.6s]" />
      <span className="steam-wisp h-10 w-2 rounded-full bg-white/60 blur-sm [animation-delay:1.2s]" />
    </div>
  );
}
