// src/components/order/DeliveryDetailsForm.tsx
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
      
      {/* Address Card Container */}
      <div className="rounded-3xl bg-surface p-4 ring-1 ring-brand-100 sm:p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-soft">Delivery Address</h3>
        <div className="space-y-4">
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
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-brand-50/50 p-4 text-sm ring-1 ring-brand-100 transition-colors hover:bg-brand-50">
        <input
          type="checkbox"
          checked={saveDetails}
          onChange={(event) => onSaveDetailsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-brand-300 text-[#156253] accent-[#156253]"
        />
        <span>
          <span className="font-semibold text-ink">Save my details for faster checkout</span>
          <span className="mt-1 block text-xs font-medium text-ink-muted">Stored securely on this device for 180 days.</span>
        </span>
      </label>
    </div>
  );
}