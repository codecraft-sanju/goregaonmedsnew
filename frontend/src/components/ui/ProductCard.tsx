// src/components/ui/ProductCard.tsx
'use client';

import React from 'react';
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn'; 
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  className?: string;
  showSelectionCheck?: boolean; 
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function ProductCard({ product, className, showSelectionCheck = false }: ProductCardProps) {
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore();
  
  const cartItem = cartItems.find(item => item.product._id === product._id);

  return (
    <div
      className={cn(
        "flex flex-col bg-white border rounded-[20px] p-2.5 md:p-3 transition-all duration-300 relative overflow-hidden group h-full",
        cartItem 
          ? "border-[#156253] ring-1 ring-[#156253] shadow-md" 
          : "border-gray-100 hover:shadow-[0_8px_24px_rgba(21,98,83,0.08)] hover:border-[#156253]/20",
        className
      )}
    >
    
      {showSelectionCheck && cartItem && (
        <div className="absolute top-0 right-0 w-8 h-8 bg-[#156253] rounded-bl-[20px] flex items-start justify-end p-1.5 z-10">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="h-[120px] md:h-[140px] w-full bg-[#F8FBFB] rounded-[14px] mb-3 flex items-center justify-center overflow-hidden shrink-0">
        {product.imageUrl ? (
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
          <p className="text-[9px] md:text-[10px] font-extrabold text-[#156253] uppercase tracking-widest mb-1.5 line-clamp-1">
            {product.category}
          </p>
          <h3 className="text-[13px] md:text-[15px] font-bold text-[#0F1F1C] line-clamp-2 leading-[1.3] min-h-[34px] md:min-h-[38px]">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[11px] text-[#52675F] mt-1 line-clamp-1 hidden md:block">
              {product.description}
            </p>
          )}
        </div>
        
   
        <div className="mt-3 md:mt-4 flex items-end justify-between">
          <span className="font-display text-[16px] md:text-[19px] font-extrabold text-[#0F1F1C]">
            {currency.format(product.price)}
          </span>
          
          {!cartItem ? (
            <button 
              type="button"
              onClick={() => addItem(product)}
              className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-[#F6FAF8] text-[#156253] grid place-items-center hover:bg-[#156253] hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156253] active:scale-95 shadow-sm shrink-0"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-[#F6FAF8] rounded-full px-1 py-0.5 border border-[#156253]/10 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  if (cartItem.quantity === 1) removeItem(product._id);
                  else updateQuantity(product._id, cartItem.quantity - 1);
                }} 
                className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-white text-[#156253] grid place-items-center shadow-sm active:scale-95"
              >
                {cartItem.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[12px] md:text-[13px] font-bold w-4 md:w-5 text-center text-[#156253]">
                {cartItem.quantity}
              </span>
              <button 
                type="button" 
                onClick={() => updateQuantity(product._id, cartItem.quantity + 1)} 
                className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-[#156253] text-white grid place-items-center shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}