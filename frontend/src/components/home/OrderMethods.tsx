// src/components/home/OrderMethods.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock3,
  Gift,
  MapPin,
  Search,
  X,
  ArrowUpRight,
  Mic,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Camera,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/components/ui/Toast'; // <-- Added Toast
import type { Product } from '@/lib/types'; 

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface PublicSettings {
  deliveryCharge: number;
  firstOrderOfferEnabled: boolean;
  firstOrderMinimumMedicineAmount: number;
}

const SERVICE_AREA = 'Goregaon East, Mumbai';

const GIFT = {
  name: 'Dr. Morepen GlucoOne BG-03',
  shortName: 'GlucoOne BG-03',
  mrp: 650,
  image: '/glucoone-bg03.png',
} as const;

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  deliveryCharge: 0,
  firstOrderOfferEnabled: true,
  firstOrderMinimumMedicineAmount: 500,
};

const BRANCHES = [
  {
    name: 'Apple Pharmacy',
    shortName: 'Apple Pharmacy',
    area: 'Aarey Road',
    address: 'Shop No. 9, Sheetal Krupa Building, Ground Floor, Aarey Road, Goregaon East, Mumbai',
    tone: 'apple',
    open24x7: false,
  },
  {
    name: 'Lotus Pharmacy',
    shortName: 'Lotus Pharmacy',
    area: 'Jay Prakash Nagar',
    address: "Shop No. 10, Shreyas Bhavan, Jay Prakash Nagar Road No. 1, Opp. Domino's Pizza, Goregaon East, Mumbai",
    tone: 'lotus',
    open24x7: false,
  },
  {
    name: 'Healthzone & Cosmetic',
    shortName: 'Healthzone',
    area: 'Aarey Road',
    address: 'Pednekar Chawl, Shop No. 3, Ground Floor, S.V. Aarey Road, Goregaon East, Mumbai',
    tone: 'health',
    open24x7: true,
  },
] as const;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

let cachedSettingsPromise: Promise<PublicSettings> | null = null;

function fetchSettings(): Promise<PublicSettings> {
  cachedSettingsPromise ??= fetch('/api/settings/public')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    })
    .then((data) => data.settings)
    .catch((error) => {
      cachedSettingsPromise = null;
      throw error;
    });
  return cachedSettingsPromise;
}

function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((value) => active && setSettings(value))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}

function Entrance({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string; }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={false}
      animate={{ opacity: 1, y: 0 }}
      whileInView={reduced ? undefined : { y: [8, 0] }} viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: reduced ? 0 : 0.35, delay }}>
      {children}
    </motion.div>
  );
}

function GiftImage({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image src={failed ? '/home/glucose-meter.svg' : GIFT.image}
      alt={failed ? `Illustration of a glucose meter; offer product: ${GIFT.name}` : GIFT.name}
      width={420} height={360} sizes="(min-width: 768px) 320px, 150px"
      className={className} onError={() => setFailed(true)} 
    />
  );
}

