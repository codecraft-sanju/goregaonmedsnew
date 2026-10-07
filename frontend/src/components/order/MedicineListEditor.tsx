// src/components/order/MedicineListEditor.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

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

  const getQtyNumber = (qtyString: string) => {
    const num = parseInt(qtyString, 10);
    return isNaN(num) ? 1 : num;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-2xl bg-[#fff5e6] p-3 ring-1 ring-[#dfa442]/30">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#b87c1c]" aria-hidden="true" />
        <p className="text-xs text-[#7a6441] leading-relaxed font-medium">
          <strong className="font-bold">Please note:</strong> We currently fulfill orders in complete strips or sealed packs only. Loose tablets are not available.
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <motion.div
              key={row.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <fieldset className={cn("rounded-3xl bg-white p-4 shadow-sm ring-1", errors[`${row.id}-name`] ? "ring-red-300" : "ring-brand-100")}>
                <legend className="sr-only">Medicine {index + 1}</legend>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[10px] font-bold uppercase tracking-widest text-[#156253]">
                    Item {index + 1}
                  </span>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => remove(row.id)} className="rounded-full p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors" aria-label={`Remove item ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                  <div>
                    <label htmlFor={`${row.id}-name`} className="mb-1.5 block text-xs font-bold text-ink">Medicine Name</label>
                    <input
                      id={`${row.id}-name`}
                      value={row.name}
                      onChange={(event) => update(row.id, 'name', event.target.value)}
                      placeholder="e.g. Dolo 650"
                      maxLength={120}
                      autoComplete="off"
                      className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] font-medium ring-1 ring-inset ring-brand-50 placeholder:font-normal placeholder:text-ink-soft focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#156253] transition-all"
                    />
                    {errors[`${row.id}-name`] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[`${row.id}-name`]}</p>}
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-ink">Quantity</label>
                    <div className="flex h-12 w-full items-center justify-between rounded-xl bg-surface px-1.5 ring-1 ring-inset ring-brand-50">
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
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="text-sm font-bold tabular-nums text-[#156253]">
                        {getQtyNumber(row.quantity)} Strip{getQtyNumber(row.quantity) > 1 ? 's' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const newVal = getQtyNumber(row.quantity) + 1;
                          update(row.id, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink shadow-sm transition-transform active:scale-95"
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
      <Button variant="secondary" onClick={onAdd} disabled={rows.length >= MAX_MEDICINES} icon={<Plus className="h-4 w-4" />} className="w-full bg-surface hover:bg-brand-50 border-none font-bold text-brand-700">
        Add Another Medicine
      </Button>
    </div>
  );
}