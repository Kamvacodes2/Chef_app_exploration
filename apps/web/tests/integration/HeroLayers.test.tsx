import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmbientGlowLayer } from "@/features/hero/components/AmbientGlowLayer";
import { GrainOverlay } from "@/features/hero/components/GrainOverlay";
import { HeroHeadline } from "@/features/hero/components/HeroHeadline";
import { ModelLayer } from "@/features/hero/components/ModelLayer";
import { PALETTES } from "@/features/hero/constants/palettes";

/**
 * The hero's presentational layers had no direct tests. They are pure
 * render-only components, so the meaningful assertions are the ones a
 * regression would actually break: the palette reaching the gradient, the
 * decorative layers staying hidden from assistive technology, and each model
 * frame carrying its own descriptive alt text.
 */

const palette = PALETTES.vanilla;

describe("AmbientGlowLayer", () => {
  it("renders a radial gradient built from the active palette", () => {
    render(<AmbientGlowLayer palette={palette} />);

    const layer = screen.getByTestId("ambient-glow-layer");
    expect(layer).toBeInTheDocument();
    expect(layer.getAttribute("style")).toContain("radial-gradient");
  });

  it("never intercepts pointer events over the hero", () => {
    render(<AmbientGlowLayer palette={palette} />);
    expect(screen.getByTestId("ambient-glow-layer").className).toContain("pointer-events-none");
  });

  it("tracks the palette when the hero changes mood", () => {
    // `vanilla` ends on maize, `olive` on oxblood, so the gradient must change.
    const { rerender } = render(<AmbientGlowLayer palette={PALETTES.vanilla} />);
    const before = screen.getByTestId("ambient-glow-layer").getAttribute("style");

    rerender(<AmbientGlowLayer palette={PALETTES.olive} />);
    const after = screen.getByTestId("ambient-glow-layer").getAttribute("style");

    expect(after).toContain("radial-gradient");
    expect(after).not.toBe(before);
  });
});

describe("GrainOverlay", () => {
  it("is decorative and hidden from assistive technology", () => {
    const { container } = render(<GrainOverlay />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.className.baseVal ?? "").toContain("pointer-events-none");
  });

  it("declares the turbulence filter the grain effect references", () => {
    const { container } = render(<GrainOverlay />);

    expect(container.querySelector("filter#hero-grain")).not.toBeNull();
    expect(container.querySelector("rect")).toHaveAttribute("filter", "url(#hero-grain)");
  });
});

describe("HeroHeadline", () => {
  it("renders the single top-level hero heading", () => {
    render(<HeroHeadline />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("What's for dinner tonight?");
  });

  it("applies the palette text colour when one is supplied", () => {
    render(<HeroHeadline textColor="rgb(10, 20, 30)" />);
    expect(screen.getByTestId("hero-headline")).toHaveStyle({ color: "rgb(10, 20, 30)" });
  });

  it("falls back to the stylesheet colour when none is supplied", () => {
    render(<HeroHeadline />);
    expect(screen.getByTestId("hero-headline").getAttribute("style")).toBeNull();
  });
});

describe("ModelLayer", () => {
  it("renders the requested frame with frame-specific alt text", () => {
    render(<ModelLayer frameNumber={3} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("alt", expect.stringContaining("spoon"));
    expect(screen.getByTestId("model-layer")).toBeInTheDocument();
  });

  it("gives each of the three frames a distinct description", () => {
    const alts = new Set<string>();
    for (const frameNumber of [1, 2, 3]) {
      const { unmount } = render(<ModelLayer frameNumber={frameNumber} />);
      alts.add(screen.getByRole("img").getAttribute("alt") ?? "");
      unmount();
    }
    expect(alts.size).toBe(3);
  });

  it("falls back to a generic description for an unknown frame", () => {
    render(<ModelLayer frameNumber={99} />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Chill Chef model");
  });

  it("renders children above the model", () => {
    render(
      <ModelLayer frameNumber={1}>
        <span data-testid="overlay-child">on top</span>
      </ModelLayer>,
    );
    expect(screen.getByTestId("overlay-child")).toBeInTheDocument();
  });
});
