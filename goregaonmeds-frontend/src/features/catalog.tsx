//src/features/catalog.tsx
'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  ArrowRight,
  Pill,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  catalog,
  Product,
  productId,
  money,
  productSchema,
} from '@/lib/api';
import { useCart, useCartUpdate } from '@/lib/hooks';
import {
  Empty,
  ErrorState,
  PageHeading,
  Pager,
  Skeleton,
  Modal,
} from '@/components/ui';
import { z } from 'zod';

function ProductCard({ p }: { p: Product }) {
  const update = useCartUpdate();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const id = productId(p);
  const quantity =
    cart.data?.cart.items.find((i) => i.productId === id)?.quantity ?? 0;
  const available =
    p.inStock && (!p.trackStock || (p.stockQuantity ?? 0) > 0);

  const changeQty = (nextQty: number) => {
    update.mutate({
      productId: id,
      quantity: nextQty,
      product: {
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        isAvailable: available,
        kind: p.kind,
      },
    });
  };

  return (
    <>
      <article className="product-card">
        <button
          className="product-image"
          onClick={() => setOpen(true)}
          aria-label={`View ${p.name}`}
        >
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} loading="lazy" />
          ) : (
            <Pill size={44} />
          )}
        </button>
        <span className="product-category">{p.category}</span>
        <button className="product-title" onClick={() => setOpen(true)}>
          {p.name}
        </button>
        <small>
          {available ? 'Available to order' : 'Currently unavailable'}
        </small>
        <div className="product-bottom">
          <strong>{money(p.price)}</strong>
          {quantity > 0 ? (
            <div className="stepper">
              <button
                aria-label={`Decrease ${p.name}`}
                onClick={() => changeQty(quantity - 1)}
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                disabled={!available || quantity >= 100}
                aria-label={`Increase ${p.name}`}
                onClick={() => changeQty(quantity + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              className="add-btn"
              disabled={!available}
              onClick={() => changeQty(1)}
              aria-label={`Add ${p.name} to cart`}
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
        {update.error && (
          <p className="field-error" role="alert">
            {update.error.message}
          </p>
        )}
      </article>
      {open && (
        <Modal title={p.name} onClose={() => setOpen(false)}>
          <p className="eyebrow">{p.category}</p>
          <p>
            {p.description ||
              'Please consult the pharmacy for product information.'}
          </p>
          <h3>{money(p.price)}</h3>
          {p.kind === 'medicine' && (
            <p className="notice">
              Medicines are subject to pharmacy review. Do not use this
              information as medical advice.
            </p>
          )}
          <Link className="btn" href="/cart/">
            View your cart
            <ArrowRight size={17} />
          </Link>
        </Modal>
      )}
    </>
  );
}

// export function Trending() {
//   const q = useQuery({
//     queryKey: ['public', 'trending'],
//     queryFn: async ({ signal }) =>
//       z
//         .object({ products: z.array(productSchema) })
//         .parse(await api('/products/trending', { signal })),
//   });
//   return (
//     <section className="section">
//       <div className="section-head">
//         <div>
//           <div className="eyebrow">LITTLE THINGS, EVERYDAY WELLBEING</div>
//           <h2>Your daily care, covered.</h2>
//         </div>
//         <Link className="text-link" href="/products/">
//           Explore the shop
//           <ArrowRight size={17} />
//         </Link>
//       </div>
//       {q.isPending ? (
//         <Skeleton count={4} />
//       ) : q.error ? (
//         <div className="catalog-unavailable">
//           <div className="empty-icon">
//             <Pill size={27} />
//           </div>
//           <div>
//             <h3>The shelves will be ready soon.</h3>
//             <p>
//               Our online catalog is being connected. You can explore how
//               ordering works in the meantime.
//             </p>
//           </div>
//           <button
//             className="btn secondary small"
//             onClick={() => q.refetch()}
//           >
//             <RefreshCw size={16} />
//             Check again
//           </button>
//         </div>
//       ) : q.data?.products.length ? (
//         <div className="product-grid">
//           {q.data.products.slice(0, 4).map((p) => (
//             <ProductCard key={productId(p)} p={p} />
//           ))}
//         </div>
//       ) : (
//         <Empty title="Fresh essentials are on their way">
//           <p>Our pharmacy hasn’t selected featured products yet.</p>
//           <Link href="/products/" className="text-link">
//             Browse all products →
//           </Link>
//         </Empty>
//       )}
//     </section>
//   );
// }
export function Trending() {
  const q = useQuery({
    queryKey: ['public', 'trending'],
    queryFn: async ({ signal }) =>
      z
        .object({ products: z.array(productSchema) })
        .parse(await api('/products/trending', { signal })),
  });
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">LITTLE THINGS, EVERYDAY WELLBEING</div>
          <h2>Your daily care, covered.</h2>
        </div>
        <Link className="text-link" href="/products/">
          Explore the shop
          <ArrowRight size={17} />
        </Link>
      </div>
      {q.isPending ? (
        <Skeleton count={4} />
      ) : q.error ? (
        <div className="catalog-unavailable">
          <div className="empty-icon">
            <Pill size={27} />
          </div>
          <div>
            <h3>The shelves will be ready soon.</h3>
            <p>
              Our online catalog is being connected. You can explore how
              ordering works in the meantime.
            </p>
          </div>
          <button
            className="btn secondary small"
            onClick={() => q.refetch()}
          >
            <RefreshCw size={16} />
            Check again
          </button>
        </div>
      ) : q.data?.products.length ? (
        <div className="product-grid">
          {q.data.products.map((p) => (
            <ProductCard key={productId(p)} p={p} />
          ))}
        </div>
      ) : (
        <Empty title="Fresh essentials are on their way">
          <p>Our pharmacy hasn’t selected featured products yet.</p>
          <Link href="/products/" className="text-link">
            Browse all products →
          </Link>
        </Empty>
      )}
    </section>
  );
}

export default function Catalog() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get('q') ?? '');

  useEffect(() => setQ(sp.get('q') ?? ''), [sp]);

  const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
  const params = new URLSearchParams(sp.toString());
  params.set('limit', '20');

  const products = useQuery({
    queryKey: ['public', 'products', params.toString()],
    queryFn: ({ signal }) => catalog(params.toString(), signal),
  });

  const categories = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: () => api<{ categories: string[] }>('/categories'),
  });

  function filter(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    value ? p.set(key, value) : p.delete(key);
    if (key !== 'page') p.delete('page');
    router.replace(`/products/?${p.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (q === (sp.get('q') ?? '')) return;
    const t = setTimeout(() => filter('q', q), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="container page">
      <PageHeading
        eyebrow="THE NEIGHBOURHOOD SHOP"
        title="A little care goes a long way."
      >
        Medicines, wellness, and everyday essentials. All in one place.
      </PageHeading>
      <div className="shop-layout">
        <aside className="filter-panel">
          <div className="filter-title">
            <SlidersHorizontal size={18} />
            <h3>Refine your shelf</h3>
          </div>
          <label>
            Category
            <select
              value={sp.get('category') ?? 'All'}
              onChange={(e) => filter('category', e.target.value)}
            >
              <option>All</option>
              {categories.data?.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Product type
            <select
              value={sp.get('kind') ?? ''}
              onChange={(e) => filter('kind', e.target.value)}
            >
              <option value="">All essentials</option>
              <option value="medicine">Medicines</option>
              <option value="non_medicine">Wellness & personal care</option>
            </select>
          </label>
          <label>
            Availability
            <select
              value={sp.get('availability') ?? 'available'}
              onChange={(e) => filter('availability', e.target.value)}
            >
              <option value="available">Available</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="all">All products</option>
            </select>
          </label>
          <label>
            Maximum price (₹)
            <input
              key={sp.get('maxPrice')}
              type="number"
              min="0"
              max="1000000"
              placeholder="Any price"
              defaultValue={sp.get('maxPrice') ?? ''}
              onBlur={(e) => filter('maxPrice', e.target.value)}
            />
          </label>
          <button
            className="text-link"
            onClick={() => router.replace('/products/')}
          >
            Reset filters
          </button>
          <div className="filter-note">
            <Pill size={23} />
            <h4>Can’t find a medicine?</h4>
            <p>Send us your list or prescription for pharmacy review.</p>
            <Link href="/order/">Start an order →</Link>
          </div>
        </aside>
        <section>
          <div className="catalog-toolbar">
            <div className="search-field">
              <Search size={19} />
              <input
                aria-label="Search catalog"
                placeholder="What can we help you find?"
                maxLength={80}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              aria-label="Sort products"
              value={sp.get('sort') ?? 'newest'}
              onChange={(e) => filter('sort', e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name_asc">Name: A–Z</option>
            </select>
          </div>
          {products.isPending ? (
            <Skeleton count={6} className="product-grid shop-grid" />
          ) : products.error ? (
            <ErrorState
              error={products.error}
              retry={() => products.refetch()}
            />
          ) : (
            <>
              <div className="results-count">
                {products.data?.pagination.total ?? 0} essentials found
              </div>
              {products.data?.products.length ? (
                <div className="product-grid shop-grid">
                  {products.data.products.map((p) => (
                    <ProductCard p={p} key={productId(p)} />
                  ))}
                </div>
              ) : (
                <Empty title="Nothing on this shelf yet">
                  <p>Try a different search or reset your filters.</p>
                  <button
                    className="btn secondary"
                    onClick={() => router.replace('/products/')}
                  >
                    Clear filters
                  </button>
                </Empty>
              )}
              <Pager
                page={page}
                total={products.data?.pagination.totalPages ?? 0}
                onChange={(p) => filter('page', String(p))}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}