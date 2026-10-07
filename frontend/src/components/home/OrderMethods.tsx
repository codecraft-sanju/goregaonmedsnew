// src/components/home/OrderMethods.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Camera } from 'lucide-react';
import { Reveal } from './Reveal';
import { usePublicSettings } from '@/hooks/usePublicSettings';

export function OrderMethods() {
  const { settings, loading } = usePublicSettings();
  
  // Check if offer is enabled from admin panel
  const showOfferCard = !loading && settings.firstOrderOfferEnabled;

  return (
    <section id="order-methods" className="container-app pt-6 pb-14 md:pt-10" aria-labelledby="methods-title">
      
      {/* Merged Hero Section */}
      <div className="mb-6 md:mb-8">
        <h1 id="methods-title" className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl">
          What do you need today?
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Order your medicines quickly and easily.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Card 1: Free Gift Banner (Offer) */}
        {showOfferCard && (
          <Reveal delay={0.05}>
            <div className="relative flex min-h-[110px] items-center overflow-hidden rounded-3xl bg-gradient-to-r from-[#fff5e6] to-[#ffebd6] p-4 transition-transform hover:scale-[1.01] md:min-h-[220px] md:flex-col md:items-start md:p-6">
              
              <div className="relative h-16 w-20 shrink-0 pointer-events-none md:absolute md:bottom-6 md:right-6 md:h-24 md:w-24">
                <div className="absolute left-1/2 top-1/2 h-12 w-14 -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute bottom-0 h-9 w-14 rounded-md bg-white shadow-sm" />
                  <div className="absolute bottom-0 left-1/2 h-9 w-2.5 -translate-x-1/2 bg-[#dfa442]" />
                  <div className="absolute top-2 -left-0.5 h-3 w-[60px] rounded-sm bg-white shadow-sm" />
                  <div className="absolute top-2 left-1/2 h-3 w-2.5 -translate-x-1/2 bg-[#dfa442]" />
                  <div className="absolute -top-1 left-1/2 flex -translate-x-1/2 gap-[1px]">
                    <div className="h-3 w-4 rounded-full border-[2.5px] border-[#dfa442]" />
                    <div className="h-3 w-4 rounded-full border-[2.5px] border-[#dfa442]" />
                  </div>
                </div>
              </div>

              <div className="ml-2 flex-1 md:ml-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b87c1c]">
                  First Order Gift
                </span>
                <h3 className="mt-0.5 font-display text-[15px] font-bold text-ink md:mt-2 md:text-xl">
                  Dr. Morepen GlucoOne BG-03
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-[#7a6441] md:text-sm">
                  Free with qualifying medicine value.
                </p>
                <button className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#b87c1c] hover:underline">
                  Know more <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Card 2: Upload Prescription */}
        <Reveal delay={0.1}>
          <Link href="/order?method=prescription" className="relative flex min-h-[220px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#e5f7ed] to-[#d3f0e0] p-6 transition-transform hover:scale-[1.01]">
            <span className="w-fit rounded-full bg-[#c2ecd4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#147a4a]">
              Recommended
            </span>
            <div className="relative z-10 mt-3 max-w-[60%] sm:max-w-[70%]">
              <h3 className="font-display text-[22px] font-extrabold leading-tight text-ink">
                Upload<br/>Prescription
              </h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-[#4a6358]">
                Take a photo or upload your prescription. We&apos;ll take care of the rest.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#156253] px-4 py-2 text-[13px] font-semibold text-white shadow-sm">
                Upload Prescription <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
            </div>

            <div className="absolute -right-4 bottom-2 h-32 w-32 pointer-events-none md:bottom-6 md:right-0">
              <div className="absolute right-8 top-2 h-24 w-20 rotate-[12deg] rounded-lg bg-white/50 shadow-sm" />
              <div className="absolute right-4 top-4 h-24 w-20 rotate-3 rounded-lg bg-white p-2 shadow-md">
                 <div className="font-serif text-sm font-bold text-brand-800">Rx</div>
                 <div className="mt-2.5 space-y-2">
                   <div className="h-1 w-full rounded bg-brand-50" />
                   <div className="h-1 w-4/5 rounded bg-brand-50" />
                   <div className="h-1 w-full rounded bg-brand-50" />
                 </div>
              </div>
              <div className="absolute bottom-2 right-6 grid h-11 w-11 place-items-center rounded-2xl bg-[#156253] text-white shadow-lg border-2 border-white">
                <Camera className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </Reveal>

        {/* Card 3: Order via Text */}
        <Reveal delay={0.15}>
          <Link href="/order?method=manual" className="relative flex min-h-[220px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#eaf4f4] to-[#dbeeee] p-6 transition-transform hover:scale-[1.01]">
            <div className="relative z-10 max-w-[60%] sm:max-w-[70%] mt-6">
              <h3 className="font-display text-[22px] font-extrabold leading-tight text-ink">
                Order via Text
              </h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-[#5b7373]">
                Simply enter medicine names and quantities (e.g. 1 strip, 10 tablets).
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1e786b] px-4 py-2 text-[13px] font-semibold text-white shadow-sm">
                Order via Text <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
            </div>

            <div className="absolute -right-2 bottom-2 h-32 w-32 pointer-events-none md:bottom-6 md:right-0">
              <div className="absolute right-4 top-4 grid h-[76px] w-[60px] -rotate-12 grid-cols-2 gap-2 rounded-xl bg-[#b4c8c8] p-2.5 shadow-inner">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[14px] w-[14px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]" />
                ))}
              </div>
              <div className="absolute bottom-6 right-16 flex h-[18px] w-11 rotate-45 overflow-hidden rounded-full shadow-md border-[1.5px] border-white">
                <div className="h-full w-1/2 bg-white" />
                <div className="h-full w-1/2 bg-[#1e786b]" />
              </div>
              <div className="absolute bottom-2 right-4 h-6 w-6 rounded-full bg-white shadow-md border-[1.5px] border-[#eaf4f4]" />
            </div>
          </Link>
        </Reveal>

      </div>
    </section>
  );
}