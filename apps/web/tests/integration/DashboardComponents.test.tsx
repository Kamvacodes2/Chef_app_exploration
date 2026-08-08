import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatCard", () => {
  it("renders label and numeric value", () => {
    render(<StatCard label="Total Bookings" value={42} />);
    expect(screen.getByText("Total Bookings")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<StatCard label="Revenue" value="R1,200" />);
    expect(screen.getByText("R1,200")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<StatCard label="Chefs" value={12} subtitle="3 pending" />);
    expect(screen.getByText("3 pending")).toBeInTheDocument();
  });

  it("uses custom value color", () => {
    render(<StatCard label="Test" value={1} valueColor="text-emerald-600" />);
    const value = screen.getByText("1");
    expect(value.className).toContain("text-emerald-600");
  });

  it("uses oxblood as default color", () => {
    render(<StatCard label="Test" value={1} />);
    const value = screen.getByText("1");
    expect(value.className).toContain("text-[var(--color-oxblood)]");
  });
});

describe("StatusBadge", () => {
  it("renders confirmed status", () => {
    render(<StatusBadge status="confirmed" />);
    const badge = screen.getByText("confirmed");
    expect(badge.className).toContain("bg-emerald-50");
  });

  it("renders pending status", () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText("pending");
    expect(badge.className).toContain("bg-amber-50");
  });

  it("renders with underscores replaced", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<StatusBadge status="REQUESTED" label="New Request" />);
    expect(screen.getByText("New Request")).toBeInTheDocument();
  });

  it("uses neutral fallback for unknown status", () => {
    render(<StatusBadge status="unknown_status" />);
    const badge = screen.getByText("unknown status");
    expect(badge.className).toContain("bg-[var(--color-warm-cream)]");
  });
});
