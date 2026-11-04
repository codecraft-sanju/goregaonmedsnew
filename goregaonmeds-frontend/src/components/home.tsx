// src/components/home.tsx
'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  ArrowRight,
  Upload,
  ClipboardList,
  ShieldCheck,
  MapPin,
  Wallet,
  Heart,
  Leaf,
  Pill,
  Droplets,
  Sun,
  Activity,
  ChevronRight,
  HeartPulse,
  Truck,
} from 'lucide-react';
import { Trending } from '@/features/catalog';
import { useSettings } from '@/lib/hooks';
import { HomeOfferBanner } from './offer-widgets';

// Category images
const categoryImages = {
  Medicines: '/images/categories/medicines.webp',
  'Everyday wellness': '/images/categories/everyday-wellness.webp',
  'Skin & personal care': '/images/categories/skin-personal-care.webp',
  'Vitamins & supplements': '/images/categories/vitamins-supplements.webp',
  'Health devices': '/images/categories/health-devices.webp',
};

export default function Home() {
  const { data: settingsData } = useSettings();
  const isFreeDelivery = settingsData?.settings.deliveryCharge === 0;

  return (
    <div className="container home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="green-dot" />
            GOOD HEALTH STARTS CLOSE TO HOME
          </div>
          <h1>
            Your neighbourhood.
            <br />
            Your health.
            <br />
            <span>Our care.</span>
            <svg viewBox="0 0 255 13" aria-hidden="true">
              <path
                d="M3 9Q111 -4 251 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p>
            From everyday essentials to the medicines you need.
            <br className="desktop-only" />
            Your local pharmacy, now a little closer.
          </p>
          <div className="hero-actions">
            <Link className="btn" href="/products/">
              Explore the shop
              <ArrowRight size={18} />
            </Link>
            <Link className="hero-secondary" href="/cart/">
              <Upload size={18} />
              Upload prescription
            </Link>
          </div>
          <div className="hero-foot">
            <span>
              <ShieldCheck size={16} />
              Pharmacy-reviewed orders
            </span>
            <i />
            <span>
              <Wallet size={16} />
              Pay at your doorstep
            </span>
            {isFreeDelivery && (
              <>
                <i />
                <span style={{ color: 'var(--teal)', fontWeight: 700 }}>
                  <Truck size={16} />
                  Free Home Delivery
                </span>
              </>
            )}
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a GoregaonMeds care bag and wellness essentials"
          role="img"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-star star-one">✳</div>
          <div className="art-star star-two">✧</div>
          <div className="float-label label-top">
            <span>
              <MapPin size={18} />
            </span>
            <div>
              Good care. Right here.
              <small>From your neighbourhood pharmacy</small>
            </div>
          </div>
          <div className="plant">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} />
            ))}
          </div>
          <div className="care-bag">
            <div className="bag-handle" />
            <div className="bag-body">
              <div className="bag-logo">
                <HeartPulse size={37} />
              </div>
              <strong>goregaonmeds</strong>
              <span>
                a little care.
                <br />
                every day.
              </span>
              <div className="bag-line" />
              <small>YOUR NEIGHBOURHOOD PHARMACY</small>
            </div>
          </div>
          <div className="wellness-bottle">
            <div className="bottle-cap" />
            <div className="bottle-body">
              <Leaf size={21} />
              <span>
                DAILY
                <br />
                <b>wellness</b>
              </span>
              <small>CARE FOR YOUR EVERYDAY</small>
            </div>
          </div>
          <div className="pill-strip">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <i key={i} />
            ))}
          </div>

          <div className="hero-art-caption">
            THOUGHTFUL CARE, DELIVERED LOCALLY
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <span>
          <MapPin />
          Rooted in Goregaon East
        </span>
        <span>
          <ShieldCheck />
          Orders reviewed by the pharmacy
        </span>
        <span>
          <Wallet />
          Cash or UPI on delivery
        </span>
        <span>
          {isFreeDelivery ? (
            <>
              <Truck />
              Free home delivery in Goregaon East
            </>
          ) : (
            <>
              <Heart />
              Care for the whole family
            </>
          )}
        </span>
      </div>

      {/* Dynamic Offer Spotlight & Free Delivery Banner */}
      <HomeOfferBanner />

      <section className="order-paths">
        <Link href="/cart/" className="path-card prescription-card">
          <div className="path-icon">
            <Upload size={25} />
          </div>
          <div>
            <span className="eyebrow">HAVE A PRESCRIPTION?</span>
            <h3>Upload. We’ll take it from here.</h3>
            <p>Share your prescription for pharmacy review.</p>
          </div>
          <span className="circle-arrow">
            <ArrowUpRight size={22} />
          </span>
          <div className="rx-paper">
            ℞<i />
            <i />
            <i />
          </div>
        </Link>
        <Link href="/cart/" className="path-card list-card">
          <div className="path-icon">
            <ClipboardList size={25} />
          </div>
          <div>
            <span className="eyebrow">KNOW WHAT YOU NEED?</span>
            <h3>Your list. Our attention.</h3>
            <p>Add medicine names and quantities to your order.</p>
          </div>
          <span className="circle-arrow">
            <ArrowUpRight size={22} />
          </span>
        </Link>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">FOR EVERY KIND OF EVERYDAY</div>
            <h2>Find your kind of care.</h2>
          </div>
          <Link className="text-link" href="/products/">
            Browse everything
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {[
            {
              name: 'Medicines',
              sub: 'Your health essentials',
              icon: Pill,
              color: 'mint',
              href: '/products/?kind=medicine',
            },
            {
              name: 'Everyday wellness',
              sub: 'Small steps, better days',
              icon: Leaf,
              color: 'sand',
              href: '/products/?kind=non_medicine',
            },
            {
              name: 'Skin & personal care',
              sub: 'A little care for you',
              icon: Droplets,
              color: 'peach',
              href: '/products/?q=skin',
            },
            {
              name: 'Vitamins & supplements',
              sub: 'Support your everyday',
              icon: Sun,
              color: 'lavender',
              href: '/products/?q=vitamin',
            },
            {
              name: 'Health devices',
              sub: 'Care you can keep track of',
              icon: Activity,
              color: 'blue',
              href: '/products/?q=monitor',
            },
          ].map((c) => (
            <Link className="category-card" href={c.href} key={c.name}>
              <div className={`category-art ${c.color}`}>
                <Image
                  src={categoryImages[c.name as keyof typeof categoryImages]}
                  alt={c.name}
                  fill
                  sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 220px"
                  className="category-image"
                />
              </div>
              <h3>{c.name}</h3>
              <p>{c.sub}</p>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <Trending />
      <section className="care-banner">
        <div className="care-banner-icon">
          <HeartPulse size={45} />
        </div>
        <div>
          <div className="eyebrow">LOCAL KNOW-HOW. EVERYDAY CONVENIENCE.</div>
          <h2>
            A familiar face.
            <br />A simpler way to care.
          </h2>
          <p>
            Connected to your neighbourhood pharmacies.
            <br />
            Built around your everyday needs.
          </p>
        </div>
        <Link className="btn light" href="/contact/">
          Meet your pharmacies
          <ArrowUpRight size={18} />
        </Link>
        <span className="banner-flower">✳</span>
      </section>
      <section className="section how-section">
        <div>
          <div className="eyebrow">LESS TO DO. MORE PEACE OF MIND.</div>
          <h2>
            Care at your doorstep.
            <br />
            In three simple steps.
          </h2>
          <Link href="/faq/" className="text-link">
            A few helpful answers
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              '01',
              'Tell us what you need',
              'Shop essentials, write your medicine list, or upload a prescription.',
            ],
            [
              '02',
              'Your pharmacy reviews it',
              'Availability and your final bill are confirmed by the pharmacy.',
            ],
            [
              '03',
              'Pay when it arrives',
              'Receive your order and pay at delivery with cash or UPI.',
            ],
          ].map(([n, h, p]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="medicine-notice">
        <ShieldCheck size={20} />
        <p>
          Medicines are subject to availability and pharmacy review. A valid
          prescription may be required. Always follow advice from your qualified
          healthcare professional.
        </p>
        <Link href="/prescription-notice/">
          Learn more
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}