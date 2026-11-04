// src/components/offer-widgets.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Gift,
  Truck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useSettings } from '@/lib/hooks';
import { money, Cart } from '@/lib/api';
import '@/styles/offers.css';

// Constant matching backend src/services/offerService.js
export const OFFER_GIFT_DETAILS = {
  name: 'Dr. Morepen GlucoOne BG-03',
  shortName: 'GlucoOne BG-03 Glucometer',
  mrp: 650,
  image: '/glucoone.png',
} as const;

const POPUP_STORAGE_KEY = 'gm_welcome_offer_seen_v1';

/**
 * 1. TOP ANNOUNCEMENT BAR CONTENT (Used in shell.tsx)
 * Shows Free Delivery & First Order Gift trigger button dynamically
 */
export function AnnouncementPerks({
  onOpenOffer,
}: {
  onOpenOffer: () => void;
}) {
  const { data } = useSettings();
  const s = data?.settings;

  const isFreeDelivery = s ? s.deliveryCharge === 0 : false;
  const isOfferOn = s ? s.firstOrderOfferEnabled : false;
  const minAmount = s?.firstOrderMinimumMedicineAmount ?? 500;

  if (!isFreeDelivery && !isOfferOn) {
    return (
      <span>
        <Sparkles size={13} />A little local care. A healthier everyday.
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      {isFreeDelivery && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 650 }}>
          <Truck size={13} />
          FREE Home Delivery in Goregaon East
        </span>
      )}
      {isOfferOn && (
        <button
          type="button"
          className="gm-ann-Highlight"
          onClick={onOpenOffer}
          aria-label="View First Order Free Glucometer Offer"
        >
          <span className="gm-ann-dot" />
          <Gift size={12} />
          Free {OFFER_GIFT_DETAILS.shortName} (Worth ₹{OFFER_GIFT_DETAILS.mrp}) on ₹{minAmount}+ meds
        </button>
      )}
    </span>
  );
}

/**
 * 2. WELCOME POP-UP MODAL (Auto-opens once per session after SiteIntro, or manually)
 */
