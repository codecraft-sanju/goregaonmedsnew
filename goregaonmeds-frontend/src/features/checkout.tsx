// src/features/checkout.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MapPin,
  Wallet,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Truck,
} from 'lucide-react';
import { api, send, ApiError, money } from '@/lib/api';
import { useSession, useCart, useSettings } from '@/lib/hooks';
import { checkoutSchema, CheckoutFields } from '@/lib/checkout';
import {
  PageHeading,
  CheckoutSkeleton,
  ErrorState,
  Empty,
} from '@/components/ui';
import { CartOfferTracker } from '@/components/offer-widgets';

type Options = {
  savedPhones: string[];
  savedAddresses: { key: string; flat: string; area: string; landmark: string }[];
};

export default function Checkout() {
  const qc = useQueryClient(),
    auth = useSession(),
    cart = useCart(),
    settings = useSettings();

  const [stage, setStage] = useState(''),
    [error, setError] = useState<Error | null>(null),
    [result, setResult] = useState(''),
    [uncertain, setUncertain] = useState(false);

  const id = useRef(''),
    frozen = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!uncertain) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [uncertain]);

  const form = useForm<CheckoutFields>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      mobileNumber: '',
      flat: '',
      area: '',
      landmark: '',
    },
  });

  const options = useQuery({
    queryKey: ['customer', 'checkout-options'],
    queryFn: () => api<Options>('/profile/checkout-options'),
    enabled: !!auth.data,
  });

  const busy = !!stage,
    locked = busy || uncertain;

  async function submit(values: CheckoutFields) {
    setError(null);
    setStage('Checking your bag…');
    try {
      if (!id.current) id.current = crypto.randomUUID();
      let payload = frozen.current;
      if (!payload) {
        const fresh = await cart.refetch();
        if (fresh.error || !fresh.data)
          throw fresh.error ?? new Error('Unable to verify your cart.');

        const c = fresh.data.cart;
        const catalogItems = c.items ?? [];
        const manualMeds = c.manualMedicines ?? [];
        const prescriptions = c.prescriptions ?? [];

        if (
          catalogItems.length === 0 &&
          manualMeds.length === 0 &&
          prescriptions.length === 0
        ) {
          throw new Error(
            'Your care bag is empty. Please add items before checkout.',
          );
        }

        if (catalogItems.some((i) => !i.isAvailable)) {
          throw new Error(
            'Remove unavailable items from your bag before ordering.',
          );
        }

        if (catalogItems.length > 20) {
          throw new Error('An order can contain up to 20 catalog products.');
        }

        const hasCatalog = catalogItems.length > 0;
        const hasManual = manualMeds.length > 0;
        const hasPrescription = prescriptions.length > 0;

        let orderType = 'catalog_only';
        if ((hasCatalog || hasManual) && hasPrescription) orderType = 'mixed';
        else if (hasPrescription) orderType = 'prescription_image';
        else if (hasManual) orderType = 'manual_text';

        payload = {
          clientRequestId: id.current,
          customerName: values.customerName,
          mobileNumber: values.mobileNumber,
          address: {
            flat: values.flat,
            area: values.area,
            landmark: values.landmark,
          },
          orderType,
          medicines: manualMeds,
          products: catalogItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          ...(prescriptions[0]?.url
            ? { prescriptionUrl: prescriptions[0].url }
            : {}),
        };
        frozen.current = payload;
      }
      setStage('Sending your order…');
      const confirmed = await send<{ orderId: string }>(
        '/orders/create',
        payload,
      );
      setResult(confirmed.orderId);
      setUncertain(false);
      frozen.current = null;
      await qc.invalidateQueries({ queryKey: ['customer'] });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Please try again.'));
      if (
        frozen.current &&
        (!(e instanceof ApiError) ||
          e.status === 0 ||
          e.status >= 500 ||
          e.status === 409)
      )
        setUncertain(true);
      else frozen.current = null;
    } finally {
      setStage('');
    }
  }

  async function locate() {
    setStage('Finding your address…');
    setError(null);
    if (!navigator.geolocation) {
      setError(
        new Error('Location is unavailable. Please enter your address.'),
      );
      setStage('');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await api<{
            address: { flat: string; area: string; landmark: string };
          }>(
            `/location/address?lat=${p.coords.latitude}&lng=${p.coords.longitude}`,
          );
          for (const k of ['flat', 'area', 'landmark'] as const)
            form.setValue(
              k,
              r.address[k].includes('Not Found') ? '' : r.address[k],
              { shouldValidate: true },
            );
        } catch (e) {
          setError(e as Error);
        } finally {
          setStage('');
        }
      },
      () => {
        setError(
          new Error(
            'Location access was not available. Please enter your address below.',
          ),
        );
        setStage('');
      },
      { timeout: 10000 },
    );
  }

  if (result)
    return (
      <div className="container page">
        <Empty title="Your order is with the pharmacy." icon={ShieldCheck}>
          <p>
            Order <strong>{result}</strong> has been received. Your final bill
            will be confirmed by the pharmacy.
          </p>
          <Link
            className="btn"
            href={`/orders/?id=${encodeURIComponent(result)}`}
          >
            View your order
          </Link>
        </Empty>
      </div>
    );

  const c = cart.data?.cart;
  const catalogItems = c?.items ?? [];
  const manualMeds = c?.manualMedicines ?? [];
  const prescriptions = c?.prescriptions ?? [];
  const isBagEmpty =
    catalogItems.length === 0 &&
    manualMeds.length === 0 &&
    prescriptions.length === 0;

  const deliveryFee =
    c?.estimate?.deliveryCharge ?? settings.data?.settings.deliveryCharge;

  return (
    <div className="container page">
      <PageHeading
        eyebrow="THOUGHTFULLY TAKEN CARE OF"
        title="Let’s get your care home."
      >
        Confirm your delivery details to send your care bag to the pharmacy.
      </PageHeading>
      {auth.isPending || cart.isPending ? (
        <CheckoutSkeleton />
      ) : auth.error ? (
        <ErrorState error={auth.error} retry={() => auth.refetch()} />
      ) : !auth.data ? (
        <Empty title="A quick sign-in, then you’re all set.">
          <p>Sign in securely with email to place your order.</p>
          <Link className="btn" href="/login/?next=/checkout/">
            Sign in to continue
          </Link>
        </Empty>
      ) : isBagEmpty ? (
        <Empty title="Your care bag is empty." icon={ShoppingBag}>
          <p>
            Add products, medicine names, or a prescription to your bag first.
          </p>
          <Link className="btn" href="/cart/">
            Go to your care bag
            <ArrowRight size={17} />
          </Link>
        </Empty>
      ) : (
        <form className="checkout-layout" onSubmit={form.handleSubmit(submit)}>
          <div>
            <fieldset disabled={locked} className="panel">
              <div className="form-section-title">
                <span>01</span>
                <h2>Items in your bag</h2>
              </div>
              {catalogItems.length > 0 && (
                <div className="notice" style={{ marginBottom: '0.5rem' }}>
                  <strong>Products:</strong>{' '}
                  {catalogItems
                    .map((i) => `${i.name} × ${i.quantity}`)
                    .join(', ')}
                </div>
              )}
              {manualMeds.length > 0 && (
                <div className="notice" style={{ marginBottom: '0.5rem' }}>
                  <strong>Manual Medicines:</strong>{' '}
                  {manualMeds
                    .map((m) => `${m.name} × ${m.quantity}`)
                    .join(', ')}
                </div>
              )}
              {prescriptions.length > 0 && (
                <div className="notice" style={{ marginBottom: '0.5rem' }}>
                  <strong>Prescriptions:</strong> {prescriptions.length}{' '}
                  attached
                </div>
              )}
              <Link href="/cart/" className="text-link">
                Edit items in your bag →
              </Link>
            </fieldset>

            <fieldset disabled={locked} className="panel">
              <div className="form-section-title">
                <span>02</span>
                <h2>A few delivery details</h2>
              </div>
              <div className="form-grid">
                {(['customerName', 'mobileNumber'] as const).map((k) => (
                  <label key={k}>
                    {k === 'customerName'
                      ? 'Your full name'
                      : 'Delivery mobile number'}
                    <input
                      {...form.register(k)}
                      autoComplete={
                        k === 'customerName' ? 'name' : 'tel-national'
                      }
                      inputMode={k === 'mobileNumber' ? 'tel' : 'text'}
                      maxLength={k === 'mobileNumber' ? 10 : 80}
                    />
                    {form.formState.errors[k] && (
                      <span className="field-error">
                        {form.formState.errors[k]?.message}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {options.data?.savedPhones.length ? (
                <label>
                  Use a saved number
                  <select
                    defaultValue=""
                    onChange={(e) =>
                      form.setValue('mobileNumber', e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select a number
                    </option>
                    {options.data.savedPhones.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {options.data?.savedAddresses.length ? (
                <label>
                  Use a saved address
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = options.data?.savedAddresses.find(
                        (a) => a.key === e.target.value,
                      );
                      if (a)
                        (['flat', 'area', 'landmark'] as const).forEach((k) =>
                          form.setValue(k, a[k]),
                        );
                    }}
                  >
                    <option value="" disabled>
                      Select an address
                    </option>
                    {options.data.savedAddresses.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.flat}, {a.area}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button className="text-link" type="button" onClick={locate}>
                <MapPin size={17} />
                Use my current location
              </button>
              {(['flat', 'area', 'landmark'] as const).map((k) => (
                <label key={k}>
                  {k === 'flat'
                    ? 'Flat, house & building'
                    : k === 'area'
                      ? 'Area / locality'
                      : 'Landmark (optional)'}
                  <input {...form.register(k)} maxLength={120} />
                  {form.formState.errors[k] && (
                    <span className="field-error">
                      {form.formState.errors[k]?.message}
                    </span>
                  )}
                </label>
              ))}
            </fieldset>
          </div>
          <aside className="panel summary">
            <div className="eyebrow">THE LAST LITTLE STEP</div>
            <h2>Review & send</h2>
            <div className="payment-card">
              <Wallet size={24} />
              <strong>
                Pay at Delivery<small>Cash / UPI</small>
              </strong>
            </div>

            {deliveryFee !== undefined && (
              <div className="price-row">
                <span>Delivery charge</span>
                {deliveryFee === 0 ? (
                  <span className="gm-free-tag">
                    <Truck size={12} /> FREE
                  </span>
                ) : (
                  <strong>{money(deliveryFee)}</strong>
                )}
              </div>
            )}

            {/* Visual First-Order Gift Card with /glucoone.png */}
            <CartOfferTracker cart={c} />

            <p>
              Prices, availability, and your final bill are confirmed by the
              pharmacy.
            </p>
            <p className="fine-print">
              Your name, contact details, address, and order information are
              used to process and fulfil this order.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                {...form.register('terms')}
                disabled={locked}
              />
              <span>
                I agree to the <Link href="/terms/">Terms & Conditions</Link>{' '}
                and acknowledge the <Link href="/privacy/">Privacy Notice</Link>
                .
              </span>
            </label>
            {form.formState.errors.terms && (
              <p className="field-error">
                {form.formState.errors.terms.message}
              </p>
            )}
            <p className="notice">
              Preview: legal documents await approval. This checkbox does not
              create a server-recorded acceptance.
            </p>
            {error && <ErrorState error={error} />}
            <div aria-live="polite">{stage}</div>
            {uncertain && (
              <p className="notice">
                We couldn’t confirm whether your order was received. Check{' '}
                <Link href="/orders/">your orders</Link> or retry this exact
                request. Your details are locked to prevent duplicate orders.
              </p>
            )}
            <button className="btn full" disabled={busy} type="submit">
              {busy
                ? 'Please wait…'
                : uncertain
                  ? 'Retry same order'
                  : 'Send order to pharmacy'}
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}