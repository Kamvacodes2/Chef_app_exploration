"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCustomerBookings,
  modifyCustomerBooking,
  type CustomerBooking,
  type CustomerBookingStatus,
  type ModifyCustomerBookingInput,
} from "@/features/customer/api/customerBookingsClient";
import {
  fetchAvailabilityForDate,
  type AvailabilitySlot,
} from "@/features/order-flow/api/availabilityClient";

const OPEN_STATUSES: readonly CustomerBookingStatus[] = [
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
  "CHEF_MATCHED",
  "EN_ROUTE",
];

// Self-service edit/reschedule is allowed up until a chef is dispatched: once the
// chef is en route the session can no longer move without ops involvement.
const MODIFIABLE_STATUSES: readonly CustomerBookingStatus[] = [
  "REQUESTED",
  "NEEDS_REVIEW",
  "CONFIRMED",
  "AWAITING_CHEF",
];

const STATUS_LABEL: Record<CustomerBookingStatus, string> = {
  REQUESTED: "Order received",
  NEEDS_REVIEW: "Awaiting review",
  CONFIRMED: "Confirmed",
  AWAITING_CHEF: "Finding your chef",
  CHEF_MATCHED: "Chef matched",
  EN_ROUTE: "On its way",
  CANCELLED: "Cancelled",
  COMPLETED: "Delivered",
};

const POPULAR_MEALS: readonly { readonly slug: string; readonly name: string }[] = [
  { slug: "sa-roast-chicken-seven-colours", name: "SA Roast Chicken (Seven Colours)" },
  { slug: "winter-oxtail-stew", name: "Winter Oxtail Stew" },
  { slug: "sa-oxtail-seven-colours", name: "SA Oxtail (Seven Colours)" },
  { slug: "healthy-chicken-gyro-bowl", name: "Healthy Chicken Gyro Bowl" },
  { slug: "healthy-burger-bowl", name: "Healthy Burger Bowl" },
  { slug: "beef-steak-chips", name: "Beef Steak & Rustic Chips" },
  { slug: "chicken-peri-peri", name: "Flame-Grilled Peri-Peri Chicken" },
  { slug: "chicken-bbq", name: "Smoky BBQ Glazed Chicken" },
  { slug: "pasta-beef-lasagne", name: "Traditional Beef Lasagne" },
  { slug: "pasta-meatball", name: "Handcrafted Meatball Pasta" },
  { slug: "pasta-cheesy-mince", name: "Cheesy Mince Pasta" },
  { slug: "sa-chicken-seven-colours", name: "SA Chicken (Seven Colours)" },
];

const AVAILABLE_SIDES: readonly { readonly slug: string; readonly name: string }[] = [
  { slug: "side-seven-colours", name: "Seven Colours (Beetroot, Pumpkin, Spinach, Chakalaka)" },
  { slug: "side-creamy-mash", name: "Creamy Herb Mash" },
  { slug: "side-roasted-medley", name: "Roasted Seasonal Veg Medley" },
  { slug: "side-coleslaw", name: "Crisp House Coleslaw" },
  { slug: "side-chakalaka", name: "Spiced Chakalaka" },
  { slug: "side-savoury-rice", name: "Golden Savoury Rice" },
  { slug: "side-steamed-greens", name: "Garlic Steamed Greens" },
];

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function mealList(booking: CustomerBooking): string {
  return booking.meals.length > 0
    ? booking.meals.map((meal) => meal.name).join(", ")
    : booking.mainMeal.name;
}

