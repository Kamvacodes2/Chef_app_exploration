"use client";

import { useState } from "react";
import type { ReactElement } from "react";

/**
 * Floating WhatsApp button for prospects who want to ask a question before
 * committing. Opens WhatsApp (wa.me deep link) with a prefilled message —
 * no Meta Cloud API or extra service required; replies land on the
 * Chefmate WhatsApp Business number.
 *
 * The number comes from NEXT_PUBLIC_WHATSAPP_NUMBER (E.164 digits, no "+")
 * so it can be swapped without a rebuild of this component; the fallback is
 * the Chefmate WhatsApp Business number.
 */
const WHATSAPP_NUMBER_FALLBACK = "27610783057";

const WHATSAPP_GREEN = "#25D366";

const GENERIC_GREETING = "Hi Chefmate! I have a question before I book.";

const QUICK_QUESTIONS = [
  {
    label: "How does pricing work?",
    message: "Hi Chefmate! How does your pricing work?",
  },
  {
    label: "Which areas do you cover?",
    message: "Hi Chefmate! Which areas do you cover?",
  },
  {
    label: "How do I book a chef?",
    message: "Hi Chefmate! How do I book a chef?",
  },
  {
    label: "What meals can chefs make?",
    message: "Hi Chefmate! What kind of meals can your chefs prepare?",
  },
] as const;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function whatsappNumber(): string {
  const configured = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const digits = digitsOnly(configured ?? "");
  return digits.length >= 8 ? digits : WHATSAPP_NUMBER_FALLBACK;
}

function waLink(message: string): string {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
}

function openWhatsApp(message: string): void {
  window.open(waLink(message), "_blank", "noopener,noreferrer");
}

export function WhatsAppChatButton(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {open ? (
        <div
          aria-label="Chat with Chefmate on WhatsApp"
          className="mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-charcoal)]/10 bg-[var(--color-warm-cream)] p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-[var(--color-charcoal)]">
                Questions before you book?
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/70">
                Chat with us on WhatsApp — tap a question or write your own.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp chat options"
              className="min-h-8 min-w-8 rounded-full text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-charcoal)]/10 hover:text-[var(--color-charcoal)]"
            >
              ✕
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {QUICK_QUESTIONS.map((question) => (
              <li key={question.label}>
                <button
                  type="button"
                  onClick={() => openWhatsApp(question.message)}
                  className="min-h-10 w-full rounded-xl border border-[var(--color-oxblood)]/15 bg-white px-3 py-2 text-left text-sm font-semibold text-[var(--color-oxblood)] transition hover:border-[var(--color-oxblood)]/40 hover:bg-[var(--color-oxblood)]/5"
                >
                  {question.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => openWhatsApp(GENERIC_GREETING)}
            className="mt-3 min-h-10 w-full rounded-xl bg-[var(--color-oxblood)] px-3 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-oxblood)]/90"
          >
            Write your own message on WhatsApp
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Chat with Chefmate on WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-oxblood)]"
        style={{ backgroundColor: WHATSAPP_GREEN }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="white" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </button>
    </div>
  );
}
