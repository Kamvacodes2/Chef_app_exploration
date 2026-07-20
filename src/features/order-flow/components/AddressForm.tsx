"use client";

import type { ReactElement } from "react";
import { useOrder } from "../state/OrderContext";

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly required?: boolean;
  readonly autoComplete?: string;
}

function Field({ id, label, value, onChange, placeholder, required, autoComplete }: FieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-[#F3E3B2]/80">
        {label} {required ? <span className="text-[#E88D5F]">*</span> : <span className="normal-case text-[#F3E3B2]/50">(optional)</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-white/90 p-3.5 text-sm text-[#1A1208] placeholder:text-[#1A1208]/40 focus:outline focus:outline-2 focus:outline-[#F3E3B2]"
      />
    </div>
  );
}

/**
 * Delivery address. Street is the only hard requirement; estate/complex and
 * unit number are optional but encouraged for gated communities.
 */
export function AddressForm(): ReactElement {
  const { state, setAddressField } = useOrder();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl font-semibold text-[#F3E3B2] sm:text-4xl">Where to?</h2>
        <p className="text-sm text-[#F3E3B2]/70">Your delivery address. Street is all we really need.</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <Field
          id="addr-estate"
          label="Estate / Complex name"
          value={state.address.estate}
          onChange={(v) => setAddressField("estate", v)}
          placeholder="e.g. Steyn City, Dainfern, Blair Atholl"
        />
        <Field
          id="addr-unit"
          label="Unit / House number"
          value={state.address.unit}
          onChange={(v) => setAddressField("unit", v)}
          placeholder="e.g. Unit 12, House 45"
        />
        <Field
          id="addr-street"
          label="Street address"
          value={state.address.street}
          onChange={(v) => setAddressField("street", v)}
          placeholder="e.g. 12 Jacaranda Avenue, Fourways"
          required
          autoComplete="street-address"
        />
      </div>
    </div>
  );
}