function EditOrderModal({
  booking,
  busy,
  onCancel,
  onConfirm,
}: {
  readonly booking: CustomerBooking;
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (input: ModifyCustomerBookingInput) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(booking.scheduledDate >= today ? booking.scheduledDate : today);
  const [timeSlot, setTimeSlot] = useState<string>(booking.timeSlot);
  const [slots, setSlots] = useState<readonly AvailabilitySlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Meal & sides state
  const initialMainSlug = booking.mainMeal.slug;
  const isKnownMain = POPULAR_MEALS.some((m) => m.slug === initialMainSlug);
  const [selectedMainSlug, setSelectedMainSlug] = useState<string>(
    isKnownMain ? initialMainSlug : "custom",
  );
  const [customMainName, setCustomMainName] = useState<string>(
    isKnownMain ? "" : booking.mainMeal.name,
  );

  const initialSideSlugs = booking.meals
    .filter((m) => m.kind === "side")
    .map((m) => m.slug);
  const [selectedSides, setSelectedSides] = useState<string[]>(initialSideSlugs);

  const initialHasOats = booking.meals.some(
    (m) => m.kind === "addon" && m.slug.includes("oats"),
  );
  const [hasOatsAddon, setHasOatsAddon] = useState<boolean>(initialHasOats);

  // Dietary and instructions
  const [customRequest, setCustomRequest] = useState<string>(booking.customRequest ?? "");

  // Address
  const [street, setStreet] = useState<string>(booking.address?.street ?? "");
  const [unit, setUnit] = useState<string>(booking.address?.unit ?? "");
  const [estate, setEstate] = useState<string>(booking.address?.estate ?? "");
  const [serviceArea, setServiceArea] = useState<string>(booking.address?.serviceArea ?? "");

  useEffect(() => {
    let cancelled = false;
    setSlotsError(null);
    setSlots(null);
    fetchAvailabilityForDate(date)
      .then((next) => {
        if (!cancelled) {
          const available = next.filter((slot) => slot.available);
          setSlots(available);
          if (date !== booking.scheduledDate && !available.some((s) => s.time === timeSlot)) {
            setTimeSlot("");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Could not load available times. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [date, booking.scheduledDate]);

  const toggleSide = (slug: string) => {
    setSelectedSides((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleSave = () => {
    const mainMealSlug =
      selectedMainSlug === "custom"
        ? (customMainName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom-meal")
        : selectedMainSlug;
    const mainName =
      selectedMainSlug === "custom"
        ? (customMainName.trim() || "Custom Meal Request")
        : (POPULAR_MEALS.find((m) => m.slug === selectedMainSlug)?.name ?? selectedMainSlug);

    const input: ModifyCustomerBookingInput = {
      scheduledDate: date,
      timeSlot: timeSlot || booking.timeSlot,
      mainMealSlug,
      mainName,
      sideSlugs: selectedSides,
      breakfastAddOnSlug: hasOatsAddon ? "overnight-oats-trio" : null,
      customRequest: customRequest.trim() ? customRequest.trim() : null,
      address: {
        street: street.trim() || undefined,
        unit: unit.trim() || null,
        estate: estate.trim() || null,
        serviceArea: serviceArea.trim() || undefined,
      },
      reason: "Customer order adjustment via dashboard",
    };

    onConfirm(input);
  };

  const canSave = (date && timeSlot) && (selectedMainSlug !== "custom" || customMainName.trim().length > 0);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      role="dialog"
    >
      <div className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-[0_20px_60px_rgba(70,33,24,0.25)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-[var(--color-oxblood)]/10 pb-4">
          <div>
            <span className="rounded-full bg-[var(--color-bone)] px-2.5 py-0.5 text-xs font-black text-[var(--color-oxblood)]">
              Ref {booking.reference}
            </span>
            <h3 className="mt-1 text-xl font-black text-[var(--color-oxblood)]">
              Edit Order & Schedule
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/70">
              Update your menu selections, delivery address, dietary notes, or session time.
            </p>
          </div>
          <button
            aria-label="Close modal"
            className="rounded-full p-2 text-[var(--color-charcoal)]/50 hover:bg-[var(--color-warm-cream)] hover:text-[var(--color-charcoal)]"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Section: Date & Time */}
          <section className="rounded-2xl bg-[var(--color-warm-cream)]/50 p-4 border border-[var(--color-oxblood)]/10">
            <h4 className="font-bold text-[var(--color-oxblood)] text-sm uppercase tracking-wider">
              1. Session Date & Time
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
                Date
                <input
                  className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  type="date"
                  value={date}
                />
              </label>
              <div>
                <p className="text-xs font-bold text-[var(--color-charcoal)] mb-1">Time Slot</p>
                {slotsError ? (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{slotsError}</p>
                ) : slots === null ? (
                  <p className="text-xs text-[var(--color-charcoal)]/60 pt-2">Loading available slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-[var(--color-charcoal)]/70 bg-amber-50 p-2 rounded-lg">
                    No slots available on this date (min 24h notice).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-[var(--color-oxblood)]/20">
                    {slots.map((slot) => (
                      <button
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          timeSlot === slot.time
                            ? "bg-[var(--color-oxblood)] text-white"
                            : "bg-[var(--color-warm-cream)] text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)]/15"
                        }`}
                        key={slot.time}
                        onClick={() => setTimeSlot(slot.time)}
                        type="button"
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Main Dish */}
          <section className="rounded-2xl bg-[var(--color-warm-cream)]/50 p-4 border border-[var(--color-oxblood)]/10">
            <h4 className="font-bold text-[var(--color-oxblood)] text-sm uppercase tracking-wider">
              2. Main Meal
            </h4>
            <div className="mt-3">
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
                Choose Main Dish
                <select
                  className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  onChange={(e) => setSelectedMainSlug(e.target.value)}
                  value={selectedMainSlug}
                >
                  {POPULAR_MEALS.map((meal) => (
                    <option key={meal.slug} value={meal.slug}>
                      {meal.name}
                    </option>
                  ))}
                  <option value="custom">Custom / Other Dish Request...</option>
                </select>
              </label>

              {selectedMainSlug === "custom" && (
                <label className="mt-3 grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
                  Custom Meal Name
                  <input
                    className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                    onChange={(e) => setCustomMainName(e.target.value)}
                    placeholder="e.g. Traditional Bobotie with Yellow Rice"
                    type="text"
                    value={customMainName}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Section: Sides & Add-ons */}
          <section className="rounded-2xl bg-[var(--color-warm-cream)]/50 p-4 border border-[var(--color-oxblood)]/10">
            <h4 className="font-bold text-[var(--color-oxblood)] text-sm uppercase tracking-wider">
              3. Sides & Breakfast Add-On
            </h4>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-bold text-[var(--color-charcoal)] mb-2">Included Sides</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_SIDES.map((side) => {
                    const checked = selectedSides.includes(side.slug);
                    return (
                      <label
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                          checked
                            ? "border-[var(--color-oxblood)] bg-[var(--color-oxblood)]/5 text-[var(--color-oxblood)] font-bold"
                            : "border-[var(--color-oxblood)]/15 bg-white text-[var(--color-charcoal)] hover:bg-[var(--color-warm-cream)]"
                        }`}
                        key={side.slug}
                      >
                        <input
                          checked={checked}
                          className="rounded text-[var(--color-oxblood)] focus:ring-0"
                          onChange={() => toggleSide(side.slug)}
                          type="checkbox"
                        />
                        <span>{side.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-oxblood)]/10">
                <label className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-50/50 p-3 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      checked={hasOatsAddon}
                      className="rounded text-emerald-700 focus:ring-0"
                      onChange={(e) => setHasOatsAddon(e.target.checked)}
                      type="checkbox"
                    />
                    <div>
                      <span className="text-xs font-black text-emerald-900">
                        Overnight Oats Trio (3 Jars)
                      </span>
                      <p className="text-[11px] text-emerald-700">
                        Complimentary fresh breakfast add-on prepared by your chef.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                    Free
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Section: Custom Dietary & Special Notes */}
          <section className="rounded-2xl bg-[var(--color-warm-cream)]/50 p-4 border border-[var(--color-oxblood)]/10">
            <h4 className="font-bold text-[var(--color-oxblood)] text-sm uppercase tracking-wider">
              4. Dietary Notes & Special Instructions
            </h4>
            <label className="mt-2 grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
              Allergies, spice preferences, or chef notes
              <textarea
                className="rounded-xl border border-[var(--color-oxblood)]/20 bg-white p-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                onChange={(e) => setCustomRequest(e.target.value)}
                placeholder="e.g. Mild spice, no dairy in sauces, please leave herbs on the side..."
                rows={3}
                value={customRequest}
              />
            </label>
          </section>

          {/* Section: Delivery Address */}
          <section className="rounded-2xl bg-[var(--color-warm-cream)]/50 p-4 border border-[var(--color-oxblood)]/10">
            <h4 className="font-bold text-[var(--color-oxblood)] text-sm uppercase tracking-wider">
              5. Delivery Address
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)] sm:col-span-2">
                Street Address
                <input
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. 12 Jacaranda Avenue"
                  type="text"
                  value={street}
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
                Unit / Apt
                <input
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. Unit 4B"
                  type="text"
                  value={unit}
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)]">
                Estate / Complex
                <input
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  onChange={(e) => setEstate(e.target.value)}
                  placeholder="e.g. Sandton Isle"
                  type="text"
                  value={estate}
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-[var(--color-charcoal)] sm:col-span-2">
                Area / Suburb
                <input
                  className="min-h-10 rounded-xl border border-[var(--color-oxblood)]/20 bg-white px-3 text-sm font-normal focus:border-[var(--color-oxblood)] focus:outline-hidden"
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Sandton / Fourways / Bryanston"
                  type="text"
                  value={serviceArea}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-[var(--color-oxblood)]/10 pt-4">
          <button
            className="min-h-11 rounded-xl border border-[var(--color-oxblood)]/20 px-5 text-sm font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-warm-cream)] disabled:opacity-50"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-11 rounded-xl bg-[var(--color-oxblood)] px-6 text-sm font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
            disabled={busy || !canSave}
            onClick={handleSave}
            type="button"
          >
            {busy ? "Saving Changes..." : "Save Order Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  canModify,
  onModify,
}: {
  readonly booking: CustomerBooking;
  readonly canModify: boolean;
  readonly onModify: (booking: CustomerBooking) => void;
}) {
  const isUpcoming = OPEN_STATUSES.includes(booking.status);
  return (
    <li className="rounded-2xl border border-[var(--color-oxblood)]/10 bg-white p-5 shadow-[0_10px_30px_rgba(70,33,24,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-[var(--color-charcoal)]">{mealList(booking)}</p>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
            {formatDate(booking.scheduledDate)} · {booking.timeSlot}
          </p>
          {booking.customRequest ? (
            <p className="mt-1 text-xs italic text-[var(--color-charcoal)]/60 bg-[var(--color-warm-cream)]/50 p-1.5 rounded-lg">
              Note: {booking.customRequest}
            </p>
          ) : null}
          {booking.address?.street ? (
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">
              📍 {booking.address.unit ? `${booking.address.unit}, ` : ""}
              {booking.address.estate ? `${booking.address.estate}, ` : ""}
              {booking.address.street}
              {booking.address.serviceArea ? `, ${booking.address.serviceArea}` : ""}
            </p>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isUpcoming
              ? "bg-emerald-100 text-emerald-800"
              : booking.status === "CANCELLED"
                ? "bg-rose-100 text-rose-700"
                : "bg-[var(--color-bone)] text-[var(--color-oxblood)]"
          }`}
        >
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-oxblood)]/5 pt-3">
        <p className="text-xs text-[var(--color-charcoal)]/50 font-medium">Ref {booking.reference}</p>
        {canModify ? (
          <button
            className="min-h-9 rounded-xl border border-[var(--color-oxblood)]/30 bg-[var(--color-oxblood)]/5 px-4 text-xs font-bold text-[var(--color-oxblood)] transition hover:bg-[var(--color-oxblood)] hover:text-white"
            onClick={() => onModify(booking)}
            type="button"
          >
            Edit Order & Schedule
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function CustomerBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);
  const [modifyTarget, setModifyTarget] = useState<CustomerBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void fetchCustomerBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    load();
  }, []);

  const confirmModify = (input: ModifyCustomerBookingInput) => {
    if (!modifyTarget) return;
    setBusy(true);
    setError(null);
    void modifyCustomerBooking(modifyTarget.id, input)
      .then((updated) => {
        setBookings((prev) =>
          (prev ?? []).map((booking) => (booking.id === updated.id ? updated : booking)),
        );
        setModifyTarget(null);
        setNotice(
          `Booking ${updated.reference} updated successfully for ${formatDate(updated.scheduledDate)} at ${updated.timeSlot}.`,
        );
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Update failed. Please try again.");
      })
      .finally(() => setBusy(false));
  };

  const upcoming = (bookings ?? []).filter((booking) => OPEN_STATUSES.includes(booking.status));
  const history = (bookings ?? []).filter((booking) => !OPEN_STATUSES.includes(booking.status));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(70,33,24,0.08)]">
        <h2 className="text-2xl font-black text-[var(--color-oxblood)]">My Bookings</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/70">
          The meals you have coming up.
        </p>

        {notice ? (
          <p
            className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <h3 className="mt-6 font-semibold text-[var(--color-charcoal)]">Upcoming</h3>
        {upcoming.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {upcoming.map((booking) => (
              <BookingCard
                booking={booking}
                canModify={MODIFIABLE_STATUSES.includes(booking.status)}
                key={booking.id}
                onModify={setModifyTarget}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No upcoming bookings.{" "}
            <Link href="/" className="font-semibold text-[var(--color-oxblood)] hover:underline">
              Book a cook
            </Link>{" "}
            to get started.
          </p>
        )}

        <h3 className="mt-8 font-semibold text-[var(--color-charcoal)]">Past</h3>
        {history.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {history.map((booking) => (
              <BookingCard
                booking={booking}
                canModify={false}
                key={booking.id}
                onModify={setModifyTarget}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl bg-[var(--color-warm-cream)] p-4 text-sm text-[var(--color-charcoal)]/70">
            No past bookings yet.
          </p>
        )}
      </section>

      {modifyTarget ? (
        <EditOrderModal
          booking={modifyTarget}
          busy={busy}
          onCancel={() => setModifyTarget(null)}
          onConfirm={confirmModify}
        />
      ) : null}
    </div>
  );
}
