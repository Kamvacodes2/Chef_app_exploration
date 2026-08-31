import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ComplaintsHandlingPage from "@/app/legal/complaints-handling/page";
import CustomerTermsPage from "@/app/legal/customer-terms/page";
import PlatformRulesPage from "@/app/legal/platform-rules/page";
import PrivacyPage from "@/app/legal/privacy/page";
import ReviewAndRatingsPage from "@/app/legal/review-and-ratings/page";
import { SiteFooter } from "@/components/layout/SiteFooter";

describe("published companion policies", () => {
  it("publishes customer cancellation and supplier-failure rights as the active Customer Terms", () => {
    render(<CustomerTermsPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Customer Terms and Conditions",
    );
    expect(screen.queryByText(/Version 2026-08-19/)).not.toBeInTheDocument();
    expect(sectionFor("4. Customer cancellation")).toHaveTextContent(
      "The applicable band is only a ceiling",
    );
    expect(sectionFor("4. Customer cancellation")).toHaveTextContent(
      "assess the final charge individually",
    );
    expect(sectionFor("5. Chef or supplier inability to perform")).toHaveTextContent(
      "full statutory monetary remedy",
    );
    expect(sectionFor("5. Chef or supplier inability to perform")).toHaveTextContent(
      "only after you expressly accept that Chef",
    );
  });

  it("publishes purpose-specific HURU consent, special-information handling, and human review", () => {
    render(<PrivacyPage />);

    expect(screen.queryByText(/Version 2026-08-19/)).not.toBeInTheDocument();
    const huru = sectionFor("4. HURU/Afiswitch criminal background checks");
    expect(huru).toHaveTextContent("affirmative, purpose-specific consent");
    expect(huru).toHaveTextContent(
      "general acceptance of this policy is not treated as that consent",
    );
    expect(huru).toHaveTextContent("special personal information under POPIA");
    expect(huru).toHaveTextContent(
      "does not reject, suspend, or terminate a person solely through automated processing",
    );
  });

  it.each([
    {
      Page: PlatformRulesPage,
      heading: "Platform Rules",
      section: "8. Proportionate manual enforcement",
      contract: "Decisions are made by people",
    },
    {
      Page: ComplaintsHandlingPage,
      heading: "Complaints Handling Process",
      section: "8. Internal review",
      contract: "someone not responsible for the original outcome",
    },
    {
      Page: ReviewAndRatingsPage,
      heading: "Review and Ratings Policy",
      section: "2. Verified-booking eligibility",
      contract: "Booking that Chef Mate can verify from platform records",
    },
  ])("publishes the active $heading companion contract", ({ Page, heading, section, contract }) => {
    render(<Page />);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.queryByText(/Version 2026-08-19/)).not.toBeInTheDocument();
    expect(sectionFor(section)).toHaveTextContent(contract);
  });
});

describe("SiteFooter legal and social destinations", () => {
  it("contains one canonical Chef Terms link and every published companion policy", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");

    const chefTerms = within(footer).getAllByRole("link", { name: "Chef Terms" });
    expect(chefTerms).toHaveLength(1);
    expect(chefTerms[0]).toHaveAttribute("href", "/legal/chef-agreement");

    const links = [
      ["Code of Conduct", "/legal/code-of-conduct"],
      ["Customer Terms", "/legal/customer-terms"],
      ["Platform Rules", "/legal/platform-rules"],
      ["Complaints", "/legal/complaints-handling"],
      ["Reviews and Ratings", "/legal/review-and-ratings"],
      ["Privacy", "/legal/privacy"],
      ["Website Terms", "/legal/terms"],
    ] as const;
    links.forEach(([name, href]) => {
      expect(within(footer).getByRole("link", { name })).toHaveAttribute("href", href);
    });
    expect(within(footer).queryByRole("link", { name: /draft|preview/i })).not.toBeInTheDocument();
  });

  it("renders no Chef verification disclosure banner while keeping the Privacy policy link", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).queryByRole("region", { name: "Chef verification" }),
    ).not.toBeInTheDocument();
    expect(
      within(footer).queryByRole("heading", { name: "Chef verification" }),
    ).not.toBeInTheDocument();
    expect(
      within(footer).queryByRole("link", { name: "How we handle verification data" }),
    ).not.toBeInTheDocument();
    expect(within(footer).queryByText(/HURU\/Afiswitch/)).not.toBeInTheDocument();

    expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("exposes the exact Instagram and TikTok destinations as labelled icon links", () => {
    render(<SiteFooter />);
    const instagram = screen.getByRole("link", { name: "ChefMate on Instagram" });
    const tiktok = screen.getByRole("link", { name: "ChefMate on TikTok" });

    expect(instagram).toHaveAttribute(
      "href",
      "https://www.instagram.com/chefmateza?igsh=dndsblwkxaTg3bGo3",
    );
    expect(tiktok).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@chef.mate.za?_r=1&_t=ZS-98iVM9J3ZVB",
    );
    [instagram, tiktok].forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.querySelector("svg")).toBeInTheDocument();
    });
  });
});

function sectionFor(name: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name }).closest("section");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}
