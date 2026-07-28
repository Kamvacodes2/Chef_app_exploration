"use client";

import type { HTMLInputTypeAttribute, ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly type?: HTMLInputTypeAttribute;
  readonly required?: boolean;
  readonly autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
}: FieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/80">
        {label}
        {required ? <span className="text-[var(--color-maize)]"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-white/90 p-3.5 text-sm text-[var(--color-oxblood)] placeholder:text-[var(--color-oxblood)]/40 focus:outline focus:outline-2 focus:outline-[var(--color-bone)]"
      />
    </div>
  );
}

export function AddressForm(): ReactElement {
  const { state, setAddressField, setContactField, authenticatedUser, isSessionLoading } = useOrder();
  const usesAccountContact = authenticatedUser !== null && authenticatedUser !== undefined;
  const showContactFields = !isSessionLoading && !usesAccountContact;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-bone)] sm:text-4xl">
          {usesAccountContact ? "Where should we come?" : "Your details"}
        </h2>
        <p className="text-sm text-[var(--color-bone)]/70">
          {usesAccountContact
            ? "Your Chefmate account will receive booking updates."
            : "Where Chefmate should visit and how to keep you updated."}
        </p>
      </div>

      <div className={showContactFields ? "grid w-full max-w-3xl gap-6 md:grid-cols-2" : "flex w-full max-w-xl flex-col gap-4"}>
        {showContactFields ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">Contact</p>
            <Field
              id="contact-name"
              label="Full name"
              value={state.contact.name}
              onChange={(value) => setContactField("name", value)}
              placeholder="Your name"
              required
              autoComplete="name"
            />
            <Field
              id="contact-email"
              label="Email address"
              value={state.contact.email}
              onChange={(value) => setContactField("email", value)}
              placeholder="you@example.com"
              type="email"
              required
              autoComplete="email"
            />
            <Field
              id="contact-phone"
              label="Mobile number"
              value={state.contact.phone}
              onChange={(value) => setContactField("phone", value)}
              placeholder="082 123 4567"
              type="tel"
              required
              autoComplete="tel"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-bone)]/60">Visit address</p>
          <Field
            id="addr-area"
            label="Area / suburb"
            value={state.address.area}
            onChange={(value) => setAddressField("area", value)}
            placeholder="e.g. Fourways"
            required
            autoComplete="address-level2"
          />
          <Field
            id="addr-street"
            label="Street address"
            value={state.address.street}
            onChange={(value) => setAddressField("street", value)}
            placeholder="e.g. 12 Jacaranda Avenue"
            required
            autoComplete="street-address"
          />
          <Field
            id="addr-estate"
            label="Estate / complex"
            value={state.address.estate}
            onChange={(value) => setAddressField("estate", value)}
            placeholder="e.g. Dainfern"
            autoComplete="organization"
          />
          <Field
            id="addr-unit"
            label="Unit / house number"
            value={state.address.unit}
            onChange={(value) => setAddressField("unit", value)}
            placeholder="e.g. Unit 12"
            autoComplete="address-line2"
          />
        </div>
      </div>
    </div>
  );
}