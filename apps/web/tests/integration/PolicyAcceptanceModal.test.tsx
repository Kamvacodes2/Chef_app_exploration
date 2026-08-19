import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PolicyAcceptanceModal } from "@/components/ui/PolicyAcceptanceModal";
import type { PolicyStatusItem } from "@/features/platform/api/platformClient";

const api = vi.hoisted(() => ({
  acceptPolicy: vi.fn(),
}));

vi.mock("@/features/platform/api/platformClient", () => api);

const chefTerms: PolicyStatusItem = {
  policyKey: "CHEF_TERMS",
  title: "Chef Terms",
  documentPath: "/legal/chef-agreement",
  requiredVersion: "2026-08-18",
  effectiveAt: "2026-08-18T00:00:00.000Z",
  required: true,
  accepted: false,
  stale: true,
  acceptedVersion: "2026-08-09",
  acceptedAt: "2026-08-10T09:30:00.000Z",
};

const codeOfConduct: PolicyStatusItem = {
  policyKey: "CHEF_CODE_OF_CONDUCT",
  title: "Chef Code of Conduct",
  documentPath: "/legal/code-of-conduct",
  requiredVersion: "2026-08-09",
  effectiveAt: "2026-08-09T00:00:00.000Z",
  required: true,
  accepted: false,
  stale: false,
  acceptedVersion: null,
  acceptedAt: null,
};

describe("PolicyAcceptanceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.acceptPolicy.mockResolvedValue({
      id: "acceptance-1",
      userId: "chef-1",
      policyKey: "CHEF_TERMS",
      version: "2026-08-18",
      acceptedAt: "2026-08-19T12:00:00.000Z",
    });
  });

  it("presents server metadata, reacceptance context, and the canonical full-document link without duplicating legal prose", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const { unmount } = render(
      <PolicyAcceptanceModal onComplete={vi.fn()} policies={[chefTerms]} />,
    );

    const dialog = screen.getByRole("dialog", { name: "Chef Terms" });
    const heading = screen.getByRole("heading", { name: "Chef Terms" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(heading).toHaveFocus();
    expect(screen.getByText("2026-08-18")).toBeInTheDocument();
    expect(screen.getByText("This policy has been updated.")).toBeInTheDocument();
    expect(screen.getByText(/previous acceptance was for version 2026-08-09/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Chef Terms/ })).toHaveAttribute(
      "href",
      "/legal/chef-agreement",
    );
    expect(screen.getByRole("link", { name: /Open Chef Terms/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(dialog).not.toHaveTextContent("Consumer Protection Notice");
    expect(dialog).not.toHaveTextContent("Limitation of Liability");

    const acknowledgement = screen.getByRole("checkbox", { name: /I acknowledge/ });
    expect(acknowledgement).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Accept version 2026-08-18" })).toBeDisabled();

    unmount();
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("requires an explicit acknowledgement for each policy and accepts pending documents sequentially", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<PolicyAcceptanceModal onComplete={onComplete} policies={[chefTerms, codeOfConduct]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /accept Chef Terms version 2026-08-18/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Accept version 2026-08-18" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Accept version 2026-08-18" }));

    await expect(
      screen.findByRole("heading", { name: "Chef Code of Conduct" }),
    ).resolves.toBeInTheDocument();
    expect(api.acceptPolicy).toHaveBeenNthCalledWith(1, "CHEF_TERMS", "2026-08-18");
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: /accept Chef Code of Conduct/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Accept version 2026-08-09" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /accept Chef Code of Conduct/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Accept version 2026-08-09" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Accept version 2026-08-09" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(api.acceptPolicy).toHaveBeenNthCalledWith(2, "CHEF_CODE_OF_CONDUCT", "2026-08-09");
    expect(screen.getByRole("heading", { name: "Confirming policy status" })).toBeInTheDocument();
  });

  it("serializes acceptance, exposes saving state, and keeps the policy actionable after an API error", async () => {
    const acceptance = deferred<unknown>();
    api.acceptPolicy.mockReturnValueOnce(acceptance.promise);
    render(<PolicyAcceptanceModal onComplete={vi.fn()} policies={[chefTerms]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /accept Chef Terms/ }));
    fireEvent.click(screen.getByRole("button", { name: "Accept version 2026-08-18" }));

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Saving your acceptance");
    expect(screen.getByRole("button", { name: "Please wait..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Please wait..." }));
    expect(api.acceptPolicy).toHaveBeenCalledTimes(1);

    acceptance.reject(new Error("Required policy version changed"));

    await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
      "Required policy version changed",
    );
    expect(screen.getByRole("heading", { name: "Chef Terms" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept version 2026-08-18" })).toBeEnabled();
  });

  it("cannot be dismissed in required mode while logout remains available", () => {
    const onClose = vi.fn();
    const onLeave = vi.fn();
    render(
      <PolicyAcceptanceModal
        mode="required"
        onClose={onClose}
        onComplete={vi.fn()}
        onLeave={onLeave}
        policies={[chefTerms]}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(screen.queryByRole("button", { name: "Close policy review" })).not.toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Log out and leave the Chef Portal" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("supports close button, Escape, backdrop, and trapped reverse focus only in optional mode", () => {
    const onClose = vi.fn();
    render(
      <PolicyAcceptanceModal
        mode="optional"
        onClose={onClose}
        onComplete={vi.fn()}
        policies={[chefTerms]}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close policy review" });
    const acknowledgement = screen.getByRole("checkbox", { name: /I acknowledge/ });
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(acknowledgement).toHaveFocus();

    fireEvent.click(close);
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
