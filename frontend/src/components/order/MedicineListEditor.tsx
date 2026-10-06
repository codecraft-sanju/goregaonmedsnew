//src/components/order/MedicineListEditor.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2, Info } from 'lucide-react';
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

  // Helper to extract the numeric value from the formatted string like "2 Strips"
  const getQtyNumber = (qtyString: string) => {
    const num = parseInt(qtyString, 10);
    return isNaN(num) ? 1 : num;
  };

  return (
    <div className="space-y-4">
      
      {/* PROFESSIONAL NOTICE REGARDING LOOSE TABLETS */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
        <p className="text-xs text-brand-900 leading-relaxed">
          <span className="font-semibold">Please note:</span> We currently fulfill orders in complete strips or sealed packs only. Loose tablets are not available.
        </p>
      </div>

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
                    <button type="button" onClick={() => remove(row.id)} className="rounded-lg p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600 transition-colors" aria-label={`Remove medicine ${index + 1}`}>
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
                      className="h-12 w-full rounded-2xl bg-white px-4 ring-1 ring-inset ring-brand-100 placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-500 aria-[invalid]:ring-red-300 transition-shadow"
                    />
                    {errors[`${row.id}-name`] && <p className="mt-1 text-sm text-red-600">{errors[`${row.id}-name`]}</p>}
                  </div>
                  
                  {/* NUMERIC STEPPER FOR QUANTITY */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Quantity</label>
                    <div className="flex h-12 w-full items-center justify-between rounded-2xl bg-white px-2 ring-1 ring-inset ring-brand-100 focus-within:ring-2 focus-within:ring-brand-500">
                      
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = getQtyNumber(row.quantity);
                          if (currentVal > 1) {
                            const newVal = currentVal - 1;
                            update(row.id, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                          }
                        }}
                        disabled={getQtyNumber(row.quantity) <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-ink-soft"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {getQtyNumber(row.quantity)} Strip{getQtyNumber(row.quantity) > 1 ? 's' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const newVal = getQtyNumber(row.quantity) + 1;
                          update(row.id, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-brand-700 transition-colors hover:bg-brand-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      
                    </div>
                  </div>

                </div>
              </fieldset>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button variant="secondary" onClick={onAdd} disabled={rows.length >= MAX_MEDICINES} icon={<Plus className="h-4 w-4" />} className="w-full">
        Add Another Medicine
      </Button>
    </div>
  );
}