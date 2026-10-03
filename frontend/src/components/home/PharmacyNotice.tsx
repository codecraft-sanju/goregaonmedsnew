import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PharmacyNotice({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-2xl bg-brand-50/70 p-4 text-sm text-ink-muted ring-1 ring-brand-100', className)} role="note">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      <p>
        Prescription medicines will be supplied only against a valid prescription where required. Medicine availability and the final payable amount will be confirmed by the pharmacy.
      </p>
    </div>
  );
}
