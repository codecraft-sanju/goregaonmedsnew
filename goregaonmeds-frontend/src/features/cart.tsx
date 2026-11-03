//src/features/cart.tsx
'use client';
import Link from 'next/link';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Pill,
} from 'lucide-react';
import { useCart, useCartUpdate } from '@/lib/hooks';
import { money } from '@/lib/api';
import { PageHeading, Empty, ErrorState, CartSkeleton } from '@/components/ui';

export default function CartPage() {
  const cart = useCart();
  const update = useCartUpdate();

  return (
    <div className="container page">
      <PageHeading title="Your care bag.">
        A few essentials. A little peace of mind.
      </PageHeading>
      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.error ? (
        <ErrorState error={cart.error} retry={() => cart.refetch()} />
      ) : !cart.data?.cart.items.length ? (
        <Empty title="A little room for care." icon={ShoppingBag}>
          <p>Your bag is empty. Explore essentials for your everyday.</p>
          <Link className="btn" href="/products/">
            Explore the shop
            <ArrowRight size={17} />
          </Link>
        </Empty>
      ) : (
        <div className="checkout-layout">
          <section className="panel">
            {cart.data.cart.items.map((i) => (
              <div className="cart-row" key={i.productId}>
                <div className="cart-thumb">
                  {i.imageUrl ? <img src={i.imageUrl} alt="" /> : <Pill />}
                </div>
                <div className="cart-info">
                  <h3>{i.name}</h3>
                  <p>{money(i.price)} each</p>
                  {!i.isAvailable && (
                    <span className="field-error">
                      Currently unavailable. Remove to continue.
                    </span>
                  )}
                </div>
                <div className="stepper">
                  <button
                    aria-label={`Decrease ${i.name}`}
                    onClick={() =>
                      update.mutate({
                        productId: i.productId,
                        quantity: i.quantity - 1,
                      })
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    disabled={i.quantity >= 100 || !i.isAvailable}
                    aria-label={`Increase ${i.name}`}
                    onClick={() =>
                      update.mutate({
                        productId: i.productId,
                        quantity: i.quantity + 1,
                      })
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${i.name}`}
                  onClick={() =>
                    update.mutate({ productId: i.productId, quantity: 0 })
                  }
                >
                  <Trash2 size={17} />
                
                </button>
              </div>
            ))}
            {update.error && <ErrorState error={update.error} />}
            <Link href="/products/" className="text-link">
              Continue shopping
              <ArrowRight size={16} />
            </Link>
          </section>
          <aside className="panel summary">
            <div className="eyebrow">NO SURPRISES</div>
            <h2>Your estimate</h2>
            {cart.data.cart.estimate && (
              <>
                <div className="price-row">
                  <span>Medicines</span>
                  <strong>
                    {money(cart.data.cart.estimate.medicineSubtotal)}
                  </strong>
                </div>
                <div className="price-row">
                  <span>Other essentials</span>
                  <strong>
                    {money(cart.data.cart.estimate.nonMedicineSubtotal)}
                  </strong>
                </div>
                <div className="price-row">
                  <span>Delivery</span>
                  <strong>
                    {money(cart.data.cart.estimate.deliveryCharge)}
                  </strong>
                </div>
                <div className="summary-total">
                  <span>Estimated total</span>
                  <strong>{money(cart.data.cart.estimate.finalAmount)}</strong>
                </div>
                {cart.data.cart.estimate.offerApplied && (
                  <p className="notice">
                    Potentially eligible for a first-order gift. Confirmed at
                    billing.
                  </p>
                )}
              </>
            )}
            <p className="fine-print">
              Final pricing and availability are confirmed by the pharmacy. Pay
              at Delivery (Cash/UPI).
            </p>
            {cart.data.cart.items.every((i) => i.isAvailable) &&
            !update.isPending ? (
              <Link className="btn full" href="/checkout/">
                Continue to checkout
                <ArrowRight size={17} />
              </Link>
            ) : (
              <button className="btn full" disabled>
                {update.isPending
                  ? 'Syncing your bag…'
                  : 'Remove unavailable items'}
              </button>
            )}
            <span className="summary-trust">
              <ShieldCheck size={16} />
              Your details stay private
            </span>
          </aside>
        </div>
      )}
    </div>
  );
}