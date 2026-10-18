// src/app/cart/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2, Plus, Minus, ShoppingBag, FileText, ArrowLeft, Pill } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatRupees } from '@/lib/format';

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const { 
    items, removeItem, updateQuantity,
    medicines, removeMedicine, updateMedicine, addMedicine,
    prescription, setPrescription,
    getTotalItems 
  } = useCartStore();

  useEffect(() => {
    setMounted(true);
    // If cart has medicines but all are empty, add one blank row
    if (medicines.length === 0) {
      addMedicine();
    }
  }, [medicines.length, addMedicine]);

  if (!mounted) return null;

  const validMedicines = medicines.filter(m => m.name.trim() !== '');
  const hasItems = items.length > 0 || validMedicines.length > 0 || prescription !== null;
  const productsTotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  if (!hasItems) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-[#eaf4f4] rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-[#156253]" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink mb-2 text-center">Your cart is empty</h1>
        <p className="text-ink-muted mb-8 text-center max-w-sm">Looks like you haven't added any medicines or products to your cart yet.</p>
        <Link href="/" className="bg-[#156253] text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-[#0f4b3f] transition-all flex items-center gap-2">
          Start Shopping <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-[min(100%-32px,1000px)] mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} className="text-ink" />
        </button>
        <h1 className="text-3xl font-extrabold text-ink">Your Cart</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* LEFT COLUMN: Cart Items */}
        <div className="space-y-6">
          
          {/* 1. PRESCRIPTION SECTION */}
          {prescription && (
            <div className="bg-white rounded-3xl p-5 ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-[#156253]">
                <FileText size={20} />
                <h2 className="text-sm font-bold uppercase tracking-wider">Uploaded Prescription</h2>
              </div>
              <div className="flex gap-4 p-3 bg-[#f8fbfb] rounded-2xl ring-1 ring-[#156253]/10">
                <div className="w-16 h-20 bg-white rounded-xl overflow-hidden shadow-sm shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={prescription.previewUrl || prescription.url} alt="Prescription" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="font-bold text-ink text-sm line-clamp-1 mb-1">{prescription.fileName}</p>
                  <p className="text-xs text-ink-muted mb-3">Pharmacist will review this</p>
                  <button onClick={() => setPrescription(null)} className="text-xs font-bold text-red-500 hover:text-red-700 self-start transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. MANUAL MEDICINES SECTION */}
          {(validMedicines.length > 0 || !prescription) && (
            <div className="bg-white rounded-3xl p-5 ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#156253]">
                  <Pill size={20} />
                  <h2 className="text-sm font-bold uppercase tracking-wider">Medicines Required</h2>
                </div>
              </div>
              
              <div className="space-y-3">
                {medicines.map((med, index) => (
                  <div key={med._id || index} className="flex gap-3 items-center">
                    <input 
                      type="text" 
                      placeholder="e.g. Dolo 650"
                      value={med.name}
                      onChange={(e) => updateMedicine(med._id!, 'name', e.target.value)}
                      className="flex-1 h-12 bg-[#f8fbfb] rounded-xl px-4 font-bold text-ink text-sm ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-[#156253]/20"
                    />
                    <input 
                      type="text" 
                      placeholder="Qty (e.g. 1 Strip)"
                      value={med.quantity}
                      onChange={(e) => updateMedicine(med._id!, 'quantity', e.target.value)}
                      className="w-28 md:w-32 h-12 bg-[#f8fbfb] rounded-xl px-4 font-bold text-ink text-sm ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-[#156253]/20"
                    />
                    <button 
                      onClick={() => removeMedicine(med._id!)}
                      disabled={medicines.length === 1 && !med.name}
                      className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <button onClick={addMedicine} className="text-[#156253] font-bold text-sm flex items-center gap-1.5 mt-2 hover:underline">
                  <Plus size={16} /> Add Another Medicine
                </button>
              </div>
            </div>
          )}

          {/* 3. OTC PRODUCTS SECTION */}
          {items.length > 0 && (
            <div className="bg-white rounded-3xl p-5 ring-1 ring-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-[#156253]">
                <ShoppingBag size={20} />
                <h2 className="text-sm font-bold uppercase tracking-wider">Everyday Essentials</h2>
              </div>
              <div className="space-y-4">
                {items.map(({ product, quantity }) => (
                  <div key={product._id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-[#f8fbfb] rounded-xl p-1 shrink-0 flex items-center justify-center">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <ShoppingBag size={24} className="text-gray-300" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-ink line-clamp-1">{product.name}</h3>
                      <p className="text-sm font-extrabold mt-1">{formatRupees(product.price)}</p>
                    </div>

                    <div className="flex items-center gap-3 bg-[#f8fbfb] rounded-full p-1 ring-1 ring-gray-100">
                      <button 
                        onClick={() => quantity === 1 ? removeItem(product._id) : updateQuantity(product._id, quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-ink hover:text-red-500 transition-colors"
                      >
                        {quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                      </button>
                      <span className="w-4 text-center font-bold text-sm">{quantity}</span>
                      <button 
                        onClick={() => updateQuantity(product._id, quantity + 1)}
                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-ink hover:text-[#156253] transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Bill Summary & Checkout */}
        <div className="lg:sticky lg:top-[100px] h-fit">
          <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-extrabold text-ink mb-5">Bill Summary</h2>
            
            <div className="space-y-4 mb-6">
              {items.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink-muted">Products Total</span>
                  <span className="font-bold text-ink">{formatRupees(productsTotal)}</span>
                </div>
              )}
              
              {(validMedicines.length > 0 || prescription) && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink-muted">Medicines Total</span>
                  <span className="font-bold text-[#dfa442]">To be calculated</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-200 pt-4 mb-6">
              <p className="text-[11px] text-ink-muted leading-relaxed font-medium">
                * Final bill will be shared after pharmacist reviews your prescription and availability of medicines. Pay on Delivery via Cash/UPI.
              </p>
            </div>

            {/* Existing OrderFlow component ko route par use karenge */}
            <button 
              onClick={() => router.push('/order?step=2')} // Step 2 is Delivery Details in your OrderFlow
              className="w-full bg-[#156253] text-white h-14 rounded-2xl font-bold text-base shadow-[0_8px_20px_-8px_rgba(21,98,83,0.6)] hover:bg-[#0f4b3f] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Proceed to Delivery <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}