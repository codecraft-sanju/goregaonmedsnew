//src/components/admin/SettingsForm.tsx
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { adminRequest } from '@/lib/adminApi';
import { GIFT } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import type { AdminSettings } from '@/lib/types';

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

export function SettingsForm() {
  const toast = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [threshold, setThreshold] = useState('');
  const [offerEnabled, setOfferEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apply = (value: AdminSettings) => {
    setSettings(value);
    setDeliveryCharge(String(value.deliveryCharge));
    setThreshold(String(value.firstOrderMinimumMedicineAmount));
    setOfferEnabled(value.firstOrderOfferEnabled);
  };

  useEffect(() => {
    adminRequest<{ settings: AdminSettings }>('/settings')
      .then((res) => apply(res.settings))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const deliveryError = AMOUNT_PATTERN.test(deliveryCharge) ? undefined : 'Enter an amount like 0 or 30';
  const thresholdError = AMOUNT_PATTERN.test(threshold) ? undefined : 'Enter an amount like 500';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (deliveryError || thresholdError) return;
    setSaving(true);
    try {
      const res = await adminRequest<{ settings: AdminSettings }>('/settings', {
        method: 'PATCH',
        body: { deliveryCharge: Number(deliveryCharge), firstOrderMinimumMedicineAmount: Number(threshold), firstOrderOfferEnabled: offerEnabled },
      });
      apply(res.settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <div className="card p-6 text-center text-sm" role="alert">{loadError}</div>;
  if (!settings) return <Skeleton className="h-96 max-w-xl rounded-3xl" />;

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-6 p-6 sm:p-8" noValidate>
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        {settings.updatedAt && <p className="mt-1 text-xs text-ink-soft">Last updated {formatDateTime(settings.updatedAt)}</p>}
      </div>

      <Field
        label="Delivery Charge"
        leading="₹"
        inputMode="decimal"
        value={deliveryCharge}
        onChange={(event) => setDeliveryCharge(event.target.value.replace(/[^\d.]/g, ''))}
        error={deliveryCharge ? deliveryError : 'Required'}
        hint={'Customers see "FREE Delivery" when this is 0. Applied to every bill saved from now on.'}
      />

      <fieldset className="space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-brand-100">
        <legend className="px-1 text-sm font-semibold">First Order Gift · FREE {GIFT.name}</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Offer enabled</span>
          <input type="checkbox" role="switch" checked={offerEnabled} onChange={(event) => setOfferEnabled(event.target.checked)} className="h-5 w-5 accent-brand-700" />
        </label>
        <Field
          label="Minimum Medicine Subtotal"
          leading="₹"
          inputMode="decimal"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value.replace(/[^\d.]/g, ''))}
          error={threshold ? thresholdError : 'Required'}
          hint="Checked against the medicine subtotal only. Other items and delivery never count."
        />
      </fieldset>

      <Button type="submit" loading={saving} disabled={Boolean(deliveryError || thresholdError)} icon={<Save className="h-4 w-4" />}>
        Save Settings
      </Button>
    </form>
  );
}
