//src/app/page.tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { OfferPopup } from '@/components/home/OfferPopup';
import { OrderMethods } from '@/components/home/OrderMethods';
import { WhyChoose } from '@/components/home/WhyChoose';
import { Highlight24x7 } from '@/components/home/Highlight24x7';
import { HowItWorks } from '@/components/home/HowItWorks';
import { DeliveryInfo } from '@/components/home/DeliveryInfo';
import { TrackCta } from '@/components/home/TrackCta';
import { Locations } from '@/components/home/Locations';
import { Faq } from '@/components/home/Faq';
import { LateNightBanner } from '@/components/home/LateNightBanner';
import { PharmacyNotice } from '@/components/home/PharmacyNotice';

export default function HomePage() {
  return (
    <>
      <LateNightBanner />
      <Navbar />
      <main>
        <Hero />
        <OrderMethods />
        <WhyChoose />
        <Highlight24x7 />
        <HowItWorks />
        <DeliveryInfo />
        <TrackCta />
        <Locations />
        <Faq />
        <div className="container-app">
          <PharmacyNotice />
        </div>
      </main>
      <Footer />
      <OfferPopup />
    </>
  );
}