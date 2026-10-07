//src/components/layout/Navbar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, MapPin, Phone, Search } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '@/lib/constants';
import { Logo } from './Logo';
import styles from '../home/HomeExperience.module.css';

const links = [
  { href: '/order', label: 'Order' },
  { href: '/track', label: 'Track & Orders' },
  { href: '/#locations', label: 'Pharmacies' },
  { href: '/#faq', label: 'FAQ' },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className={styles.header} data-scrolled={scrolled}>
    <nav className={styles.navbar} aria-label="Main navigation">
      <div className={styles.logo}><Logo /></div>
      <Link href="/#locations" className={styles.headerLocation}><MapPin size={14} aria-hidden />Goregaon East</Link>
      <div className={styles.desktopLinks}>{links.map(({ href, label }) => <Link key={href} href={href}
        aria-current={!href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined}>{label}</Link>)}</div>
      <div className={styles.navActions}>
        <Link href="/search" className={styles.iconButton} aria-label="Search medicines"><Search size={21} aria-hidden /></Link>
        <a href={SUPPORT_PHONE_TEL} className={styles.phone} aria-label={`Call support at ${SUPPORT_PHONE_DISPLAY}`}><Phone size={19} aria-hidden /><span>{SUPPORT_PHONE_DISPLAY}</span></a>
        <Link href="/order" className={styles.navOrder}>Order now <ArrowRight size={16} aria-hidden /></Link>
      </div>
    </nav>
  </header>;
}
