export interface HeroHeadlineProps {
  /**
   * On-background text color, derived from the active palette's
   * `textColor`. Falls back to the default dark neutral when omitted.
   */
  readonly textColor?: string;
}

export function HeroHeadline({ textColor }: HeroHeadlineProps) {
  return (
    <div className="text-center sm:text-left">
      <h1
        className="font-display text-4xl font-bold sm:text-5xl"
        style={textColor ? { color: textColor } : undefined}
        data-testid="hero-headline"
      >
        What&apos;s for dinner tonight?
      </h1>
    </div>
  );
}
