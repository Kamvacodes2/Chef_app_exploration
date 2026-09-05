import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";

const authApi = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}));

vi.mock("@/features/auth/api/authClient", () => authApi);

function renderPage(): void {
  render(<ResetPasswordPage token="reset-token-12345678901234567890" />);
}

function fillPasswords(first: string, second: string): void {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: first } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: second },
  });
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets the password and shows the success state", async () => {
    authApi.resetPassword.mockResolvedValue(undefined);
    renderPage();

    fillPasswords("Fresh-password-2026!", "Fresh-password-2026!");
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith(
        "reset-token-12345678901234567890",
        "Fresh-password-2026!",
      ),
    );
    expect(await screen.findByText(/Your password has been reset/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
  });

  it("rejects mismatched passwords without calling the API", async () => {
    renderPage();

    fillPasswords("Fresh-password-2026!", "Different-password-2027!");
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));

    expect(await screen.findByText("The passwords do not match.")).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("shows the backend error for an invalid or expired link", async () => {
    authApi.resetPassword.mockRejectedValue(
      new Error("This password reset link is invalid or expired"),
    );
    renderPage();

    fillPasswords("Fresh-password-2026!", "Fresh-password-2026!");
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));

    await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
      "This password reset link is invalid or expired",
    );
  });

  it("reveals and hides the new password with the eye toggle", async () => {
    renderPage();

    const passwordInput = screen.getByLabelText("New password") as HTMLInputElement;
    const firstToggle = screen.getAllByRole("button", { name: "Show password" })[0];
    if (!firstToggle) throw new Error("Missing show-password toggle");
    fireEvent.click(firstToggle);
    expect(passwordInput.type).toBe("text");
    const firstHideToggle = screen.getAllByRole("button", { name: "Hide password" })[0];
    if (!firstHideToggle) throw new Error("Missing hide-password toggle");
    fireEvent.click(firstHideToggle);
    expect(passwordInput.type).toBe("password");
  });
});
