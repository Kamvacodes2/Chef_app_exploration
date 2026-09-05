import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";

const authApi = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("@/features/auth/api/authClient", () => authApi);

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests a reset link and confirms without leaking account existence", async () => {
    authApi.requestPasswordReset.mockResolvedValue(undefined);
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "chef@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() =>
      expect(authApi.requestPasswordReset).toHaveBeenCalledWith("chef@example.test"),
    );
    expect(
      await screen.findByText(/If an account exists for that email address/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows backend errors when the request fails", async () => {
    authApi.requestPasswordReset.mockRejectedValue(new Error("Chefmate is unavailable."));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "chef@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await expect(screen.findByRole("alert")).resolves.toHaveTextContent("Chefmate is unavailable.");
    expect(authApi.requestPasswordReset).toHaveBeenCalledTimes(1);
  });
});