/** Trending Products Sub-Component */
function TrendingProducts() {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(['All', ...data.categories]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = activeCategory === 'All' 
      ? '/api/products/trending' 
      : `/api/products/trending?category=${encodeURIComponent(activeCategory)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="mt-8 md:mt-12 pb-4">
      <div className="flex items-end justify-between mb-4 md:mb-5 px-1 md:px-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShoppingBag className="w-4 h-4 text-[#156253]" />
            <p className="text-[10px] md:text-[11px] font-bold text-[#156253] uppercase tracking-widest m-0">
              Trending
            </p>
          </div>
          <h2 className="text-[22px] md:text-[28px] font-extrabold m-0 font-display tracking-tight text-[#0F1F1C]">
            Everyday Essentials
          </h2>
        </div>
        
        <Link 
          href="/store" 
          className="group flex items-center gap-1.5 text-[12px] md:text-[13px] font-bold text-[#156253] bg-[#eef7f5] px-4 py-2 md:py-2.5 rounded-full transition-all hover:bg-[#156253] hover:text-white ring-1 ring-inset ring-[#156253]/10 hover:ring-[#156253]"
        >
          See all
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-4 px-1 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "relative px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[13px] md:text-[14px] font-bold whitespace-nowrap snap-start transition-colors z-10 active:scale-[0.98]",
                isActive ? "text-white" : "text-[#52675F] bg-white ring-1 ring-inset ring-gray-200 hover:bg-[#F6FAF8] hover:ring-[#156253]/20"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryTab"
                  className="absolute inset-0 bg-[#156253] rounded-full -z-10 shadow-[0_4px_12px_rgba(21,98,83,0.25)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {category}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-6 pt-1 px-1 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[145px] md:w-[170px] snap-start bg-white border border-gray-100 rounded-[20px] p-2.5 md:p-3 animate-pulse">
              <div className="h-[120px] md:h-[130px] w-full bg-gray-100 rounded-[14px] mb-3" />
              <div className="h-2.5 w-1/2 bg-gray-100 rounded mb-2.5" />
              <div className="h-3.5 w-3/4 bg-gray-200 rounded mb-4" />
              <div className="flex justify-between items-end">
                <div className="h-5 w-1/3 bg-gray-100 rounded" />
                <div className="h-7 w-7 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="w-full py-8 text-center bg-gray-50 rounded-[24px] border border-gray-100 border-dashed">
            <p className="text-sm font-medium text-[#52675F]">No products found in this category.</p>
          </div>
        ) : (
          products.map((product) => {
            const cartItem = cartItems.find(item => item.product._id === product._id);
            return (
              <div 
                key={product._id}
                className={cn(
                  "shrink-0 w-[145px] md:w-[170px] snap-start bg-white border rounded-[20px] p-2.5 md:p-3 shadow-sm transition-all duration-300 relative group flex flex-col",
                  cartItem ? "border-[#156253] ring-1 ring-[#156253]" : "border-gray-100 hover:shadow-[0_8px_24px_rgba(21,98,83,0.08)] hover:border-[#156253]/20"
                )}
              >
                <div className="h-[120px] md:h-[130px] w-full bg-[#F8FBFB] rounded-[14px] mb-3 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="h-full w-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <ShoppingBag className="w-8 h-8 text-[#156253]/15" />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-extrabold text-[#156253] uppercase tracking-widest mb-1.5 line-clamp-1">
                      {product.category}
                    </p>
                    <h3 className="text-[13px] md:text-[14px] font-bold text-[#0F1F1C] line-clamp-2 leading-[1.3] min-h-[34px] md:min-h-[36px]">
                      {product.name}
                    </h3>
                  </div>
                  
                  <div className="mt-3 md:mt-4 flex items-end justify-between">
                    <span className="font-display text-[16px] md:text-[18px] font-extrabold text-[#0F1F1C]">
                      {currency.format(product.price)}
                    </span>
                    
                    {!cartItem ? (
                      <button 
                        type="button"
                        onClick={() => addItem(product)}
                        className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-[#F6FAF8] text-[#156253] grid place-items-center hover:bg-[#156253] hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156253] active:scale-95 shadow-sm"
                        aria-label={`Add ${product.name} to order`}
                      >
                        <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-[#F6FAF8] rounded-full px-1 py-0.5 border border-[#156253]/10">
                        <button 
                          type="button" 
                          onClick={() => {
                            if (cartItem.quantity === 1) removeItem(product._id);
                            else updateQuantity(product._id, cartItem.quantity - 1);
                          }} 
                          className="h-6 w-6 rounded-full bg-white text-[#156253] grid place-items-center shadow-sm active:scale-95"
                        >
                          {cartItem.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="text-xs font-bold w-4 text-center text-[#156253]">{cartItem.quantity}</span>
                        <button 
                          type="button" 
                          onClick={() => updateQuantity(product._id, cartItem.quantity + 1)} 
                          className="h-6 w-6 rounded-full bg-[#156253] text-white grid place-items-center shadow-sm active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** HomeSupport Sub-Component */
function HomeSupport() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (isInteracting) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollWidth <= clientWidth) return;
        const scrollAmount = clientWidth * 0.85;

        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, [isInteracting]);

  return (
    <div className="w-[min(100%-36px,1200px)] mx-auto pb-[30px] md:pb-[50px] text-[#0f1f1c] font-body [&_*]:box-border">
      <section id="locations" className="scroll-mt-[100px] bg-[linear-gradient(120deg,#eef7f5,#f5faf8)] rounded-[24px] p-[18px_14px] md:p-[25px]" aria-labelledby="pharmacies-title">
        <div className="flex items-center justify-between gap-[10px] mb-[16px]">
          <div>
            <p className="text-[10px] md:text-[12px] text-[#56776b] m-0 mb-[3px]">Visit us</p>
            <h2 id="pharmacies-title" className="text-[21px] md:text-[29px] font-[800] m-0 font-display tracking-[-0.055em]">Our Pharmacies</h2>
          </div>
          <span className="text-[10px] md:text-[12px] font-[600] text-[#156253] whitespace-nowrap">Goregaon East</span>
        </div>
        
        <div 
          className="grid grid-flow-col auto-cols-[85%] md:grid-cols-3 md:grid-flow-row md:auto-cols-auto gap-[12px] overflow-x-auto md:overflow-visible snap-x snap-mandatory p-[3px_3px_12px] [scrollbar-width:thin] [scrollbar-color:#bbd9cd_transparent] md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none]" 
          ref={scrollRef}
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onTouchStart={() => setIsInteracting(true)}
          onTouchEnd={() => setIsInteracting(false)}
        >
          {BRANCHES.map((branch) => (
            <a key={branch.name}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${branch.name},${branch.address}`)}`}
              className="block snap-start rounded-[17px] overflow-hidden bg-white border border-[#e2eee7] transition-all duration-200 text-[#0f1f1c] hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(20,81,63,0.07)] active:scale-[0.985] group/branch no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4" 
              target="_blank" rel="noopener noreferrer" aria-label={`${branch.name}, ${branch.address}. Open map in a new tab.`}>
              <div className="relative overflow-hidden bg-[#e7f0e8]">
                <Image src={`/home/pharmacy-${branch.tone}.png`} alt={`Illustrated storefront for ${branch.name}`}
                  width={480} height={260} sizes="(min-width: 768px) 360px, 250px" className="block w-full h-auto aspect-[480/260] object-cover transition-transform duration-300 group-hover/branch:scale-[1.03]" />
                {branch.open24x7 && <span className="absolute top-[9px] right-[9px] rounded-[12px] bg-white p-[5px_8px] text-[#156253] text-[10px] font-[700]">Open 24×7</span>}
              </div>
              <div className="flex items-start gap-[7px] p-[13px_11px] min-[1100px]:p-[17px]">
                <MapPin size={19} className="shrink-0 text-[#156253] mt-[2px]" aria-hidden />
                <div><h3 className="m-0 text-[12px] md:text-[13px] min-[1100px]:text-[15px] font-[750] leading-[1.4]">{branch.name}</h3><p className="m-0 mt-1 text-[11px] md:text-[12px] text-[#586963]">{branch.area}</p><small className="block text-[10px] md:text-[11px] leading-[1.5] text-[#586963] mt-[6px]">{branch.address}</small></div>
                <ArrowUpRight size={17} className="ml-auto shrink-0 text-[#156253] mt-[2px]" aria-hidden />
              </div>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-[#526d61] m-[9px_0_0]">Storefront illustrations · Tap a pharmacy for its location.</p>
      </section>
    </div>
  );
}

/** Main OrderMethods Component */
export function OrderMethods({ onOpenOffer }: { onOpenOffer?: () => void } = {}) {
  const router = useRouter();
  const toast = useToast(); // <-- Added Toast
  const { settings, loading } = usePublicSettings();
  const reduced = useReducedMotion();
  const showOffer = !loading && settings.firstOrderOfferEnabled;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isListening, setIsListening] = useState(false);
  
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

  // Standard Text Search Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/store?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Industry Standard Web Speech API (Voice Search) Handler
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice search is not supported in your browser.");
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.lang = 'en-IN'; // Indian English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSearchQuery(''); // Clear input while speaking
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      // Auto-submit search after voice recognition
      setTimeout(() => {
        router.push(`/store?q=${encodeURIComponent(transcript)}`);
      }, 500);
    };

    // FIXED: Proper Error Handling via Toast
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast.error('Microphone access blocked. Please enable it in browser settings.');
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Try again.');
      } else {
        toast.error('Voice search error. Please type to search.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <>
      <style>{`
        @keyframes sheet-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <section id="order-methods" className="w-[min(100%-36px,1200px)] mx-auto pt-1 md:pt-3 scroll-mt-[90px] text-[#0f1f1c] font-body [&_*]:box-border" aria-labelledby="methods-title">
        <Entrance className="relative grid grid-cols-[minmax(0,1fr)] md:grid-cols-[1.15fr_1fr] md:grid-rows-[auto_auto] isolate pt-[6px] md:pt-[20px] mb-5 md:mb-[28px] md:px-4 md:min-h-[350px] min-[1100px]:px-[30px] min-[1100px]:min-h-[410px] before:content-[''] before:absolute before:-inset-y-[10px] before:-inset-x-4 before:-z-10 before:bg-[radial-gradient(ellipse_at_90%_32%,#d9f4e6_0%,#effaf480_43%,transparent_72%)] before:rounded-[36px]">
          <div className="relative z-10 min-h-[135px] min-[560px]:min-h-[230px] md:min-h-0 md:col-start-1 min-[1100px]:pt-[10px] pointer-events-none [&>a]:pointer-events-auto [&>form]:pointer-events-auto">
          <Link href="/#locations" className="inline-flex items-center gap-1 text-[#156253] text-[9.5px] md:text-[11px] font-[650] mb-2 md:mb-4 no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985] transition-transform">
            <MapPin size={13} aria-hidden />{SERVICE_AREA}
          </Link>
            <p className="text-[14px] md:text-[20px] font-semibold text-[#69736f] m-0 mb-[2px] tracking-[-0.025em]">Namaste <span aria-hidden>👋</span></p>
            <h1 id="methods-title" className="text-[clamp(24px,7vw,30px)] max-[359px]:text-[22px] min-[560px]:text-[42px] md:text-[clamp(38px,4.5vw,60px)] min-[1100px]:text-[61px] leading-[1.05] md:leading-[1.04] font-extrabold m-0 max-w-[65%] md:max-w-full text-balance tracking-[-0.055em] font-display text-[#0f1f1c]">What do you<br />need today?</h1>
            <p className="text-[11px] min-[560px]:text-[14px] md:text-[15px] leading-[1.5] max-w-[61%] md:max-w-[90%] m-[6px_0_12px] md:m-[16px_0_20px] text-[#586963]">Order your medicines quickly and easily.</p>
          </div>
          <div className="absolute right-[-10px] top-[15px] max-[359px]:top-[25px] w-[44%] max-[359px]:w-[42%] min-[560px]:w-[46%] max-w-[200px] min-[560px]:max-w-[290px] z-[1] pointer-events-none md:static md:col-start-2 md:row-[1/3] md:w-full md:max-w-[460px] md:right-auto md:top-auto md:self-center" aria-hidden="true">
            <Image src="/home/hero-pharmacy.svg" alt="" width={520} height={440}
              priority sizes="(min-width: 768px) 450px, 190px" className="w-full h-auto drop-shadow-[0_16px_12px_rgba(36,108,75,0.07)] md:max-h-[350px] min-[1100px]:max-h-[390px] md:object-contain" />
            <span className="absolute top-[2%] max-[359px]:hidden right-[5%] flex items-center gap-[5px] bg-[rgba(255,255,255,0.93)] shadow-[0_8px_22px_rgba(18,91,75,0.09)] p-[5px_7px] md:p-[12px_16px] rounded-[10px] -rotate-8 text-[#174f46] text-[8px] md:text-[12px] leading-[1.25] md:right-[12%] md:top-[5%]"><Clock3 size={19} className="shrink-0 w-[14px] h-[14px] md:w-[19px] md:h-[19px]" /><span><strong className="block text-[10.5px] md:text-[17px]">24×7</strong>Pharmacy</span></span>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="relative z-30 flex items-center gap-[11px] min-h-[50px] md:min-h-[56px] p-[5px_5px_5px_14px] md:p-[6px_6px_6px_16px] border border-[#e6eeea] rounded-[30px] bg-[rgba(255,255,255,0.94)] shadow-[0_6px_22px_rgba(28,115,85,0.07)] transition-all duration-200 hover:shadow-[0_6px_25px_rgba(28,115,85,0.13)] pointer-events-auto md:col-start-1 md:self-start md:mt-[6px]">
            <Search size={21} className="shrink-0 text-[#8fa69d]" aria-hidden />
            <input 
              type="text" 
              name="q"
              placeholder={isListening ? "Listening..." : "Search for medicines, vitamins..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("flex-1 border-none bg-transparent text-[13px] text-[#0f1f1c] outline-none font-inherit p-0 placeholder:text-[#799188]", isListening && "text-[#156253] font-medium")}
            />
            <div className="relative w-[38px] h-[38px] md:w-10 md:h-10 shrink-0 ml-auto">
              <AnimatePresence>
                {searchQuery.trim().length > 0 ? (
                  <motion.button
                    key="send"
                    type="submit"
                    initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.3, opacity: 0, rotate: 45 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute inset-0 grid place-items-center w-full h-full rounded-full border-none cursor-pointer bg-[#156253] text-white shadow-[0_4px_10px_rgba(21,98,83,0.25)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985]"
                    aria-label="Search"
                  >
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </motion.button>
                ) : (
                  <motion.button
                    key="mic"
                    type="button"
                    onClick={handleVoiceSearch}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ 
                      scale: isListening ? [1, 1.15, 1] : 1, 
                      opacity: 1,
                      backgroundColor: isListening ? '#ffebee' : '#f1f8f5',
                      color: isListening ? '#d32f2f' : '#156253'
                    }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ 
                      type: 'spring', stiffness: 400, damping: 25,
                      scale: isListening ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : undefined
                    }}
                    className="absolute inset-0 grid place-items-center w-full h-full rounded-full border-none cursor-pointer focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985]"
                    aria-label={isListening ? "Listening" : "Voice Search"}
                  >
                    <Mic size={18} strokeWidth={2.5} className={cn(isListening && "animate-pulse")} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </form>
        </Entrance>

        {loading && <div className="h-[175px] md:h-[236px] bg-[linear-gradient(110deg,#f6f4ed,#faf8f2)] border border-[#eeeee5] rounded-[20px] mb-4 md:mb-[22px]" role="status" aria-label="Loading offer settings" />}
        {showOffer && (
          <Entrance delay={0.05}>
            <motion.div className="relative isolate overflow-hidden border border-[#f4e4c5] rounded-[20px] bg-[radial-gradient(ellipse_at_90%_70%,#ffe2a6,transparent_58%),linear-gradient(115deg,#fff8e7,#fff0cd)] min-h-[175px] md:min-h-[236px] p-[16px_14px] min-[560px]:p-[25px] md:p-[28px_34px] mb-4 md:mb-[22px] after:content-['✦'] after:absolute after:right-[10px] after:bottom-[18px] after:text-[#fffdf5] after:text-[40px] after:-z-10" whileHover={reduced ? undefined : { y: -3 }}>
              <div className="relative z-20 w-[62%] max-[359px]:w-[70%] min-[560px]:w-[65%]">
                <span className="inline-flex items-center gap-[5px] text-[#925004] text-[9px] font-[800] tracking-[0.11em] uppercase"><Gift size={14} aria-hidden />First order gift</span>
                <h2 className="text-[18px] max-[359px]:text-[17px] min-[560px]:text-[29px] md:text-[32px] min-[1100px]:text-[36px] font-extrabold leading-[1.12] m-[8px_0_6px] tracking-[-0.045em] font-display text-[#0f1f1c]"><span className="text-[#154f41]">FREE</span> Dr. Morepen<br />{GIFT.shortName}</h2>
                <p className="text-[11px] min-[560px]:text-[14px] leading-[1.45] max-w-[160px] max-[359px]:max-w-[158px] min-[560px]:max-w-[280px] md:max-w-none m-0 text-[#66563c]">On your first medicine order of <strong>{currency.format(settings.firstOrderMinimumMedicineAmount)}+</strong>.</p>
                <p className="!text-[9px] md:!text-[12px] !mt-[5px] !text-[#765e3b] font-body">Gift MRP <s>{currency.format(GIFT.mrp)}</s> · Yours free</p>
                <button ref={opener} className="inline-flex items-center gap-[6px] min-h-[36px] p-[6px_0_0] border-0 bg-transparent text-[#8a4800] text-[11.5px] font-[750] cursor-pointer [&>svg]:transition-transform hover:[&>svg]:translate-x-[3px] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985] font-inherit" type="button"
                  aria-haspopup="dialog" onClick={() => onOpenOffer ? onOpenOffer() : setDetailsOpen(true)}>
                  Know more <ArrowRight size={17} aria-hidden />
                </button>
              </div>
              <GiftImage className="absolute right-[-10px] max-[359px]:right-[-20px] min-[560px]:right-[15px] md:right-[50px] min-[1100px]:right-[110px] bottom-[5px] md:bottom-[-5px] w-[48%] max-[359px]:w-[41%] min-[560px]:w-[35%] md:w-[280px] min-[1100px]:w-[310px] h-auto max-h-[140px] min-[560px]:max-h-[210px] md:max-h-[236px] object-contain z-10 drop-shadow-[0_12px_8px_rgba(149,104,23,0.11)]" />
              <span className="absolute right-[8px] max-[359px]:right-[8px] min-[560px]:right-[30px] md:right-[24px] min-[1100px]:right-[55px] top-[10px] max-[359px]:top-[15px] md:top-[22px] min-[1100px]:top-[70px] border-2 border-[rgba(255,255,255,0.88)] rounded-full h-[44px] w-[44px] min-[560px]:w-[62px] min-[560px]:h-[62px] md:w-[70px] md:h-[70px] flex flex-col items-center justify-center bg-[linear-gradient(140deg,#288971,#0c4f43)] text-white text-[7.5px] min-[560px]:text-[10px] font-[750] leading-[1.1] rotate-8 shadow-[0_4px_10px_rgba(23,85,65,0.15)] z-20" aria-hidden="true"><Gift size={18} className="mb-0.5 w-[14px] h-[14px]" />FREE<br />GIFT</span>
            </motion.div>
          </Entrance>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 mt-3 md:mt-4">
          <Entrance delay={0.1}>
            <Link href="/order?method=prescription" className="relative flex items-center justify-center gap-3 h-[56px] md:h-[64px] bg-[#156253] text-white rounded-[20px] shadow-[0_8px_20px_-8px_rgba(21,98,83,0.6)] hover:bg-[#0f4b3f] active:scale-[0.98] transition-all no-underline px-4 group">
              <Camera size={22} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[14px] md:text-[16px] font-bold leading-none mt-[2px]">Upload Prescription</span>
            </Link>
          </Entrance>
          <Entrance delay={0.15}>
            <Link href="/order?method=manual" className="relative flex items-center justify-center gap-3 h-[56px] md:h-[64px] bg-white text-[#156253] ring-1 ring-inset ring-[#156253]/20 hover:ring-[#156253]/40 rounded-[20px] shadow-sm hover:bg-[#f4fafa] active:scale-[0.98] transition-all no-underline px-4 group">
              <FileText size={22} strokeWidth={2.5} className="shrink-0" />
              <span className="text-[14px] md:text-[16px] font-bold leading-none mt-[2px]">Enter Medicines</span>
            </Link>
          </Entrance>
        </div>

        <Entrance delay={0.2}>
          <TrendingProducts />
        </Entrance>

        <dialog ref={dialog} className="fixed inset-0 min-[601px]:m-auto max-[600px]:inset-[auto_0_0] border border-[#e3eee7] min-[601px]:rounded-[30px] max-[600px]:rounded-[24px_24px_0_0] max-[600px]:border-none bg-white w-[min(94vw,500px)] max-[600px]:w-[100vw] max-[600px]:max-w-[100vw] max-[600px]:m-0 max-h-[85dvh] max-[600px]:max-h-[90dvh] max-[600px]:pb-[env(safe-area-inset-bottom)] p-0 shadow-[0_30px_100px_rgba(13,57,45,0.19)] overflow-auto overscroll-contain backdrop:bg-[#102c2466] backdrop:backdrop-blur-[6px] open:animate-[sheet-in_0.2s_ease-out] text-[#0f1f1c] font-body focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 not-[open]:hidden" aria-labelledby="gift-title" aria-describedby="gift-description"
          onCancel={() => setDetailsOpen(false)} onClose={() => setDetailsOpen(false)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setDetailsOpen(false);
          }}>
          <button ref={closeButton} className="absolute right-[13px] top-[13px] max-[600px]:right-[12px] max-[600px]:top-[12px] z-10 grid place-items-center w-[44px] h-[44px] max-[600px]:w-[38px] max-[600px]:h-[38px] rounded-full border border-[#e7eadd] bg-[rgba(255,255,255,0.93)] text-[#214a3d] cursor-pointer focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985] font-inherit" aria-label="Close offer details" type="button" onClick={() => setDetailsOpen(false)}><X size={21} /></button>
          <div className="grid place-items-center bg-[radial-gradient(ellipse_at_center,#ffe6ad,#fff7e3)] h-[200px] max-[600px]:h-[180px]"><GiftImage className="w-[220px] h-[185px] max-[600px]:h-[150px] object-contain" /></div>
          <div className="p-[24px] max-[600px]:p-[20px_20px_30px]">
            <span className="inline-flex items-center gap-[5px] text-[#925004] text-[9px] font-[800] tracking-[0.11em] uppercase">A little care, on us</span>
            <h2 id="gift-title" className="text-[29px] max-[600px]:text-[24px] leading-[1.1] font-extrabold m-[10px_0_15px] max-[600px]:m-[8px_0_12px] font-display tracking-[-0.055em] text-[#0f1f1c]">Your first order.<br />An extra reason to smile.</h2>
            <p id="gift-description" className="text-[14px] leading-[1.65] text-[#51635b]">Get a <strong>{GIFT.name}</strong> free with your first qualifying medicine order of <strong>{currency.format(settings.firstOrderMinimumMedicineAmount)} or more</strong>.</p>
            <ul className="pl-[20px] m-[14px_0_20px] list-disc text-[#51635b] text-[14px] leading-[1.65]"><li>The minimum applies to medicines only.</li><li>A one-time gift for eligible first orders.</li><li>Final eligibility is confirmed with your order.</li></ul>
            <Link href="/order" className="min-h-[48px] flex items-center justify-center gap-[12px] rounded-[24px] bg-[#156253] text-white text-[14px] font-[700] no-underline cursor-pointer focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#087a67] focus-visible:outline-offset-4 active:scale-[0.985] transition-transform font-inherit" onClick={() => setDetailsOpen(false)}>Order medicines <ArrowRight size={18} aria-hidden /></Link>
          </div>
        </dialog>
      </section>

      <HomeSupport />
    </>
  );
}