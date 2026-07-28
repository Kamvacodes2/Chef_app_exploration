import Image from "next/image";
import type { ReactElement } from "react";
import { CHEFMATE_PLANS } from "@/features/plans/planCatalog";

const TIER_STYLES = {
  Bronze: "bg-[#b76835]/90 text-white",
  Silver: "bg-[#c1b9ad]/90 text-white",
  Gold: "bg-[#d7aa24]/95 text-white",
  Platinum: "bg-[#b5aaa0]/90 text-white",
} as const;

interface TierIconProps {
  readonly tier: keyof typeof TIER_STYLES;
}

function TierIcon({ tier }: TierIconProps): ReactElement {
  if (tier === "Gold") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="M3.4 12.8h9.2l.7-6.7-3.2 2.2L8 3.1 5.9 8.3 2.7 6.1l.7 6.7Zm-.1 1.2h9.4a.8.8 0 0 1 0 1.6H3.3a.8.8 0 0 1 0-1.6Z" />
      </svg>
    );
  }

  if (tier === "Silver") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
        <path d="m8 1.8 1.7 3.5 3.9.6-2.8 2.7.7 3.9L8 10.7l-3.5 1.8.7-3.9-2.8-2.7 3.9-.6L8 1.8Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
      <path d="M5 2h6l3 4-6 8-6-8 3-4Zm.7 1.3L4.2 6h7.6l-1.5-2.7H5.7Zm-1.2 4 3 4V7.3h-3Zm4 4 3-4h-3v4Z" />
    </svg>
  );
}

export function PricingPlans(): ReactElement {
  return (
    <section
      id="plans"
      className="bg-[var(--color-warm-white)] py-14 sm:py-18 lg:py-20"
      aria-labelledby="plans-heading"
      data-testid="pricing-plans"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 id="plans-heading" className="font-display text-4xl leading-tight text-[var(--color-oxblood)] sm:text-5xl">
            Choose your Chefmate
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--color-charcoal)]/72">
            Flexible ways to get dinner handled.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHEFMATE_PLANS.map((plan) => (
            <div key={plan.id} className="relative pt-6">
              {plan.savings ? (
                <span className="absolute left-1/2 top-0 z-20 inline-flex min-h-7 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-white px-4 text-xs font-extrabold text-[var(--color-charcoal)] shadow-md ring-1 ring-black/5">
                  {plan.savings}
                </span>
              ) : null}
              <a
                href={`#order-flow?plan=${plan.id}`}
                className="group relative flex min-h-[390px] overflow-hidden rounded-lg bg-[var(--color-oxblood)] p-4 text-left text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:min-h-[420px]"
                data-testid="pricing-plan-card"
                data-order-plan-id={plan.id}
              >
                <Image
                  src={plan.image}
                  alt={plan.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-0" style={{ background: plan.overlay }} aria-hidden />
                <span className={`absolute right-4 top-4 z-10 inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold shadow-sm backdrop-blur-sm ${TIER_STYLES[plan.tier]}`}>
                  <TierIcon tier={plan.tier} />
                  {plan.tier}
                </span>
                {plan.featured ? (
                  <span className="absolute right-4 top-12 z-10 inline-flex min-h-7 items-center rounded-full bg-[var(--color-oxblood)] px-3 text-xs font-bold text-white shadow-sm">
                    Most popular
                  </span>
                ) : null}
                <span
                  className="relative -mx-4 -mb-4 mt-auto block px-4 pb-5 pt-20"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 0%, rgba(86, 27, 24, 0.64) 36%, rgba(86, 27, 24, 0.96) 66%, rgba(86, 27, 24, 0.99) 100%)",
                  }}
                >
                  <span className="inline-flex min-h-8 items-center rounded-full bg-[var(--color-warm-cream)]/92 px-3 text-xs font-bold text-[var(--color-oxblood)]">
                    {plan.sessions}
                  </span>
                  <span className="mt-3 block font-display text-2xl leading-none sm:text-[1.7rem]">{plan.name}</span>
                  <span className="mt-2 block text-base font-bold leading-6 sm:text-lg">{plan.price}</span>
                  <span className="mt-2 block text-sm leading-5 text-white/90">{plan.description}</span>
                </span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}