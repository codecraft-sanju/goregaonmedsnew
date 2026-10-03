import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="GoregaonMeds home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white shadow-lift">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Goregaon<span className="text-brand-600">Meds</span>
      </span>
    </Link>
  );
}
