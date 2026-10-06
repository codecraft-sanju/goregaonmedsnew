//src/components/home/HeroVisual.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Pill, Truck } from 'lucide-react';

const rows = [
  { name: 'Dolo 650', qty: '2 strips' },
  { name: 'Azithral 500', qty: '1 strip' },
  { name: 'ORS sachets', qty: '4 pcs' },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-brand-200/70 via-brand-100/40 to-gift-100/60 blur-2xl" />
      <motion.div initial={{ opacity: 0, y: 24, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Your order</p>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 font-mono text-xs font-semibold text-brand-700">GMED-K7M3X8</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {rows.map((row, index) => (
            <motion.li
              key={row.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + index * 0.12 }}
              className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
                <Pill className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium">{row.name}</span>
              <span className="text-xs text-ink-soft">{row.qty}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 22 }}
        className="card absolute -bottom-8 -right-2 flex items-center gap-3 px-4 py-3 sm:-right-8"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white">
          <Truck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">On the way</p>
          <p className="text-xs text-ink-soft">Pay by cash or UPI at your door</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-brand-500" />
      </motion.div>
    </div>
  );
}
