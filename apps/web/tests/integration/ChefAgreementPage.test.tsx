import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChefAgreementPage from "@/app/legal/chef-agreement/page";

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

describe("canonical Chef Agreement", () => {
  it("publishes version 2026-08-18 as binding terms without preview or blocker copy", () => {
    const { container } = render(<ChefAgreementPage />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Terms and Conditions for Chefs",
    });
    const header = heading.closest("header");

    expect(header).toHaveTextContent("Binding terms");
    expect(header).toHaveTextContent("Version 2026-08-18 · Effective 18 August 2026");
    expect(header).toHaveTextContent("These binding Terms govern every Chef's access");
    expect(container).not.toHaveTextContent(/draft|preview|activation blocker/i);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept|agree|confirm/i })).not.toBeInTheDocument();
  });

  it("keeps exactly 20 numbered sections addressable from the contents", () => {
    const { container } = render(<ChefAgreementPage />);
    const contents = screen.getByRole("navigation", { name: "Terms contents" });

    expect(within(contents).getAllByRole("link")).toHaveLength(20);
    expect(container.querySelectorAll("article > div > section")).toHaveLength(20);
    EXPECTED_CONTENTS.forEach(([id, title], index) => {
      expect(within(contents).getByRole("link", { name: title })).toHaveAttribute("href", `#${id}`);
      expect(getTermsSection(`${index + 1}. ${title}`)).toHaveAttribute("id", id);
    });
  });

  it("retains the conspicuous consumer, HURU, liability, indemnity, and reacceptance protections", () => {
    render(<ChefAgreementPage />);

    expect(getTermsSection("2. Consumer Protection Notice")).toHaveTextContent(
      "limit or exclude your rights and remedies against us",
    );
    const access = getTermsSection("5. Platform Access");
    expect(access).toHaveTextContent(
      "only after obtaining your affirmative, purpose-specific consent",
    );
    expect(access).toHaveTextContent(
      "No rejection, suspension, or termination is made solely by automated processing",
    );
    expect(getTermsSection("14. Limitation of Liability")).toHaveTextContent(
      "Nothing excludes or limits liability that cannot be excluded or limited under Applicable Laws, including the CPA",
    );
    expect(getTermsSection("15. Indemnities")).toHaveTextContent(
      "personal injury, illness, property damage, allergic reactions, or food contamination",
    );
    expect(getTermsSection("20. General")).toHaveTextContent(
      "A prior version remains evidence of the terms accepted at that time but does not constitute acceptance of a newer version",
    );
  });
});
