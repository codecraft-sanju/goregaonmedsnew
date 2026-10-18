//src/app/store/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Check,
  ChevronLeft,
  ChevronRight,
  PackageX
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/cartStore';
import type { Product, PublicProductsResponse } from '@/lib/types';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency', 
  currency: 'INR', 
  maximumFractionDigits: 0,
});

export default function StorePage() {
  // --- State ---
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cart Store
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore();

  // --- Effects ---

  // 1. Fetch Categories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.categories) {
          setCategories(['All', ...data.categories]);
        }
      })
      .catch(console.error);
  }, []);

  // 2. Debounce Search Input (Waits 500ms after user stops typing before searching)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 3. Fetch Products (Triggers on page, category, or search change)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '12', // 12 items per page for a nice grid
    });

    if (activeCategory !== 'All') {
      params.append('category', activeCategory);
    }
    if (debouncedSearch) {
      params.append('q', debouncedSearch);
    }

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data: PublicProductsResponse) => {
        if (data.success) {
          setProducts(data.products || []);
          setTotalPages(data.pagination.totalPages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, activeCategory, debouncedSearch]);

  // --- Handlers ---
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(1); // Reset to first page when category changes
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8FBFB]">
      <Navbar />
      
      <main className="flex-1 w-[min(100%-32px,1200px)] mx-auto py-6 md:py-10 pb-28">
        
        {/* Header & Search Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
         

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px] shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8fa69d]" />
            <input 
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-[#e6eeea] rounded-2xl text-[14px] text-[#0f1f1c] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#156253]/20 focus:border-[#156253]/50 transition-all placeholder:font-normal placeholder:text-[#799188]"
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={cn(
                  "relative px-5 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap snap-start transition-colors z-10 active:scale-[0.98] shadow-sm",
                  isActive 
                    ? "text-white" 
                    : "text-[#52675F] bg-white ring-1 ring-inset ring-gray-200 hover:bg-[#F6FAF8] hover:ring-[#156253]/20"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="storeCategoryTab"
                    className="absolute inset-0 bg-[#156253] rounded-full -z-10 shadow-[0_4px_12px_rgba(21,98,83,0.25)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {category}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        <div className="min-h-[400px]">
          {loading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[20px] p-3 animate-pulse">
                  <div className="h-[140px] w-full bg-gray-100 rounded-[14px] mb-3" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded mb-2.5" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-4" />
                  <div className="flex justify-between items-end">
                    <div className="h-6 w-1/3 bg-gray-100 rounded" />
                    <div className="h-9 w-9 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-[32px] border border-gray-100 border-dashed shadow-sm">
              <div className="w-16 h-16 bg-[#eaf4f4] text-[#156253] rounded-full flex items-center justify-center mb-4">
                <PackageX className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0F1F1C] mb-1">No products found</h3>
              <p className="text-sm font-medium text-[#52675F] max-w-sm">
                We couldn&apos;t find anything matching &quot;{debouncedSearch}&quot; in this category. Try adjusting your search.
              </p>
              {(debouncedSearch || activeCategory !== 'All') && (
                <button 
                  onClick={() => { setSearchInput(''); setActiveCategory('All'); }}
                  className="mt-6 text-[13px] font-bold text-[#156253] bg-[#eaf4f4] px-5 py-2.5 rounded-full hover:bg-[#156253] hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              <AnimatePresence>
                {products.map((product) => {
                  const cartItem = cartItems.find(item => item.product._id === product._id);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={product._id}
                      className={cn(
                        "bg-white border rounded-[20px] p-3 shadow-sm transition-all duration-300 relative group flex flex-col h-full",
                        cartItem ? "border-[#156253] ring-1 ring-[#156253]" : "border-gray-100 hover:shadow-[0_8px_24px_rgba(21,98,83,0.08)] hover:border-[#156253]/20"
                      )}
                    >
                      {/* Image Area */}
                      <div className="h-[140px] md:h-[160px] w-full bg-[#F8FBFB] rounded-[14px] mb-3 flex items-center justify-center overflow-hidden">
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

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-extrabold text-[#156253] uppercase tracking-widest mb-1.5 line-clamp-1">
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
                        
                        <div className="mt-4 flex items-end justify-between">
                          <span className="font-display text-[17px] md:text-[19px] font-extrabold text-[#0F1F1C]">
                            {currency.format(product.price)}
                          </span>
                          
                          {/* Global Cart Controls */}
                          {!cartItem ? (
                            <button 
                              type="button"
                              onClick={() => addItem(product)}
                              className="h-9 w-9 rounded-full bg-[#F6FAF8] text-[#156253] grid place-items-center hover:bg-[#156253] hover:text-white transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156253] active:scale-95 shadow-sm"
                              aria-label={`Add ${product.name} to cart`}
                            >
                              <Plus className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-[#F6FAF8] rounded-full px-1 py-0.5 border border-[#156253]/10">
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (cartItem.quantity === 1) removeItem(product._id);
                                  else updateQuantity(product._id, cartItem.quantity - 1);
                                }} 
                                className="h-7 w-7 rounded-full bg-white text-[#156253] grid place-items-center shadow-sm active:scale-95"
                              >
                                {cartItem.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              </button>
                              <span className="text-[13px] font-bold w-5 text-center text-[#156253]">
                                {cartItem.quantity}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(product._id, cartItem.quantity + 1)} 
                                className="h-7 w-7 rounded-full bg-[#156253] text-white grid place-items-center shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12 mb-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-200 text-[#0F1F1C] hover:bg-gray-50 active:scale-95 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            
            <div className="text-sm font-bold text-[#52675F] bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm">
              Page <span className="text-[#156253] mx-0.5">{page}</span> of {totalPages}
            </div>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-200 text-[#0F1F1C] hover:bg-gray-50 active:scale-95 shadow-sm"
            >
               Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}