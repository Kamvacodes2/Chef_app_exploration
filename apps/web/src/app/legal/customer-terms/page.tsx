import Link from "next/link";

export default function CustomerTermsPage() {
  return (
    <article className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <Link href="/" className="mb-6 inline-block font-brand text-xl text-[var(--color-oxblood)]">
        ChefMate
      </Link>
      <h1 className="text-3xl font-black text-[var(--color-oxblood)]">
        Customer Terms and Conditions
      </h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-[var(--color-charcoal)]/75">
        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">1. Platform role</h2>
          <p className="mt-2">
            Chef Mate operates a technology marketplace that introduces Customers to independent
            third-party Chefs and facilitates booking, payment, safety, support, and policy
            processes. The Chef, not Chef Mate, independently performs the booked personal-chef
            service. Chef Mate remains responsible for its own platform obligations and for rights
            that Applicable Law does not permit it to exclude.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            2. Booking and confirmation
          </h2>
          <p className="mt-2">
            A request is not confirmed until an eligible Chef accepts it and the required payment or
            authorisation succeeds. Before confirmation, the displayed Chef, time, or availability
            may change. A confirmed Booking identifies the Chef, date, time, location, Services, and
            Total Price. No different Chef may perform it without your express acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">3. Price and payment</h2>
          <p className="mt-2">
            The Total Price and material inclusions are displayed before confirmation. The Services
            are meal planning, meal preparation, cooking, and related work described in the Booking;
            they do not include sourcing or purchasing ingredients. You must supply suitable
            ingredients unless the confirmed Booking expressly states another lawful arrangement.
            Chef Mate facilitates payment through the available payment provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            4. Customer cancellation
          </h2>
          <p className="mt-2">
            The following bands are maximum starting charges, not automatic fees: cancellation more
            than 24 hours before the session carries no cancellation charge and a full refund;
            cancellation between 6 and 24 hours before may carry a charge of up to 50% of the Total
            Price; and cancellation less than 6 hours before, or a Customer no-show, may carry a
            charge of up to 100%.
          </p>
          <p className="mt-3">
            Chef Mate will assess the final charge individually and it must be reasonable under
            section 17 of the Consumer Protection Act 68 of 2008. The assessment considers the
            nature of the Services, the notice given, the reasonable potential to find another
            Customer through diligent efforts, losses and costs avoided because of cancellation, and
            relevant industry practice. The applicable band is only a ceiling. No cancellation fee
            is charged where the booked beneficiary has died or is hospitalised.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            5. Chef or supplier inability to perform
          </h2>
          <p className="mt-2">
            If the confirmed Chef or Chef Mate cannot supply the agreed Services, you remain
            entitled to the full statutory monetary remedy, including prescribed interest where
            applicable. You may instead choose a reschedule, credit, or a comparable substitute, but
            a substitute is appointed only after you expressly accept that Chef. There is no silent
            Chef replacement, and declining a proposed substitute does not remove your monetary
            remedy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">6. Refund initiation</h2>
          <p className="mt-2">
            Where a monetary refund is due, Chef Mate will initiate it within five Business Days
            after the entitlement and amount are confirmed. Initiation means sending the refund
            instruction to the payment provider; it is not a promise that a bank or payment provider
            will post the funds within that period. Chef Mate will provide available transaction
            information if a posting delay must be traced.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            7. Subscription Packages, Primary Chefs, and substitutes
          </h2>
          <p className="mt-2 font-semibold text-[var(--color-charcoal)]">
            Chef Mate currently offers once-off Bookings. This section applies only if Chef Mate
            later expressly offers a Subscription Package and you choose to activate it.
          </p>
          <p className="mt-3">
            An activated fixed-term package will state its sessions, price, Primary Chef, start
            date, term, and cancellation terms. The default maximum fixed term is 24 months unless
            you expressly agree to a longer period where the CPA permits it. You may cancel a
            fixed-term package on 20 Business Days&apos; notice, subject only to a reasonable
            CPA-compliant cancellation charge assessed against value already supplied, the remaining
            term, avoided costs, and reasonable ability to reallocate capacity.
          </p>
          <p className="mt-3">
            Between 80 and 40 Business Days before expiry, Chef Mate will notify you of the expiry
            date, material changes, and any month-to-month continuation. Continuation occurs only as
            the CPA permits and on the disclosed terms. Each individual session remains subject to
            the section 17 cancellation rules in section 4. If a Primary Chef cannot perform, you
            choose between a comparable substitute you expressly accept, rescheduling, credit, or
            refund. No substitute or new Primary Chef is assigned silently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            8. Customer responsibilities
          </h2>
          <p className="mt-2">
            Provide accurate booking and contact information; a safe and reasonably usable kitchen;
            working essential utilities and appliances; ordinary cookware and utensils unless the
            Booking says otherwise; suitable ingredients; accurate access, parking, security, and
            pet information; and complete allergy and dietary disclosures. An adult must be
            reachable during the session. A Chef may stop or decline unsafe or unlawful work.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            9. Allergies, food safety, and premises
          </h2>
          <p className="mt-2">
            Disclose all known allergies, intolerances, and material dietary restrictions before
            confirmation and update the Chef promptly if circumstances change. Because Services are
            performed in your kitchen using customer-supplied ingredients and equipment, an entirely
            allergen-free environment cannot be guaranteed. The Chef must use reasonable skill,
            care, hygiene, and precautions for disclosed risks.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            10. Reviews and complaints
          </h2>
          <p className="mt-2">
            Only a participant in a Booking verified through Chef Mate records may review it.
            Reviews are governed by the{" "}
            <Link className="underline" href="/legal/review-and-ratings">
              Review and Ratings Policy
            </Link>
            . Report a service, safety, payment, privacy, or review concern under the{" "}
            <Link className="underline" href="/legal/complaints-handling">
              Complaints Handling Process
            </Link>
            . Taste preference alone does not establish a service failure where the agreed dish was
            safely and competently prepared, but it does not prevent an honest review.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            11. Liability and statutory rights
          </h2>
          <p className="mt-2">
            To the extent permitted by law, Chef Mate is not liable for indirect or consequential
            loss or for loss caused solely by an independent Chef acting outside Chef Mate&apos;s
            own fault, customer-supplied ingredients, household equipment, or unsafe premises.
            Nothing excludes or limits liability for fraud, gross negligence, death or personal
            injury where exclusion is unlawful, unsafe goods or services where statutory liability
            applies, or any non-waivable consumer, privacy, equality, or other right.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--color-charcoal)]">
            12. Policies, changes, and contact
          </h2>
          <p className="mt-2">
            These Terms operate with the{" "}
            <Link className="underline" href="/legal/platform-rules">
              Platform Rules
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/privacy">
              Privacy Policy
            </Link>
            ,{" "}
            <Link className="underline" href="/legal/complaints-handling">
              Complaints Handling Process
            </Link>
            , and{" "}
            <Link className="underline" href="/legal/review-and-ratings">
              Review and Ratings Policy
            </Link>
            . Chef Mate may change terms for future use after notice and any acceptance required by
            law. South African law applies. Contact{" "}
            <a className="underline" href="mailto:support@chefmate.co.za">
              support@chefmate.co.za
            </a>
            . Nothing requires you to use an internal process before exercising a non-waivable
            statutory, regulatory, ombud, or court remedy.
          </p>
        </section>
      </div>
    </article>
  );
}
