'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, X, ChevronDown, HelpCircle, Phone, 
  Clock, PackageCheck
} from 'lucide-react';
import { SUPPORT_PHONE_TEL, SUPPORT_PHONE_DISPLAY } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

interface FAQItem {
  id: string;
  category: 'Orders & Tracking' | 'Payment & Billing' | 'Delivery' | 'Offers';
  q: string;
  a: string;
  badge?: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'payment',
    category: 'Payment & Billing',
    q: 'Do I need to pay online?',
    a: 'No. You pay only when your order arrives, via Cash or UPI/QR scanner directly to the delivery partner. There are zero prepaid charges or card requirements.',
    badge: 'Cash on Delivery',
  },
  {
    id: 'pricing',
    category: 'Payment & Billing',
    q: 'How do I know the final price?',
    a: 'Once your order is received, the pharmacy verifies stock and prepares an itemized bill with applicable batch discounts. The verified total updates instantly on your tracking page before delivery.',
  },
  {
    id: 'gift',
    category: 'Offers',
    q: 'How does the first-order free gift work?',
    a: 'Your first order qualifies for a complimentary Dr. Morepen GlucoOne BG-03 monitor when eligible medicines reach the minimum billed amount after discounts. Cosmetics, FMCG, general store items, and delivery fees do not count toward this threshold.',
    badge: 'Limited Offer',
  },
  {
    id: 'pharmacy-routing',
    category: 'Delivery',
    q: 'Can I choose which pharmacy delivers?',
    a: 'Routing is fully automated across our partner network in Goregaon East. Your order is assigned to the nearest pharmacy that holds complete stock of your prescription for minimal turnaround time.',
  },
  {
    id: 'night-delivery',
    category: 'Delivery',
    q: 'Do you deliver at night?',
    a: 'Yes, orders can be placed 24 hours a day, 7 days a week. Urgent night dispatches are fulfilled promptly via our 24x7 partner store (Healthzone & Cosmetic).',
    badge: '24x7 Open',
  },
  {
    id: 'tracking',
    category: 'Orders & Tracking',
    q: 'How do I track my order?',
    a: 'Head over to the Track page and enter your 11-character Order ID (e.g. GMED-X8P2K7) along with your 10-digit mobile number to see real-time verification and dispatch updates.',
  },
  {
    id: 'issue-support',
    category: 'Orders & Tracking',
    q: 'Something is wrong with my order or medicines',
    a: `Please reach out right away to our direct helpline at ${SUPPORT_PHONE_DISPLAY}. Keep your Order ID handy so our pharmacists can resolve packaging or replacement issues immediately.`,
  },
];

const CATEGORIES = ['All', 'Payment & Billing', 'Delivery', 'Offers', 'Orders & Tracking'] as const;
type CategoryType = (typeof CATEGORIES)[number];

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [openIds, setOpenIds] = useState<string[]>(['payment']);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navbar Component */}
      <Navbar />

      {/* Main Content Area - Added pb-24 for mobile to avoid BottomNav overlap */}
      <main className="mx-auto max-w-2xl px-4 py-8 pb-28 sm:py-12 sm:pb-12 animate-in fade-in duration-300">
        
        {/* Page Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e5f7ed] px-3.5 py-1 text-xs font-bold text-[#147a4a] border border-[#bce8cd]">
            <HelpCircle className="h-3.5 w-3.5" /> Help Center & FAQs
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-muted">
            Quick answers to billing, prescriptions, free gifts, and delivery logistics in Goregaon East.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mt-8 group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-[#156253] transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, payment methods, delivery timings..."
            className="h-14 w-full rounded-2xl border border-gray-200 bg-white py-0 pl-12 pr-11 text-sm sm:text-base font-medium text-ink placeholder:font-normal placeholder:text-ink-soft shadow-sm outline-none transition-all focus:border-[#156253] focus:ring-4 focus:ring-[#156253]/10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-ink-soft hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "shrink-0 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all",
                  isActive
                    ? "bg-[#156253] text-white shadow-sm shadow-[#156253]/20"
                    : "bg-white text-ink-muted border border-gray-200 hover:border-gray-300 hover:text-ink"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="mt-6 space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openIds.includes(faq.id);

              return (
                <div
                  key={faq.id}
                  className={cn(
                    "overflow-hidden rounded-2xl bg-white border transition-all duration-200",
                    isOpen 
                      ? "border-[#156253]/30 shadow-sm ring-1 ring-[#156253]/10" 
                      : "border-gray-200/80 hover:border-gray-300"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                          {faq.category}
                        </span>
                        {faq.badge && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                            {faq.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-ink">
                        {faq.q}
                      </h3>
                    </div>

                    <div className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-50 text-ink-muted transition-transform duration-300",
                      isOpen && "rotate-180 bg-[#e5f7ed] text-[#147a4a]"
                    )}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-dashed border-gray-100 px-5 pb-5 pt-3 animate-in fade-in duration-200">
                      <p className="text-sm leading-relaxed text-ink-muted sm:text-[15px]">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <HelpCircle className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-base font-bold text-ink">No matching questions found</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Try searching with different terms or select &quot;All&quot; to browse all answers.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-4 inline-flex items-center rounded-xl bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Support & Quick Contact Banner */}
        <div className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#156253] to-[#0c3c33] p-6 text-white shadow-md sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#bce8cd] backdrop-blur-sm">
                <Clock className="h-3.5 w-3.5" /> 24x7 Pharmacist Help
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold pt-2">
                Have a question not listed here?
              </h2>
              <p className="text-xs sm:text-sm text-brand-100 max-w-sm">
                Speak directly to our verified Goregaon East pharmacists for prescription verification or urgent queries.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <a
                href={SUPPORT_PHONE_TEL}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-[#156253] shadow-sm transition-all hover:bg-brand-50 hover:shadow-md"
              >
                <Phone className="h-4 w-4" />
                <span>Call {SUPPORT_PHONE_DISPLAY}</span>
              </a>
              <Link
                href="/track"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Track Order</span>
              </Link>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Nav Component */}
      <BottomNav />
    </div>
  );
}