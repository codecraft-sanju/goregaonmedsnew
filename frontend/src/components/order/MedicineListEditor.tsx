'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface MedicineRow {
  id: string;
  name: string;
  quantity: string;
}

export const MAX_MEDICINES = 30;

interface Props {
  rows: MedicineRow[];
  errors: Record<string, string>;
  onChange: (rows: MedicineRow[]) => void;
  onAdd: () => void;
}

export function MedicineListEditor({ rows, errors, onChange, onAdd }: Props) {
  const update = (id: string, field: 'name' | 'quantity', value: string) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const remove = (id: string) => onChange(rows.filter((row) => row.id !== id));

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {rows.map((row, index) => (
          <motion.div
            key={row.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <fieldset className="rounded-3xl bg-surface p-4 ring-1 ring-brand-100">
              <legend className="sr-only">Medicine {index + 1}</legend>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Medicine {index + 1}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => remove(row.id)} className="rounded-lg p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600" aria-label={`Remove medicine ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                <div>
                  <label htmlFor={`${row.id}-name`} className="mb-1 block text-sm font-medium">Medicine Name</label>
                  <input
                    id={`${row.id}-name`}
                    value={row.name}
                    onChange={(event) => update(row.id, 'name', event.target.value)}
                    placeholder="e.g. Dolo 650"
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={errors[`${row.id}-name`] ? true : undefined}
                    className="h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-inset ring-brand-100 placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-500 aria-[invalid]:ring-red-300"
                  />
                  {errors[`${row.id}-name`] && <p className="mt-1 text-sm text-red-600">{errors[`${row.id}-name`]}</p>}
                </div>
                <div>
                  <label htmlFor={`${row.id}-qty`} className="mb-1 block text-sm font-medium">Quantity</label>
                  <input
                    id={`${row.id}-qty`}
                    value={row.quantity}
                    onChange={(event) => update(row.id, 'quantity', event.target.value)}
                    placeholder="e.g. 2 strips"
                    maxLength={60}
                    autoComplete="off"
                    aria-invalid={errors[`${row.id}-qty`] ? true : undefined}
                    className="h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-inset ring-brand-100 placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-500 aria-[invalid]:ring-red-300"
                  />
                  {errors[`${row.id}-qty`] && <p className="mt-1 text-sm text-red-600">{errors[`${row.id}-qty`]}</p>}
                </div>
              </div>
            </fieldset>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button variant="secondary" onClick={onAdd} disabled={rows.length >= MAX_MEDICINES} icon={<Plus className="h-4 w-4" />} className="w-full">
        Add Another Medicine
      </Button>
    </div>
  );
}
