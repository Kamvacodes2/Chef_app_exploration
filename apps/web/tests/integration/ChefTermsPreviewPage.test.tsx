import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChefTermsPreviewPage from "@/app/legal/chef-terms-preview/page";
import { SiteFooter } from "@/components/layout/SiteFooter";

const EXPECTED_CONTENTS = [
  ["introduction", "Introduction"],
  ["consumer-protection-notice", "Consumer Protection Notice"],
  ["definitions", "Definitions and Interpretation"],
  ["relationship", "Nature of the Relationship"],
  ["platform-access", "Platform Access"],
  ["booking-process", "Booking Process"],
  ["pricing-model", "Pricing Model"],
  ["payment", "Payment"],
  ["cancellations", "Cancellations and Refunds"],
  ["professional-standards", "Professional Standards"],
  ["ratings", "Ratings and Review"],
  ["data-protection", "Data Protection"],
  ["insurance", "Insurance"],
  ["liability", "Limitation of Liability"],
  ["indemnities", "Indemnities"],
  ["non-circumvention", "Non-Circumvention"],
  ["suspension", "Suspension and Termination"],
  ["complaints", "Complaints Handling"],
  ["taxes", "Taxes"],
  ["general", "General"],
] as const;

function getTermsSection(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 2, name });
  const section = heading.closest("section");

  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe("ChefTermsPreviewPage", () => {
  it("presents the draft as non-binding and exposes no acceptance controls", () => {
    const { container } = render(<ChefTermsPreviewPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms and Conditions for Chefs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Draft preview — not in force")).toBeInTheDocument();

    const reviewNotice = screen.getByText(/Version under review: 2026-08-18/);
    expect(reviewNotice).toHaveTextContent("provided for product and legal review only");
    expect(reviewNotice).toHaveTextContent(
      "It does not replace the current Chef Service Provider Agreement",
    );
    expect(reviewNotice).toHaveTextContent("no acceptance of this draft is being collected");
    expect(
      screen.getByText(
        /This preview is intentionally excluded from policy acceptance until all activation blockers above are closed/,
      ),
    ).toBeInTheDocument();

    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept|agree|confirm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /accept|agree|confirm/i })).not.toBeInTheDocument();
  });

  it("keeps all 20 numbered sections addressable from the contents", () => {
    render(<ChefTermsPreviewPage />);

    const contents = screen.getByRole("navigation", { name: "Terms contents" });
    expect(within(contents).getAllByRole("link")).toHaveLength(EXPECTED_CONTENTS.length);

    EXPECTED_CONTENTS.forEach(([id, title], index) => {
      expect(within(contents).getByRole("link", { name: title })).toHaveAttribute("href", `#${id}`);
      expect(getTermsSection(`${index + 1}. ${title}`)).toHaveAttribute("id", id);
    });
  });

  it("retains the consumer warning and the critical liability and indemnity terms", () => {
    render(<ChefTermsPreviewPage />);

    const consumerNotice = getTermsSection("2. Consumer Protection Notice");
    expect(consumerNotice).toHaveTextContent("limit or exclude our risk or liability");
    expect(consumerNotice).toHaveTextContent(
      "limit or exclude your rights and remedies against us",
    );
    expect(consumerNotice).toHaveTextContent("Applicable Laws prevail");

    const liability = getTermsSection("14. Limitation of Liability");
    expect(liability).toHaveTextContent(
      "not liable for indirect, incidental, special, consequential, or punitive damages",
    );
    expect(liability).toHaveTextContent(
      "Nothing excludes or limits liability that cannot be excluded or limited under Applicable Laws, including the CPA",
    );

    const indemnities = getTermsSection("15. Indemnities");
    expect(indemnities).toHaveTextContent("You indemnify and hold harmless Chef Mate");
    expect(indemnities).toHaveTextContent(
      "personal injury, illness, property damage, allergic reactions, or food contamination",
    );
    expect(indemnities).toHaveTextContent("This indemnity survives termination");
  });

  it("lists every unresolved activation blocker before the draft can become binding", () => {
    render(<ChefTermsPreviewPage />);

    const blockers = getTermsSection("Activation blockers");
    expect(blockers).toHaveTextContent(
      "These items must be resolved before this draft can become a binding policy",
    );
    expect(within(blockers).getAllByRole("listitem")).toHaveLength(8);

    const blockerContracts = [
      /15-minute chef-offer window/,
      /legal and commercial approval is still required/,
      /no automated weekly settlement job exists/,
      /must not be activated first/,
      /not implemented and must be reconciled with the current Customer Terms/,
      /not yet enforced by the application workflow/,
      /not all published as separate legal pages yet/,
      /Immutable acceptance history, audience rules, server-owned versions, and enforcement are required before launch/,
    ];

    blockerContracts.forEach((contract) => {
      expect(within(blockers).getByText(contract, { selector: "li" })).toBeInTheDocument();
    });
  });
});

describe("Chef terms draft discoverability", () => {
  it("links the site footer draft label to the preview route", () => {
    render(<SiteFooter />);

    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", { name: "Chef Terms Draft" }),
    ).toHaveAttribute("href", "/legal/chef-terms-preview");
  });
});
