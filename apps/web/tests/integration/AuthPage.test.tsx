import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "@/features/auth/AuthPage";

const authApi = vi.hoisted(() => ({
  createCustomerAccount: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@/features/auth/api/authClient", () => authApi);

const customer = {
  id: "customer-1",
  email: "customer@example.test",
  displayName: "Test Customer",
  roles: ["CUSTOMER"],
  status: "ACTIVE",
  emailVerifiedAt: null,
  createdAt: "2026-07-30T10:00:00.000Z",
};

const admin = {
  ...customer,
  id: "admin-1",
  email: "admin@example.test",
  displayName: "Test Admin",
  roles: ["ADMIN"],
};

const chef = {
  ...customer,
  id: "chef-1",
  email: "chef@example.test",
  displayName: "Test Chef",
  roles: ["CHEF"],
};

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("signs in returning customers and offers a booking deep link", async () => {
    authApi.signIn.mockResolvedValue(customer);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: customer.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "A-strong-password-2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await expect(screen.findByRole("status")).resolves.toHaveTextContent(
      "Signed in as Test Customer.",
    );
    expect(screen.getByRole("link", { name: "Book a chef" })).toHaveAttribute(
      "href",
      "/#order-flow",
    );
    expect(authApi.signIn).toHaveBeenCalledWith({
      email: customer.email,
      password: "A-strong-password-2026",
    });
    expect(authApi.createCustomerAccount).not.toHaveBeenCalled();
  });

  it("signs in admins and offers a link to the admin dashboard", async () => {
    authApi.signIn.mockResolvedValue(admin);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: admin.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "A-strong-password-2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await expect(screen.findByRole("status")).resolves.toHaveTextContent(
      "Signed in as Test Admin.",
    );
    expect(screen.getByRole("link", { name: "Go to admin dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();
  });

  it("signs in chefs and offers a link to the chef portal", async () => {
    authApi.signIn.mockResolvedValue(chef);
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: chef.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "A-strong-password-2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await expect(screen.findByRole("status")).resolves.toHaveTextContent("Signed in as Test Chef.");
    expect(screen.getByRole("link", { name: "Go to chef portal" })).toHaveAttribute(
      "href",
      "/chef/portal",
    );
    expect(screen.queryByRole("link", { name: "Book a chef" })).not.toBeInTheDocument();
  });

  it("creates customer accounts through the backend auth client", async () => {
    authApi.createCustomerAccount.mockResolvedValue(customer);
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: customer.displayName },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: customer.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "A-strong-password-2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(authApi.createCustomerAccount).toHaveBeenCalledWith({
        displayName: customer.displayName,
        email: customer.email,
        password: "A-strong-password-2026",
      }),
    );
    await expect(screen.findByRole("status")).resolves.toHaveTextContent(
      "Signed in as Test Customer.",
    );
  });

  it("shows useful backend auth errors", async () => {
    authApi.signIn.mockRejectedValue(new Error("Invalid email or password."));
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: customer.email },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
      "Invalid email or password.",
    );
  });
});
