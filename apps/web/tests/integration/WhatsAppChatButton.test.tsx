import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsAppChatButton } from "@/features/landing/WhatsAppChatButton";

const originalEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

beforeEach(() => {
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "27610783057";
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  if (originalEnv === undefined) {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  } else {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = originalEnv;
  }
});

function stubWindowOpen(): ReturnType<typeof vi.fn> {
  const open = vi.fn();
  vi.stubGlobal("open", open);
  return open;
}

describe("WhatsAppChatButton", () => {
  it("renders the floating button and opens the quick-question panel", async () => {
    const user = userEvent.setup();
    render(<WhatsAppChatButton />);
    await user.click(screen.getByRole("button", { name: /chat with chefmate on whatsapp/i }));
    expect(screen.getByText(/questions before you book\?/i)).toBeInTheDocument();
    expect(screen.getByText(/how does pricing work\?/i)).toBeInTheDocument();
    expect(screen.getByText(/which areas do you cover\?/i)).toBeInTheDocument();
  });

  it("opens WhatsApp with a prefilled quick question", async () => {
    const user = userEvent.setup();
    const open = stubWindowOpen();
    render(<WhatsAppChatButton />);
    await user.click(screen.getByRole("button", { name: /chat with chefmate on whatsapp/i }));
    await user.click(screen.getByText(/how does pricing work\?/i));
    expect(open).toHaveBeenCalledTimes(1);
    const [url] = open.mock.calls[0] as [string];
    expect(url).toContain("https://wa.me/27610783057");
    expect(url).toContain(encodeURIComponent("Hi Chefmate! How does your pricing work?"));
  });

  it("opens WhatsApp with a generic greeting from the freeform CTA", async () => {
    const user = userEvent.setup();
    const open = stubWindowOpen();
    render(<WhatsAppChatButton />);
    await user.click(screen.getByRole("button", { name: /chat with chefmate on whatsapp/i }));
    await user.click(screen.getByText(/write your own message on whatsapp/i));
    expect(open).toHaveBeenCalledTimes(1);
    const [url] = open.mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent("Hi Chefmate! I have a question before I book."));
  });

  it("falls back to the default number when the env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    const user = userEvent.setup();
    const open = stubWindowOpen();
    render(<WhatsAppChatButton />);
    await user.click(screen.getByRole("button", { name: /chat with chefmate on whatsapp/i }));
    await user.click(screen.getByText(/how do i book a chef\?/i));
    const [url] = open.mock.calls[0] as [string];
    expect(url).toContain("https://wa.me/27610783057");
  });
});
