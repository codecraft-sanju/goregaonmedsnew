'use client';

import { Field } from '@/components/ui/Field';
import type { Address } from '@/lib/types';

export interface DeliveryDetails {
  customerName: string;
  mobileNumber: string;
  address: Address;
}

interface Props {
  value: DeliveryDetails;
  errors: Partial<Record<'customerName' | 'mobileNumber' | 'flat' | 'area' | 'landmark', string>>;
  saveDetails: boolean;
  onChange: (value: DeliveryDetails) => void;
  onSaveDetailsChange: (save: boolean) => void;
}

export function DeliveryDetailsForm({ value, errors, saveDetails, onChange, onSaveDetailsChange }: Props) {
  const setAddress = (field: keyof Address, fieldValue: string) => onChange({ ...value, address: { ...value.address, [field]: fieldValue } });

  return (
    <div className="space-y-4">
      <Field
        label="Full Name"
        autoComplete="name"
        maxLength={80}
        value={value.customerName}
        onChange={(event) => onChange({ ...value, customerName: event.target.value })}
        error={errors.customerName}
      />
      <Field
        label="Mobile Number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        leading="+91"
        placeholder="98200 12345"
        value={value.mobileNumber}
        onChange={(event) => onChange({ ...value, mobileNumber: event.target.value.replace(/[^\d\s-]/g, '') })}
        error={errors.mobileNumber}
        hint="We’ll call this number to confirm your order."
      />
      <Field
        label="Flat / House / Building"
        autoComplete="address-line1"
        maxLength={120}
        value={value.address.flat}
        onChange={(event) => setAddress('flat', event.target.value)}
        error={errors.flat}
      />
      <Field
        label="Area"
        autoComplete="address-line2"
        maxLength={120}
        placeholder="e.g. Aarey Road, Goregaon East"
        value={value.address.area}
        onChange={(event) => setAddress('area', event.target.value)}
        error={errors.area}
      />
      <Field
        label="Landmark"
        optional
        maxLength={120}
        placeholder="e.g. Near Oberoi Mall"
        value={value.address.landmark}
        onChange={(event) => setAddress('landmark', event.target.value)}
        error={errors.landmark}
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-4 text-sm ring-1 ring-brand-100">
        <input
          type="checkbox"
          checked={saveDetails}
          onChange={(event) => onSaveDetailsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-700 accent-brand-700"
        />
        <span>
          Save my name, number and address for faster checkout
          <span className="block text-xs text-ink-soft">Stored only on this device for 180 days.</span>
        </span>
      </label>
    </div>
  );
}
