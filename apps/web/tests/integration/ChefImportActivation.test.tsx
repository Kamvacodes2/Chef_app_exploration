import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChefImportActivationPage } from "@/features/platform/ChefImportActivationPage";

const api = vi.hoisted(() => ({
  consumeChefImportActivation: vi.fn(),
  fetchPolicyStatus: vi.fn(async () => []),
  setAccountPassword: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);

const importedChef = {
  id: "chef-imported-1",
  email: "dineo@example.test",
  displayName: "Dineo Lucia Lepedi",
  roles: ["CHEF"],
  status: "ACTIVE",
  emailVerifiedAt: null,
  createdAt: "2026-09-03T07:00:00.000Z",
};

describe("ChefImportActivationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.consumeChefImportActivation.mockResolvedValue(importedChef);
  });

  it("signs the chef in with the secure link and shows the activation steps", async () => {
    render(<ChefImportActivationPage token="import-token-123" />);

    expect(api.consumeChefImportActivation).toHaveBeenCalledWith("import-token-123");
    expect(
      await screen.findByRole("heading", { name: "Your Chefmate chef account is ready." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/signed in as Dineo Lucia Lepedi/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my chef portal" })).toHaveAttribute(
      "href",
      "/chef/portal",
    );
  });

  it("reports a clear error when the token is missing", async () => {
    render(<ChefImportActivationPage token={null} />);

    expect(
      await screen.findByText("This chef activation link is missing its token."),
    ).toBeInTheDocument();
    expect(api.consumeChefImportActivation).not.toHaveBeenCalled();
  });

  it("shows a link error when consumption fails", async () => {
    api.consumeChefImportActivation.mockRejectedValue(new Error("activation_link_invalid"));

    render(<ChefImportActivationPage token="import-token-expired" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("activation_link_invalid");
  });

  it("saves the password with matching confirmation", async () => {
    api.setAccountPassword.mockResolvedValue(importedChef);

    render(<ChefImportActivationPage token="import-token-123" />);
    await screen.findByRole("heading", { name: "Your Chefmate chef account is ready." });

    fireEvent.change(screen.getByLabelText("Create password"), {
      target: { value: "a-long-secret-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "a-long-secret-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() =>
      expect(api.setAccountPassword).toHaveBeenCalledWith("a-long-secret-password-123"),
    );
    expect(
      await screen.findByText(
        /Password saved\. You can use your email and password on any device\./,
      ),
    ).toBeInTheDocument();
  });

  it("rejects mismatched passwords without calling the API", async () => {
    render(<ChefImportActivationPage token="import-token-123" />);
    await screen.findByRole("heading", { name: "Your Chefmate chef account is ready." });

    fireEvent.change(screen.getByLabelText("Create password"), {
      target: { value: "a-long-secret-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "a-different-password-456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByText("The passwords do not match.")).toBeInTheDocument();
    expect(api.setAccountPassword).not.toHaveBeenCalled();
  });

  it("reveals and hides the password with the eye toggle", async () => {
    render(<ChefImportActivationPage token="import-token-123" />);
    await screen.findByRole("heading", { name: "Your Chefmate chef account is ready." });

    const passwordInput = screen.getByLabelText("Create password") as HTMLInputElement;
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
