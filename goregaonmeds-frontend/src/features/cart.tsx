// src/features/cart.tsx
'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowRight,
  Pill,
  Upload,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { useCart, useCartUpdate, useSession } from '@/lib/hooks';
import { money } from '@/lib/api';
import { uploadPrescription } from '@/lib/checkout';
import { PageHeading, Empty, ErrorState, CartSkeleton } from '@/components/ui';

export default function CartPage() {
  const cart = useCart();
  const update = useCartUpdate();
  const auth = useSession();

  const [medName, setMedName] = useState('');
  const [medQty, setMedQty] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [customError, setCustomError] = useState<Error | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const items = cart.data?.cart.items ?? [];
  const manualMedicines = cart.data?.cart.manualMedicines ?? [];
  const prescriptions = cart.data?.cart.prescriptions ?? [];

  const isCartEmpty =
    items.length === 0 &&
    manualMedicines.length === 0 &&
    prescriptions.length === 0;

  function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    setCustomError(null);
    const trimmed = medName.trim();
    if (!trimmed) return;
    if (trimmed.length > 120) {
      setCustomError(new Error('Medicine name must be up to 120 characters.'));
      return;
    }
    const existing = manualMedicines.find(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
    );
    const nextQty = Math.min(100, (existing?.quantity ?? 0) + medQty);

    update.mutate({
      type: 'manual',
      name: existing ? existing.name : trimmed,
      quantity: nextQty,
    });
    setMedName('');
    setMedQty(1);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomError(null);

    if (!auth.data) {
      setCustomError(new Error('Please sign in first to upload a prescription.'));
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploadId = crypto.randomUUID();
      const url = await uploadPrescription(file, uploadId);
      update.mutate({
        type: 'prescription',
        url,
        quantity: 1,
      });
    } catch (err) {
      setCustomError(
        err instanceof Error ? err : new Error('Prescription upload failed.'),
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="container page">
      <PageHeading title="Your care bag.">
        Shop products, type a medicine list, or attach a prescription — all in one bag.
      </PageHeading>
      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.error ? (
        <ErrorState error={cart.error} retry={() => cart.refetch()} />
      ) : (
        <div className="checkout-layout">
          <div>
            {/* Add Custom Medicine & Prescription Panel */}
            <section className="panel" style={{ marginBottom: '1.5rem' }}>
              <div className="form-section-title">
                <ClipboardList size={18} />
                <h2>Add medicine by name or prescription</h2>
              </div>
              <form onSubmit={handleAddManual} className="medicine-row" style={{ marginTop: '0.75rem' }}>
                <input
                  aria-label="Medicine name, strength, pack"
                  maxLength={120}
                  placeholder="Type medicine name, strength (e.g. Dolo 650mg)"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={medQty}
                  onChange={(e) => setMedQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                />
                <button type="submit" className="btn secondary small" disabled={!medName.trim()}>
                  <Plus size={16} /> Add
                </button>
              </form>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border, #eee)' }}>
                {auth.data ? (
                  <label className="upload-zone" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                    <Upload size={24} />
                    <strong>
                      {uploading ? 'Uploading prescription…' : 'Attach a prescription image'}
                    </strong>
                    <span>JPG, PNG or WebP · Up to 5 MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={handleFileUpload}
                    />
                  </label>
                ) : (
                  <p className="notice">
                    Have a prescription?{' '}
                    <Link href="/login/?next=/cart/" className="text-link">
                      Sign in to upload and attach it to your bag →
                    </Link>
                  </p>
                )}
              </div>
              {customError && <ErrorState error={customError} />}
            </section>

            {/* Cart Items List Panel */}
            {isCartEmpty ? (
              <Empty title="A little room for care." icon={ShoppingBag}>
                <p>Your bag is empty. Add medicines above or explore our catalog.</p>
                <Link className="btn" href="/products/">
                  Explore the shop
                  <ArrowRight size={17} />
                </Link>
              </Empty>
            ) : (
              <section className="panel">
                {/* 1. Catalog Products */}
                {items.map((i) => (
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
                            type: 'catalog',
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
                            type: 'catalog',
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
                        update.mutate({
                          type: 'catalog',
                          productId: i.productId,
                          quantity: 0,
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}

                {/* 2. Manual Medicines */}
                {manualMedicines.map((m) => (
                  <div className="cart-row" key={m.name}>
                    <div className="cart-thumb">
                      <Pill />
                    </div>
                    <div className="cart-info">
                      <h3>{m.name}</h3>
                      <p className="muted">Custom medicine · Price confirmed at billing</p>
                    </div>
                    <div className="stepper">
                      <button
                        aria-label={`Decrease ${m.name}`}
                        onClick={() =>
                          update.mutate({
                            type: 'manual',
                            name: m.name,
                            quantity: m.quantity - 1,
                          })
                        }
                      >
                        <Minus size={15} />
                      </button>
                      <span>{m.quantity}</span>
                      <button
                        disabled={m.quantity >= 100}
                        aria-label={`Increase ${m.name}`}
                        onClick={() =>
                          update.mutate({
                            type: 'manual',
                            name: m.name,
                            quantity: m.quantity + 1,
                          })
                        }
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${m.name}`}
                      onClick={() =>
                        update.mutate({
                          type: 'manual',
                          name: m.name,
                          quantity: 0,
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}

                {/* 3. Uploaded Prescriptions */}
                {prescriptions.map((p, idx) => (
                  <div className="cart-row" key={p.url}>
                    <div className="cart-thumb">
                      <FileText />
                    </div>
                    <div className="cart-info">
                      <h3>Prescription #{idx + 1}</h3>
                      <p className="muted">Attached for pharmacist review</p>
                    </div>
                    <div />
                    <button
                      className="icon-button"
                      aria-label={`Remove prescription ${idx + 1}`}
                      onClick={() =>
                        update.mutate({
                          type: 'prescription',
                          url: p.url,
                          quantity: 0,
                        })
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
            )}
          </div>

          <aside className="panel summary">
            <div className="eyebrow">NO SURPRISES</div>
            <h2>Your estimate</h2>
            {cart.data?.cart.estimate ? (
              <>
                <div className="price-row">
                  <span>Catalog medicines</span>
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
            ) : (
              <p className="muted">
                {manualMedicines.length > 0 || prescriptions.length > 0
                  ? 'Custom medicines and prescription items will be priced by the pharmacist after review.'
                  : 'Add items to view your estimate.'}
              </p>
            )}
            <p className="fine-print">
              Final pricing and availability are confirmed by the pharmacy. Pay
              at Delivery (Cash/UPI).
            </p>
            {!isCartEmpty &&
            items.every((i) => i.isAvailable) &&
            !update.isPending &&
            !uploading ? (
              <Link className="btn full" href="/checkout/">
                Continue to checkout
                <ArrowRight size={17} />
              </Link>
            ) : (
              <button className="btn full" disabled>
                {update.isPending || uploading
                  ? 'Syncing your bag…'
                  : isCartEmpty
                    ? 'Your bag is empty'
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