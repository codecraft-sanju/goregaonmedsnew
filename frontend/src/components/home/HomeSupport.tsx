import Image from 'next/image';
import { ArrowUpRight, Clock3, Headphones, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { BRANCHES, SUPPORT_PHONE_TEL } from '@/lib/constants';
import styles from './HomeExperience.module.css';

/** Server component. Replace the existing benefits/locations sections with this once. */
export function HomeSupport() {
  return <div className={styles.support}>
    <section className={styles.benefits} aria-label="Your neighbourhood pharmacy service">
      <div><span><Clock3 size={23} aria-hidden /></span><h2>24×7 Pharmacy</h2><p>Healthzone is here<br />around the clock</p></div>
      <div><span><Truck size={23} aria-hidden /></span><h2>Local delivery</h2><p>Goregaon East<br />& nearby areas</p></div>
      <div><span><ShieldCheck size={23} aria-hidden /></span><h2>Genuine medicines</h2><p>Care you can<br />count on</p></div>
      <a href={SUPPORT_PHONE_TEL}><span><Headphones size={23} aria-hidden /></span><h2>Need help?</h2><p>Talk to your<br />local pharmacy</p></a>
    </section>
    <section id="locations" className={styles.locations} aria-labelledby="pharmacies-title">
      <div className={styles.sectionHeading}><div><p>Good care. Close to home.</p><h2 id="pharmacies-title">Our pharmacies</h2></div><span>Goregaon East</span></div>
      <div className={styles.branchGrid}>{BRANCHES.map((branch) => <a key={branch.name}
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name}, ${branch.address}`)}`}
        className={styles.branch} target="_blank" rel="noopener noreferrer" aria-label={`${branch.name}, ${branch.address}. Open map in a new tab.`}>
        <div className={styles.branchArt}><Image src={`/home/pharmacy-${branch.tone}.svg`} alt={`Illustrated storefront for ${branch.name}`}
          width={480} height={260} sizes="(min-width: 768px) 360px, 250px" />
          {branch.open24x7 && <span>Open 24×7</span>}</div>
        <div className={styles.branchInfo}><MapPin size={19} aria-hidden /><div><h3>{branch.name}</h3><p>{branch.area}</p><small>{branch.address}</small></div><ArrowUpRight size={17} aria-hidden /></div>
      </a>)}</div>
      <p className={styles.artNote}>Storefront illustrations · Tap a pharmacy for its location.</p>
    </section>
  </div>;
}
