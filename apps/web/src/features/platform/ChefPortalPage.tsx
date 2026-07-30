"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  acceptChefOffer,
  completeChefBooking,
  declineChefOffer,
  fetchChefBookings,
  fetchChefOffers,
  fetchChefProfile,
  markChefEnRoute,
  updateChefBankDetails,
  updateChefProfile,
  type ChefBooking,
  type ChefEarning,
  type ChefOffer,
  type ChefProfile,
} from "./api/platformClient";

export function ChefPortalPage() {
  const [profile, setProfile] = useState<ChefProfile | null>(null);
  const [offers, setOffers] = useState<ChefOffer[]>([]);
  const [bookings, setBookings] = useState<ChefBooking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setBusy("load");
    setError(null);
    try {
      const [nextProfile, nextOffers, nextBookings] = await Promise.all([
        fetchChefProfile(),
        fetchChefOffers(),
        fetchChefBookings(),
      ]);
      setProfile(nextProfile);
      setOffers(nextOffers);
      setBookings(nextBookings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the chef portal.");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (name: string, action: () => Promise<void>): Promise<void> => {
    setBusy(name);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chef portal action failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run("profile", async () => {
      const updated = await updateChefProfile({
        isAvailable: formData.get("isAvailable") === "on",
        serviceArea: nullableText(formData, "serviceArea"),
        serviceAreas: splitCsv(text(formData, "serviceAreas")),
        bio: nullableText(formData, "bio"),
        latitude: null,
        longitude: null,
        maxTravelKm: Math.max(1, Number(formData.get("maxTravelKm") ?? 30)),
        availability: nullableText(formData, "availabilityNotes")
          ? { notes: nullableText(formData, "availabilityNotes") }
          : null,
      });
      setProfile(updated);
      setNotice("Chef profile and availability saved.");
    });
  };

  const saveBank = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await run("bank", async () => {
      const bankAccount = await updateChefBankDetails({
        accountHolder: text(formData, "accountHolder"),
        bankName: text(formData, "bankName"),
        branchCode: text(formData, "branchCode"),
        accountNumber: text(formData, "accountNumber"),
        accountType: nullableText(formData, "accountType"),
      });
      setProfile((current) => (current ? { ...current, bankAccount } : current));
      setNotice("Bank details saved. Only the masked account preview is shown here.");
    });
  };

  const accept = (offer: ChefOffer): void => {
    void run("accept-" + offer.id, async () => {
      await acceptChefOffer(offer.id);
      setNotice(
        `Job ${offer.booking.reference} accepted. Your payout is ${formatZar(offer.chefPayoutCents)}.`,
      );
      await load();
    });
  };

  const decline = (offer: ChefOffer): void => {
    void run("decline-" + offer.id, async () => {
      await declineChefOffer(offer.id);
      setNotice(`Job ${offer.booking.reference} declined.`);
      await load();
    });
  };

  const enRoute = (booking: ChefBooking): void => {
    void run("en-route-" + booking.id, async () => {
      await markChefEnRoute(booking.id, null);
      setNotice(`Marked ${booking.reference} as en route.`);
      await load();
    });
  };

  const complete = (booking: ChefBooking): void => {
    void run("complete-" + booking.id, async () => {
      const completed = await completeChefBooking(booking.id, null);
      setNotice(earnedMessage(completed.earning, completed.surveysIssued));
      await load();
    });
  };

  return (
    <main className="bg-[var(--color-warm-cream)] px-4 py-10 text-[var(--color-charcoal)] sm:px-6">
      <section className="mx-auto max-w-[1180px]">
        <div className="rounded-3xl bg-[var(--color-oxblood)] p-8 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Chef portal</p>
          <h1 className="mt-3 text-4xl font-black">Your ChefMate workbench.</h1>
          <p className="mt-3 max-w-3xl text-white/75">
            Manage profile, banking, availability, incoming job offers, and active sessions. Offer
            cards show only the Rand value you receive.
          </p>
        </div>

        {busy === "load" ? <Status tone="neutral">Loading chef portal...</Status> : null}
        {notice ? <Status tone="success">{notice}</Status> : null}
        {error ? <Status tone="error">{error}</Status> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Panel title="Incoming session offers">
            {offers.length === 0 ? <Empty>No incoming offers right now.</Empty> : null}
            {offers.map((offer) => (
              <article
                className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
                key={offer.id}
              >
                <h3 className="text-xl font-black">{offer.booking.mainName}</h3>
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                  {offer.booking.reference} · {formatDate(offer.booking.scheduledDate)} at{" "}
                  {offer.booking.timeSlot}
                  {offer.booking.serviceArea ? ` · ${offer.booking.serviceArea}` : ""}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-900">
                  You receive {formatZar(offer.chefPayoutCents)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button disabled={busy === "accept-" + offer.id} onClick={() => accept(offer)}>
                    Accept
                  </Button>
                  <Button
                    kind="secondary"
                    disabled={busy === "decline-" + offer.id}
                    onClick={() => decline(offer)}
                  >
                    Decline
                  </Button>
                </div>
              </article>
            ))}
          </Panel>

          <Panel title="Assigned bookings">
            {bookings.length === 0 ? <Empty>No active assigned bookings yet.</Empty> : null}
            {bookings.map((booking) => (
              <article
                className="mt-4 rounded-2xl border border-[var(--color-oxblood)]/10 p-5"
                key={booking.id}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-charcoal)]/50">
                  {booking.reference} · {booking.status.replaceAll("_", " ")}
                </p>
                <h3 className="mt-2 text-xl font-black">{booking.mainName}</h3>
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                  {formatDate(booking.scheduledDate)} at {booking.timeSlot} ·{" "}
                  {booking.serviceArea ?? "Area pending"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
                  {booking.estate ? `${booking.estate}, ` : ""}
                  {booking.street}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    kind="secondary"
                    disabled={
                      booking.status !== "CHEF_MATCHED" || busy === "en-route-" + booking.id
                    }
                    onClick={() => enRoute(booking)}
                  >
                    Mark en route
                  </Button>
                  <Button
                    disabled={
                      !["CHEF_MATCHED", "EN_ROUTE"].includes(booking.status) ||
                      busy === "complete-" + booking.id
                    }
                    onClick={() => complete(booking)}
                  >
                    Complete booking
                  </Button>
                </div>
              </article>
            ))}
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Profile and availability">
            <form
              className="mt-5 grid gap-4"
              key={profile?.updatedAt ?? "profile"}
              onSubmit={saveProfile}
            >
              <label className="flex items-center gap-3 text-sm font-bold">
                <input
                  defaultChecked={profile?.isAvailable ?? false}
                  name="isAvailable"
                  type="checkbox"
                />
                Available for new bookings
              </label>
              <Input
                label="Primary service area"
                name="serviceArea"
                defaultValue={profile?.serviceArea ?? ""}
              />
              <Input
                label="Service areas"
                name="serviceAreas"
                defaultValue={(profile?.serviceAreas ?? []).join(", ")}
              />
              <Input
                label="Max travel distance (km)"
                min={1}
                name="maxTravelKm"
                type="number"
                defaultValue={profile?.maxTravelKm ?? 30}
              />
              <TextArea label="Bio" name="bio" defaultValue={profile?.bio ?? ""} />
              <TextArea
                label="Availability notes"
                name="availabilityNotes"
                defaultValue={profile?.availability ? String(profile.availability.notes ?? "") : ""}
              />
              <Button disabled={busy === "profile"} submit>
                Save profile
              </Button>
            </form>
          </Panel>

          <Panel title="Bank details">
            {profile?.bankAccount ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                Current payout account: {profile.bankAccount.bankName} ending{" "}
                {profile.bankAccount.accountNumberLast4}
              </p>
            ) : null}
            <form
              className="mt-5 grid gap-4"
              key={profile?.bankAccount?.updatedAt ?? "bank"}
              onSubmit={saveBank}
            >
              <Input
                label="Account holder"
                name="accountHolder"
                defaultValue={profile?.bankAccount?.accountHolder ?? ""}
                required
              />
              <Input
                label="Bank name"
                name="bankName"
                defaultValue={profile?.bankAccount?.bankName ?? ""}
                required
              />
              <Input
                label="Branch code"
                name="branchCode"
                defaultValue={profile?.bankAccount?.branchCode ?? ""}
                required
              />
              <Input label="Account number" name="accountNumber" required />
              <Input
                label="Account type"
                name="accountType"
                defaultValue={profile?.bankAccount?.accountType ?? ""}
              />
              <Button disabled={busy === "bank"} submit>
                Save bank details
              </Button>
            </form>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({ children, title }: { readonly children: ReactNode; readonly title: string }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
      <h2 className="text-2xl font-black text-[var(--color-oxblood)]">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { readonly children: string }) {
  return (
    <p className="mt-4 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
      {children}
    </p>
  );
}

function Status({
  children,
  tone,
}: {
  readonly children: string;
  readonly tone: "neutral" | "success" | "error";
}) {
  const className = {
    neutral: "bg-white text-[var(--color-charcoal)]/75",
    success: "bg-emerald-50 text-emerald-900",
    error: "bg-red-50 text-red-900",
  }[tone];
  return (
    <p
      className={`mt-5 rounded-2xl p-4 text-sm font-semibold ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

interface InputProps {
  readonly label: string;
  readonly name: string;
  readonly defaultValue?: string | number;
  readonly type?: string;
  readonly min?: number;
  readonly required?: boolean;
}

function Input({ label, name, defaultValue, type = "text", min, required = false }: InputProps) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 text-base"
        defaultValue={defaultValue}
        min={min}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  readonly label: string;
  readonly name: string;
  readonly defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <textarea
        className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--color-oxblood)]/15 px-4 py-3 text-base"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

function Button({
  children,
  disabled = false,
  kind = "primary",
  onClick,
  submit = false,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly kind?: "primary" | "secondary";
  readonly onClick?: () => void;
  readonly submit?: boolean;
}) {
  const className =
    kind === "primary"
      ? "bg-[var(--color-oxblood)] text-white"
      : "border border-[var(--color-oxblood)]/20 text-[var(--color-oxblood)]";
  return (
    <button
      className={`min-h-10 rounded-xl px-4 text-sm font-bold disabled:opacity-50 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={submit ? "submit" : "button"}
    >
      {children}
    </button>
  );
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, name: string): string | null {
  const value = text(formData, name);
  return value ? value : null;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value));
}

function earnedMessage(earning: ChefEarning, surveysIssued: number): string {
  return `Booking complete. You earned ${formatZar(earning.chefPayoutCents)}. ${surveysIssued} survey invitation${surveysIssued === 1 ? "" : "s"} queued.`;
}
