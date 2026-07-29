import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthPage } from "@/features/auth/AuthPage";

describe("AuthPage", () => {
  it("switches between sign-in and customer-account creation", () => {
    render(<AuthPage />);

    expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    expect(screen.getByRole("tab", { name: "Create account" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Your name")).toBeRequired();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("autocomplete", "new-password");
  });
});
