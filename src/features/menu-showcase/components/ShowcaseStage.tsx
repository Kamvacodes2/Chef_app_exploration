import type { ReactElement, ReactNode } from "react";

export interface ShowcaseStageProps {
  readonly children: ReactNode;
}

/**
 * 16:9 aspect-locked coordinate space shared by the plate and hands layers,
 * so they scale together as one unit. Full width on desktop, height-bounded
 * on tall viewports.
 */
export function ShowcaseStage({ children }: ShowcaseStageProps): ReactElement {
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[1600px] max-h-[68vh]">
      {children}
    </div>
  );
}