export function OfferPopupModal({
  manualOpen,
  onCloseManual,
}: {
  manualOpen: boolean;
  onCloseManual: () => void;
}) {
  const { data } = useSettings();
  const s = data?.settings;
  const [autoOpen, setAutoOpen] = useState(false);

  const isOfferOn = s?.firstOrderOfferEnabled === true;
  const isFreeDelivery = s?.deliveryCharge === 0;
  const minAmount = s?.firstOrderMinimumMedicineAmount ?? 500;

  useEffect(() => {
    if (!isOfferOn) return;
    try {
      const alreadySeen = sessionStorage.getItem(POPUP_STORAGE_KEY);
      if (alreadySeen) return;

      // Wait 2.1s so SiteIntro finishes smoothly first
      const timer = window.setTimeout(() => {
        setAutoOpen(true);
        sessionStorage.setItem(POPUP_STORAGE_KEY, '1');
      }, 2100);

      return () => window.clearTimeout(timer);
    } catch {
      // Ignore storage errors in private mode
    }
  }, [isOfferOn]);

  const isOpen = manualOpen || (isOfferOn && autoOpen);
  if (!isOpen || !isOfferOn) return null;

  const handleClose = () => {
    setAutoOpen(false);
    onCloseManual();
  };

  return (
    <div
      className="gm-popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gm-offer-popup-title"
      onClick={handleClose}
    >
      <div className="gm-popup-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="gm-popup-close"
          aria-label="Close offer"
          onClick={handleClose}
        >
          <X size={18} />
        </button>

        <div className="gm-popup-stage">
          <span className="gm-offer-badge-main">
            <Gift size={12} /> FIRST ORDER WELCOME GIFT
          </span>
          <Image
            src={OFFER_GIFT_DETAILS.image}
            alt={OFFER_GIFT_DETAILS.name}
            width={160}
            height={140}
            priority
          />
          <span className="gm-free-tag">
            <span className="gm-strike-mrp">MRP ₹{OFFER_GIFT_DETAILS.mrp}</span>
            FREE GIFT
          </span>
        </div>

        <div className="gm-popup-body">
          <h3 id="gm-offer-popup-title">
            Free {OFFER_GIFT_DETAILS.name}
          </h3>
          <p>
            Start your health journey with your neighbourhood pharmacy. Get a
            complimentary blood glucose monitor with your first medicine order!
          </p>

          <div className="gm-popup-perks">
            <div>
              <CheckCircle2 size={16} />
              <span>
                Order <strong>{money(minAmount)} or more</strong> in medicines
                (Catalog, Manual list, or Prescription)
              </span>
            </div>
            {isFreeDelivery && (
              <div>
                <Truck size={16} />
                <span>
                  Plus <strong>FREE Doorstep Delivery</strong> across Goregaon East
                </span>
              </div>
            )}
            <div>
              <ShieldCheck size={16} />
              <span>
                Pay via <strong>Cash or UPI on Delivery</strong> after pharmacy verification
              </span>
            </div>
          </div>

          <div className="gm-popup-actions">
            <Link
              href="/products/?kind=medicine"
              className="btn"
              onClick={handleClose}
            >
              Shop Medicines
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/cart/"
              className="btn secondary"
              onClick={handleClose}
            >
              Upload Prescription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. HOME PAGE SPOTLIGHT BANNER (Used in home.tsx)
 */
export function HomeOfferBanner() {
  const { data } = useSettings();
  const s = data?.settings;

  if (!s || (!s.firstOrderOfferEnabled && s.deliveryCharge > 0)) {
    return null;
  }

  const isOfferOn = s.firstOrderOfferEnabled;
  const isFreeDelivery = s.deliveryCharge === 0;
  const minAmount = s.firstOrderMinimumMedicineAmount ?? 500;

  // Case A: First-Order Gift Offer is Enabled (Show Product Image + Free Delivery)
  if (isOfferOn) {
    return (
      <section
        className="gm-offer-spotlight"
        aria-label="First order special offer"
      >
        <div className="gm-offer-visual">
          <span className="gm-offer-mrp-pill">
            <s>₹{OFFER_GIFT_DETAILS.mrp}</s> FREE
          </span>
          <Image
            src={OFFER_GIFT_DETAILS.image}
            alt={OFFER_GIFT_DETAILS.name}
            width={145}
            height={125}
          />
        </div>

        <div className="gm-offer-copy">
          <div className="gm-offer-badges">
            <span className="gm-offer-badge-main">
              <Gift size={12} /> FIRST ORDER EXCLUSIVE
            </span>
            {isFreeDelivery && (
              <span className="gm-offer-badge-sub">
                <Truck size={12} /> + FREE Home Delivery
              </span>
            )}
          </div>

          <h2>
            Get a Free <span>{OFFER_GIFT_DETAILS.name}</span> (Worth ₹
            {OFFER_GIFT_DETAILS.mrp})
          </h2>

          <p>
            Place your first medicine order of{' '}
            <strong>{money(minAmount)} or more</strong> — whether from our
            medicine catalog, your typed medicine list, or an uploaded
            prescription — and receive a complimentary Glucometer with your
            delivery.
          </p>
        </div>

        <div className="gm-offer-cta">
          <Link className="btn" href="/products/?kind=medicine">
            Order Medicines
            <ArrowRight size={17} />
          </Link>
          <small>Auto-applied at pharmacy billing</small>
        </div>
      </section>
    );
  }

  // Case B: Offer is OFF, but Free Delivery is ON (0 deliveryCharge)
  return (
    <div
      className="notice"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        margin: '24px 0',
        background: '#e7f4ec',
        borderColor: '#cfe3d5',
        color: '#104c42',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 650, fontSize: '12.5px' }}>
        <Truck size={18} color="var(--teal)" />
        Enjoy FREE Doorstep Delivery on all orders across Goregaon East!
      </span>
      <Link href="/products/" className="text-link" style={{ padding: 0, minHeight: 'auto' }}>
        Explore the shop <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/**
 * 4. CART & CHECKOUT INTERACTIVE MILESTONE CARD
 */
export function CartOfferTracker({ cart }: { cart?: Cart | null }) {
  const { data } = useSettings();
  const s = data?.settings;

  if (!s?.firstOrderOfferEnabled) return null;

  const minAmount = s.firstOrderMinimumMedicineAmount ?? 500;
  const medSubtotal = cart?.estimate?.medicineSubtotal ?? 0;
  const hasUnpricedMeds =
    (cart?.manualMedicines?.length ?? 0) > 0 ||
    (cart?.prescriptions?.length ?? 0) > 0;

  const isUnlockedByCatalog =
    medSubtotal >= minAmount || cart?.estimate?.offerApplied === true;
  const remaining = Math.max(0, minAmount - medSubtotal);
  const progressPct =
    minAmount > 0 ? Math.min(100, Math.round((medSubtotal / minAmount) * 100)) : 100;

  return (
    <div className={`gm-cart-offer ${isUnlockedByCatalog ? 'is-unlocked' : ''}`}>
      <div className="gm-cart-offer-top">
        <div className="gm-cart-offer-thumb">
          <Image
            src={OFFER_GIFT_DETAILS.image}
            alt={OFFER_GIFT_DETAILS.name}
            width={50}
            height={50}
          />
          <span className="gm-cart-offer-free-dot">FREE</span>
        </div>

        <div className="gm-cart-offer-info">
          <div className="gm-cart-offer-eyebrow">
            {isUnlockedByCatalog ? (
              <>
                <CheckCircle2 size={12} /> FIRST-ORDER GIFT UNLOCKED
              </>
            ) : (
              <>
                <Gift size={12} /> FIRST-ORDER GIFT (WORTH ₹{OFFER_GIFT_DETAILS.mrp})
              </>
            )}
          </div>

          <h4>{OFFER_GIFT_DETAILS.name}</h4>

          {isUnlockedByCatalog ? (
            <p>
              <strong>Unlocked!</strong> Your medicine total meets the{' '}
              {money(minAmount)} threshold. Gift eligibility is confirmed for
              first-time customers at billing.
            </p>
          ) : hasUnpricedMeds ? (
            <p>
              You have attached a prescription / medicine list. If your final
              medicine bill is <strong>{money(minAmount)}+</strong> on your first
              order, this gift is included <strong>FREE</strong>!
            </p>
          ) : (
            <p>
              Add <strong>{money(remaining)} more in medicines</strong> to unlock
              your FREE Glucometer on your first order.
            </p>
          )}
        </div>
      </div>

      {!isUnlockedByCatalog && (
        <div className="gm-progress-wrap">
          <div className="gm-progress-bar">
            <div
              className="gm-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="gm-progress-labels">
            <span>Catalog Meds: {money(medSubtotal)}</span>
            <span>Goal: {money(minAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}