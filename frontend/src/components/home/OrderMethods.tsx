//src//components/home/OrderMethods.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Clock3, Gift, MapPin, Search, X } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { GIFT, SERVICE_AREA } from '@/lib/constants';
import styles from './HomeExperience.module.css';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

function Entrance({ children, delay = 0, className }: {
  children: ReactNode; delay?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false}
    animate={{ opacity: 1, y: 0 }}
    whileInView={reduced ? undefined : { y: [8, 0] }} viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: reduced ? 0 : 0.35, delay }}>{children}</motion.div>;
}

function GiftImage({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  return <Image src={failed ? '/home/glucose-meter.svg' : GIFT.image}
    alt={failed ? `Illustration of a glucose meter; offer product: ${GIFT.name}` : GIFT.name}
    width={420} height={360} sizes="(min-width: 768px) 320px, 150px"
    className={className} onError={() => setFailed(true)} />;
}

/** Existing settings and routes remain authoritative. onOpenOffer can reuse a parent-owned popup. */
export function OrderMethods({ onOpenOffer }: { onOpenOffer?: () => void } = {}) {
  const { settings, loading } = usePublicSettings();
  const reduced = useReducedMotion();
  const showOffer = !loading && settings.firstOrderOfferEnabled;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!detailsOpen || !showOffer) return;
    const node = dialog.current;
    if (!node) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      (previouslyFocused ?? opener.current)?.focus();
    };
  }, [detailsOpen, showOffer]);

  useEffect(() => { if (!showOffer) setDetailsOpen(false); }, [showOffer]);

  return <section id="order-methods" className={styles.home} aria-labelledby="methods-title">
    <Entrance className={styles.hero}>
      <div className={styles.heroCopy}>
        <a href="/#locations" className={styles.location}><MapPin size={13} aria-hidden />{SERVICE_AREA}</a>
        <p className={styles.greeting}>Namaste <span aria-hidden>👋</span></p>
        <h1 id="methods-title">What do you<br />need today?</h1>
        <p className={styles.intro}>Order your medicines quickly and easily.</p>
      </div>
      <div className={styles.heroArt} aria-hidden="true">
        <Image src="/home/hero-pharmacy.svg" alt="" width={520} height={440}
          priority sizes="(min-width: 768px) 450px, 190px" />
        <span className={styles.hours}><Clock3 size={19} /><span><strong>24×7</strong>Pharmacy</span></span>
      </div>
      <Link href="/search" className={styles.search}>
        <Search size={22} aria-hidden /><span>Search for medicines, vitamins, wellness…</span>
        <span className={styles.searchArrow}><ArrowRight size={20} aria-hidden /></span>
      </Link>
    </Entrance>

    {loading && <div className={styles.offerSkeleton} role="status" aria-label="Loading offer settings" />}
    {showOffer && <Entrance delay={0.05}>
      <motion.div className={styles.offer} whileHover={reduced ? undefined : { y: -3 }}>
        <div className={styles.offerCopy}>
          <span className={styles.eyebrow}><Gift size={14} aria-hidden />First order gift</span>
          <h2><span>FREE</span> Dr. Morepen<br />{GIFT.shortName}</h2>
          <p>On your first medicine order of <strong>{currency.format(settings.firstOrderMinimumMedicineAmount)}+</strong>.</p>
          <p className={styles.mrp}>Gift MRP <s>{currency.format(GIFT.mrp)}</s> · Yours free</p>
          <button ref={opener} className={styles.knowMore} type="button"
            aria-haspopup="dialog" onClick={() => onOpenOffer ? onOpenOffer() : setDetailsOpen(true)}>
            Know more <ArrowRight size={17} aria-hidden />
          </button>
        </div>
        <GiftImage className={styles.giftArt} />
        <span className={styles.giftSeal} aria-hidden="true"><Gift size={18} />FREE<br />GIFT</span>
      </motion.div>
    </Entrance>}

    <div className={styles.methods}>
      <Entrance delay={0.1}>
        <Link href="/order?method=prescription" className={`${styles.method} ${styles.prescription}`}>
          <span className={styles.recommended}>Recommended</span>
          <h2>Upload<br />Prescription</h2>
          <p>Take a photo or upload your prescription. We’ll take care of the rest.</p>
          <Image className={styles.methodArt} src="/home/prescription-art.svg" alt=""
            width={300} height={260} sizes="(min-width: 768px) 220px, 140px" />
          <span className={styles.methodCta}>Upload prescription <ArrowRight size={17} aria-hidden /></span>
        </Link>
      </Entrance>
      <Entrance delay={0.15}>
        <Link href="/order?method=manual" className={`${styles.method} ${styles.manual}`}>
          <span className={styles.methodKicker}>A few words. All sorted.</span>
          <h2>Order<br />via Text</h2>
          <p>Enter medicine names and quantities (e.g. 1 strip, 10 tablets).</p>
          <Image className={styles.methodArt} src="/home/text-order-art.svg" alt=""
            width={300} height={260} sizes="(min-width: 768px) 220px, 140px" />
          <span className={styles.methodCta}>Order via text <ArrowRight size={17} aria-hidden /></span>
        </Link>
      </Entrance>
    </div>

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="gift-title" aria-describedby="gift-description"
      onCancel={() => setDetailsOpen(false)} onClose={() => setDetailsOpen(false)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setDetailsOpen(false);
      }}>
      <button ref={closeButton} className={styles.close} aria-label="Close offer details" type="button" onClick={() => setDetailsOpen(false)}><X size={21} /></button>
      <div className={styles.dialogArt}><GiftImage /></div>
      <div className={styles.dialogCopy}>
        <span className={styles.eyebrow}>A little care, on us</span>
        <h2 id="gift-title">Your first order.<br />An extra reason to smile.</h2>
        <p id="gift-description">Get a <strong>{GIFT.name}</strong> free with your first qualifying medicine order of <strong>{currency.format(settings.firstOrderMinimumMedicineAmount)} or more</strong>.</p>
        <ul><li>The minimum applies to medicines only.</li><li>A one-time gift for eligible first orders.</li><li>Final eligibility is confirmed with your order.</li></ul>
        <Link href="/order" className={styles.solidButton} onClick={() => setDetailsOpen(false)}>Order medicines <ArrowRight size={18} aria-hidden /></Link>
      </div>
    </dialog>
  </section>;
}
