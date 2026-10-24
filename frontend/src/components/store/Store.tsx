// src/components/store/Store.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  PackageX, 
  X 
} from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/ui/ProductCard';
import type { Product, PublicProductsResponse } from '@/lib/types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Store() {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); 
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '12', 
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

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setPage(1); 
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#F8FBFB]">
      <Navbar />
      
      <main className="flex-1 w-[min(100%-32px,1200px)] mx-auto py-6 md:py-10 pb-28">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          
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

        <div className="min-h-[400px]">
          {loading ? (
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
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-[32px] border border-gray-100 border-dashed shadow-sm">
              <div className="w-16 h-16 bg-[#eaf4f4] text-[#156253] rounded-full flex items-center justify-center mb-4">
                <PackageX className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0F1F1C] mb-1">No products found</h3>
              <p className="text-sm font-medium text-[#52675F] max-w-sm">
                We couldn't find anything matching "{debouncedSearch}" in this category. Try adjusting your search.
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              <AnimatePresence>
                {products.map((product) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={product._id}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

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