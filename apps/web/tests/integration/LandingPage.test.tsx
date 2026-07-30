import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@/features/landing/LandingPage";

describe("LandingPage", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/");
  });

  it("keeps the kitchen trust chef image in a stable landscape frame before large layouts", () => {
    render(<LandingPage />);

    expect(screen.getByText("Real ingredients. Cooked in your kitchen.")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-trust-chef-image")).toHaveClass(
      "aspect-[4/3]",
      "lg:aspect-auto",
      "lg:min-h-[360px]",
    );
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "#order-flow",
    );
  });

  it("places the final callout image before its copy on mobile only", () => {
    render(<LandingPage />);

    const copyPanel = screen.getByRole("heading", {
      name: "Give yourself the evening back.",
    }).parentElement;
    const imagePanel = screen.getByAltText(
      "A family eating dinner at home while the Chefmate chef finishes in the kitchen",
    ).parentElement;

    expect(copyPanel).toHaveClass("max-sm:order-2");
    expect(imagePanel).toHaveClass("max-sm:order-1");
  });

  it("guides a recurring package through days and a favourite meal before the booking flow", async () => {
    render(<LandingPage />);

    const plansSection = screen.getByTestId("pricing-plans");
    const finalCallout = screen
      .getByRole("heading", { name: "Give yourself the evening back." })
      .closest("section");

    if (!finalCallout) {
      throw new Error("Expected final callout section");
    }

    expect(screen.getByRole("heading", { name: "Choose your Chefmate" })).toBeInTheDocument();
    const cards = screen.getAllByTestId("pricing-plan-card");
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      "#order-flow?plan=tonight",
      "#order-flow?plan=rhythm",
      "#order-flow?plan=family",
      "#order-flow?plan=premium",
    ]);
    expect(
      screen.getByAltText("Two people enjoying a freshly cooked meal together at home"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_tonight.jpg"));
    expect(screen.getByAltText("A customer enjoying a quiet meal at home")).toHaveAttribute(
      "src",
      expect.stringContaining("chefmate_rhythm.jpg"),
    );
    expect(
      screen.getByAltText("A family sharing a relaxed dinner together at home"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_family.jpg"));
    expect(
      screen.getByAltText("A family enjoying a generous home-cooked meal together"),
    ).toHaveAttribute("src", expect.stringContaining("chefmate_full_house.jpg"));
    expect(plansSection.compareDocumentPosition(finalCallout)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(screen.getByRole("link", { name: /chefmate family/i }));

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "plan-days");

    fireEvent.click(screen.getByRole("button", { name: /Monday/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "What would you like most often?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Oxtail Stew/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Add some sides?" })).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "sides");
  });

  it("keeps legacy full-house package links working as premium", async () => {
    render(<LandingPage />);

    const legacyLink = document.createElement("a");
    legacyLink.href = "#order-flow?plan=full-house";
    document.body.appendChild(legacyLink);
    fireEvent.click(legacyLink);
    document.body.removeChild(legacyLink);

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "plan-days");
  });
  it("takes the once-off package straight to a favourite meal", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate tonight/i }));

    expect(
      await screen.findByRole("heading", { name: "What would you like most often?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "plan-favorite");
    fireEvent.click(screen.getByRole("button", { name: /Oxtail Stew/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Add some sides?" })).toBeInTheDocument();
  });

  it("lets recurring package customers decide days and meals later", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate rhythm/i }));

    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Decide later" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "What would you like most often?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I'll choose later" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "Find what you want to eat." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "meal");
  });

  it("returns to the neutral flow when browser history leaves a package link", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: /chefmate family/i }));
    expect(
      await screen.findByRole("heading", { name: "Which days suit your household?" }),
    ).toBeInTheDocument();

    window.history.replaceState(null, "", "#plans");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(
      await screen.findByRole("heading", { name: "What are you feeding?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "goal");
  });
  it("duplicates matching meal segments so the popular-meals rail can loop seamlessly", () => {
    render(<LandingPage />);

    const rail = screen.getByTestId("popular-meal-loop").firstElementChild;
    expect(rail).toHaveClass("popular-meals-marquee");
    expect(rail?.children).toHaveLength(5);
    expect(rail?.children[1]).toHaveAttribute("aria-hidden", "true");
    expect(rail?.children[4]).toHaveAttribute("aria-hidden", "true");
  });

  it("opens sides after selecting a popular meal card", async () => {
    render(<LandingPage />);

    const firstPopularMeal = screen.getAllByTestId("popular-meal-card")[0];
    if (!firstPopularMeal) {
      throw new Error("Expected at least one popular meal card");
    }
    expect(firstPopularMeal).toHaveAttribute("data-order-meal-id", "winter-oxtail-stew");
    expect(firstPopularMeal).toHaveAttribute("href", "#order-flow?meal=winter-oxtail-stew");

    fireEvent.click(firstPopularMeal);

    expect(await screen.findByRole("heading", { name: "Add some sides?" })).toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "sides");
  });

  it("keeps regular booking calls at the goal selection", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("link", { name: "Explore meals" }));

    expect(
      await screen.findByRole("heading", { name: "What are you feeding?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Find what you want to eat." }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("order-flow")).toHaveAttribute("data-step", "goal");
  });
});
