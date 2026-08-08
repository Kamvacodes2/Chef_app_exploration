import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Bookings" value={42} />);
    expect(screen.getByText("Total Bookings")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("applies custom value color class", () => {
    render(<StatCard label="Revenue" value="R1,200" valueColor="text-emerald-600" />);
    const valueEl = screen.getByText("R1,200");
    expect(valueEl.className).toContain("text-emerald-600");
  });

  it("renders subtitle when provided", () => {
    render(<StatCard label="Chefs" value={12} subtitle="3 pending approval" />);
    expect(screen.getByText("3 pending approval")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    render(<StatCard label="Test" value={1} />);
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it("uses oxblood as default value color", () => {
    render(<StatCard label="Test" value={1} />);
    const valueEl = screen.getByText("1");
    expect(valueEl.className).toContain("text-[var(--color-oxblood)]");
  });
});
