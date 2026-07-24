import Image from "next/image";
import type { ReactElement } from "react";
import { OrderFlow } from "@/features/order-flow/OrderFlow";
import {
  CATEGORIES,
  HOW_IT_WORKS,
  LANDING_ASSETS,
  POPULAR_MEALS,
} from "./content";
import { LandingHeroCarousel } from "./LandingHeroCarousel";

function Container({ children, className = "" }: { readonly children: React.ReactNode; readonly className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-oxblood)]/75">
      {children}
    </p>
  );
}

function PrimaryLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-oxblood)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-oxblood)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
    >
      {children}
    </a>
  );
}

function HowItWorksCompact(): ReactElement {
  return (
    <section id="how-it-works" className="bg-[var(--color-warm-white)] py-14 sm:py-18 lg:py-20" aria-labelledby="how-heading">
      <Container>
        <div className="mb-7 text-center">
          <h2 id="how-heading" className="font-display text-4xl text-[var(--color-oxblood)] sm:text-5xl">
            Your evening, made simple.
          </h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="overflow-hidden rounded-[22px] border border-[var(--color-oxblood)]/12 bg-[var(--color-warm-cream)] shadow-sm">
              <div className="relative aspect-[4/3] bg-[var(--color-soft-beige)]">
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                  className="object-cover"
                  style={{ objectPosition: step.imagePosition }}
                />
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-oxblood)] font-display text-lg text-white shadow-sm">
                  {index + 1}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl leading-tight text-[var(--color-oxblood)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/72">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function PopularMealsGrid(): ReactElement {
  const mealGroups = [POPULAR_MEALS, POPULAR_MEALS] as const;

  return (
    <section id="meals" className="bg-[var(--color-warm-white)] py-14 sm:py-18 lg:py-20" aria-labelledby="popular-meals-title" data-testid="popular-meals">
      <Container>
        <div className="mb-7 text-center">
          <Eyebrow>Popular this week</Eyebrow>
          <h2 id="popular-meals-title" className="mt-3 font-display text-4xl text-[var(--color-oxblood)] sm:text-5xl">
            Real meals, cooked at home.
          </h2>
        </div>
      </Container>

      <div className="overflow-hidden" data-testid="popular-meal-loop">
        <div className="popular-meals-marquee flex w-max py-1">
          {mealGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex shrink-0 gap-4 px-2" aria-hidden={groupIndex === 1}>
              {group.map((meal) => {
                const cardClassName =
                  "group w-[245px] shrink-0 rounded-[22px] border border-[var(--color-oxblood)]/12 bg-[var(--color-warm-cream)] p-4 text-left transition hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)] sm:w-[270px]";
                const content = (
                  <>
                    <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-white">
                      <Image
                        src={meal.imageSrc}
                        alt={meal.imageAlt}
                        fill
                        loading="lazy"
                        sizes="(max-width: 767px) 245px, 270px"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="mt-4 block font-display text-xl leading-tight text-[var(--color-oxblood)]">{meal.name}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-6 text-[var(--color-charcoal)]/72">{meal.description}</span>
                  </>
                );

                if (groupIndex === 1) {
                  return (
                    <div key={`${meal.id}-loop`} className={cardClassName}>
                      {content}
                    </div>
                  );
                }

                return (
                  <a key={meal.id} href="#order-flow" className={cardClassName} data-testid="popular-meal-card">
                    {content}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Container>
        <div className="mt-6 flex justify-center">
          <PrimaryLink href="#order-flow">Explore meals</PrimaryLink>
        </div>
      </Container>
    </section>
  );
}

function KitchenTrustSection(): ReactElement {
  return (
    <section id="kitchen-trust" className="bg-[var(--color-warm-cream)] py-14 sm:py-18 lg:py-20" aria-labelledby="trust-heading">
      <Container>
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="overflow-hidden rounded-[28px] bg-[var(--color-oxblood)] text-white">
            <div className="relative aspect-[4/3]">
              <Image src={LANDING_ASSETS.groceryHandoff.src} alt={LANDING_ASSETS.groceryHandoff.alt} fill loading="lazy" sizes="(max-width: 1023px) 100vw, 38vw" className="object-cover object-center" />
            </div>
            <div className="p-7 sm:p-9">
              <h2 id="trust-heading" className="font-display text-4xl leading-tight">Turn what you already have into dinner everyone will love.</h2>
              <p className="mt-4 leading-7 text-white/78">
                Your Chefmate transforms the groceries in your kitchen into fresh, delicious meals—so less food goes to waste and dinner is taken care of.
              </p>
            </div>
          </article>
          <article className="grid overflow-hidden rounded-[28px] border border-[var(--color-oxblood)]/12 bg-[var(--color-warm-white)] sm:grid-cols-[1fr_0.86fr]">
            <div className="relative min-h-[300px]">
              <Image src={LANDING_ASSETS.chefCooking.src} alt={LANDING_ASSETS.chefCooking.alt} fill loading="lazy" sizes="(max-width: 1023px) 100vw, 38vw" className="object-cover object-center" />
            </div>
            <div className="flex flex-col justify-center p-7">
              <h3 className="font-display text-4xl leading-tight text-[var(--color-oxblood)]">Real ingredients. Cooked in your kitchen.</h3>
              <p className="mt-4 leading-7 text-[var(--color-charcoal)]/75">
                Fresh ingredients, familiar flavours and everyday meals prepared at home by someone who knows what they&apos;re doing.
              </p>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

function CategoryGrid(): ReactElement {
  return (
    <section className="bg-[var(--color-warm-white)] py-14 sm:py-18 lg:py-20" aria-labelledby="category-heading">
      <Container>
        <div className="mb-7">
          <Eyebrow>Meal categories</Eyebrow>
          <h2 id="category-heading" className="mt-3 font-display text-4xl text-[var(--color-oxblood)] sm:text-5xl">
            Choose the kind of evening you need.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <a
              key={category.title}
              href="#order-flow"
              className="group relative min-h-[260px] overflow-hidden rounded-[24px] bg-[var(--color-charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-terracotta)]"
            >
              <Image src={category.image} alt={category.alt} fill loading="lazy" sizes="(max-width: 767px) 100vw, 33vw" className="object-cover object-center transition duration-300 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 p-6 text-white">
                <span className="block font-display text-3xl">{category.title}</span>
                <span className="mt-2 block max-w-[18rem] text-sm leading-6 text-white/88">{category.body}</span>
                <span className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-white px-5 text-sm font-bold text-[var(--color-oxblood)]">
                  Explore
                </span>
              </span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCallToAction(): ReactElement {
  return (
    <section className="bg-[var(--color-warm-cream)] py-14 sm:py-18 lg:py-20" aria-labelledby="final-cta-heading">
      <Container>
        <div className="grid overflow-hidden rounded-[28px] bg-[var(--color-oxblood)] text-white lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
            <h2 id="final-cta-heading" className="font-display text-4xl leading-tight sm:text-5xl">
              Give yourself the evening back.
            </h2>
            <p className="mt-4 max-w-md leading-7 text-white/78">Book a Chefmate chef for everyday cooking in your home.</p>
            <div className="mt-7">
              <a
                href="#order-flow"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-warm-cream)] px-6 py-3 text-sm font-bold text-[var(--color-oxblood)] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Book a chef
              </a>
            </div>
          </div>
          <div className="relative min-h-[300px]">
            <Image src={LANDING_ASSETS.familyDinner.src} alt={LANDING_ASSETS.familyDinner.alt} fill loading="lazy" sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover object-center" />
          </div>
        </div>
      </Container>
    </section>
  );
}

export function LandingPage(): ReactElement {
  return (
    <main className="bg-[var(--color-warm-cream)] text-[var(--color-charcoal)]">
      <LandingHeroCarousel />
      <HowItWorksCompact />
      <PopularMealsGrid />
      <KitchenTrustSection />
      <CategoryGrid />
      <OrderFlow />
      <FinalCallToAction />
    </main>
  );
}
