"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Truck, Gift, Save } from "lucide-react";
import { api, date, message, type Settings } from "@/lib/api";
import { useSettings } from "@/app/shell";
import { Button, Field, Notice, Skeleton } from "@/app/ui";
const schema = z.object({
  deliveryCharge: z.number().finite().min(0).max(2000).multipleOf(0.01),
  firstOrderOfferEnabled: z.boolean(),
  firstOrderMinimumMedicineAmount: z
    .number()
    .finite()
    .min(0)
    .max(1000000)
    .multipleOf(0.01),
});
export default function SettingsPage() {
  const { refresh } = useSettings();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    api<{ settings: Settings }>("/admin/settings", { signal: c.signal })
      .then((d) => setSettings(d.settings))
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [revision]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || busy) return;
    setError("");
    setSuccess("");
    const parsed = schema.safeParse({
      deliveryCharge: settings.deliveryCharge,
      firstOrderOfferEnabled: settings.firstOrderOfferEnabled,
      firstOrderMinimumMedicineAmount: settings.firstOrderMinimumMedicineAmount,
    });
    if (!parsed.success) {
      setError(
        "Delivery must be ₹0–2,000 and the medicine threshold ₹0–10,00,000, with at most two decimal places.",
      );
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ settings: Settings }>("/admin/settings", {
        method: "PATCH",
        body: parsed.data,
      });
      setSettings(d.settings);
      setSuccess("Settings saved. Your storefront has been refreshed.");
      refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-3">The details that shape your service</p>
        <h1 className="title">Pharmacy settings.</h1>
      </div>
      {error && <Notice>{error}</Notice>}
      {success && <Notice tone="success">{success}</Notice>}
      {!settings ? (
        error ? (
          <Button onClick={() => setRevision((n) => n + 1)}>Retry</Button>
        ) : (
          <Skeleton />
        )
      ) : (
        <form onSubmit={save} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            <section className="card space-y-5">
              <h2 className="flex items-center gap-3 text-lg font-semibold">
                <Truck size={21} className="text-brand" />
                Delivery
              </h2>
              <Field
                label="Delivery charge (₹)"
                type="number"
                min="0"
                max="2000"
                step="0.01"
                value={settings.deliveryCharge}
                onChange={(e) =>
                  setSettings(
                    (s) =>
                      s && { ...s, deliveryCharge: Number(e.target.value) },
                  )
                }
              />
              <p className="muted">
                Set to zero for FREE delivery. Used when an order’s bill is
                saved.
              </p>
            </section>
            <section className="card space-y-5">
              <h2 className="flex items-center gap-3 text-lg font-semibold">
                <Gift size={21} className="text-brand" />
                First-order offer
              </h2>
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-paper p-4 text-sm font-semibold">
                Enable the GlucoOne BG-03 gift
                <input
                  type="checkbox"
                  className="size-6 accent-[#156253]"
                  checked={settings.firstOrderOfferEnabled}
                  onChange={(e) =>
                    setSettings(
                      (s) =>
                        s && { ...s, firstOrderOfferEnabled: e.target.checked },
                    )
                  }
                />
              </label>
              <Field
                label="Minimum medicine subtotal (₹)"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                value={settings.firstOrderMinimumMedicineAmount}
                onChange={(e) =>
                  setSettings(
                    (s) =>
                      s && {
                        ...s,
                        firstOrderMinimumMedicineAmount: Number(e.target.value),
                      },
                  )
                }
              />
              <p className="muted">
                Only available medicine line amounts count. Non-medicine items
                and delivery charges are excluded. The server confirms
                eligibility.
              </p>
            </section>
          </fieldset>
          <Button type="submit" busy={busy}>
            <Save size={17} />
            Save settings
          </Button>
          {settings.updatedAt && (
            <p className="text-xs text-muted">
              Last updated {date(settings.updatedAt)}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
