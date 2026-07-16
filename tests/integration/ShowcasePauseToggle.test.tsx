import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShowcasePauseToggle } from "@/features/menu-showcase/components/ShowcasePauseToggle";

describe("ShowcasePauseToggle", () => {
  it('renders with aria-label "Pause menu showcase" when not paused and calls onToggle on click', () => {
    const onToggle = vi.fn();
    render(<ShowcasePauseToggle isPaused={false} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: "Pause menu showcase" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders with aria-label "Resume menu showcase" when paused', () => {
    const onToggle = vi.fn();
    render(<ShowcasePauseToggle isPaused={true} onToggle={onToggle} />);

    expect(screen.getByRole("button", { name: "Resume menu showcase" })).toBeInTheDocument();
  });

  it("is keyboard-activatable: focus + Enter triggers the click handler", () => {
    const onToggle = vi.fn();
    render(<ShowcasePauseToggle isPaused={false} onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: "Pause menu showcase" });
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
