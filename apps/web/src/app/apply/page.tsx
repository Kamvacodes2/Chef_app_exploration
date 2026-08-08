"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/features/hero/components/BrandMark";
import { ChefApplicationPage } from "@/features/platform/ChefApplicationPage";

export default function ApplyLandingPage() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <>
        <header className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-[1200px] items-center">
            <BrandMark onReset={() => window.location.assign("/apply")} />
          </div>
        </header>
        <ChefApplicationPage />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--color-oxblood)]/10 bg-[var(--color-warm-cream)]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center">
          <BrandMark onReset={() => window.location.assign("/apply")} />
        </div>
      </header>
      <main className="min-h-screen bg-[var(--color-warm-cream)]">
        {/* Hero */}
        <section className="bg-[var(--color-oxblood)] px-6 py-20 text-white sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
              Join ChefMate
            </p>
            <h1 className="mt-4 font-display-wide text-4xl leading-tight sm:text-5xl">
              Cook on your terms.{" "}
              <span className="text-[var(--color-maize)]">Get paid weekly.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
              Join South Africa&apos;s marketplace for independent chefs. Set your own schedule,
              cook in customers&apos; homes, and earn doing what you love.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-lg font-black text-[var(--color-oxblood)] transition-transform hover:scale-105"
              type="button"
            >
              Start Your Application
            </button>
          </div>
        </section>

        {/* Why join */}
        <section className="px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display-wide text-3xl text-[var(--color-charcoal)]">
              Why cook with ChefMate?
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  title: "You&apos;re the boss",
                  desc: "Set your own availability. Accept the bookings that work for you. No minimum hours, no mandatory shifts.",
                },
                {
                  title: "Earn what you deserve",
                  desc: "See your payout before you accept. Weekly payments. Keep 100% of your tips. Transparent, no surprises.",
                },
                {
                  title: "We&apos;ve got your back",
                  desc: "Platform-level insurance cover. Safety-first policies. Support team when you need it. Vetted customers.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]"
                >
                  <h3 className="text-xl font-black text-[var(--color-oxblood)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display-wide text-3xl text-[var(--color-charcoal)]">
              How it works
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-4">
              {[
                {
                  step: "1",
                  title: "Apply",
                  desc: "Tell us about your experience and food safety knowledge. Takes about 5 minutes.",
                },
                {
                  step: "2",
                  title: "Get verified",
                  desc: "We review your application, check references, and verify your credentials.",
                },
                {
                  step: "3",
                  title: "Set your schedule",
                  desc: "Tell us when and where you&apos;re available. You control your calendar.",
                },
                {
                  step: "4",
                  title: "Start cooking",
                  desc: "Accept bookings, cook amazing meals, and get paid weekly.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-oxblood)] text-lg font-black text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-4 font-bold text-[var(--color-charcoal)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display-wide text-3xl text-[var(--color-charcoal)]">
              What you need
            </h2>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
              {[
                "Valid SA ID or passport",
                "Food safety knowledge & certification",
                "Cooking experience (professional or serious home cook)",
                "Reliable transport to customers&apos; homes",
                "Smartphone with WhatsApp",
                "Clean background check",
              ].map((req) => (
                <div
                  key={req}
                  className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-[0_20px_60px_rgba(70,33,24,0.04)]"
                >
                  <span className="text-emerald-600">✓</span>
                  <span className="text-sm font-medium text-[var(--color-charcoal)]">{req}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[var(--color-oxblood)] px-6 py-16 text-center text-white sm:px-8">
          <h2 className="font-display-wide text-3xl">Ready to cook on your terms?</h2>
          <p className="mx-auto mt-4 max-w-md text-white/80">
            Join a growing community of independent chefs across South Africa.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 text-lg font-black text-[var(--color-oxblood)] transition-transform hover:scale-105"
            type="button"
          >
            Apply Now
          </button>
        </section>

        {/* Footer links */}
        <footer className="border-t border-[var(--color-oxblood)]/10 bg-white px-6 py-6 text-center text-xs text-[var(--color-charcoal)]/40">
          <Link href="/legal/chef-agreement" className="hover:underline">
            Chef Agreement
          </Link>
          {" · "}
          <Link href="/legal/code-of-conduct" className="hover:underline">
            Code of Conduct
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/legal/terms" className="hover:underline">
            Terms
          </Link>
          {" · "}© {new Date().getFullYear()} ChefMate
        </footer>
      </main>
    </>
  );
}
