//src/features/checkout.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Upload,
  ClipboardList,
  Plus,
  Trash2,
  MapPin,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { api, send, ApiError } from '@/lib/api';
import { useSession, useCart, useSettings } from '@/lib/hooks';
import {
  checkoutSchema,
  CheckoutFields,
  uploadPrescription,
} from '@/lib/checkout';
import {
  PageHeading,
  CheckoutSkeleton,
  ErrorState,
  Empty,
} from '@/components/ui';

type Options = {
  savedPhones: string[];
  savedAddresses: { key: string; flat: string; area: string; landmark: string }[];
};

export default function Checkout() {
  const sp = useSearchParams(),
    qc = useQueryClient(),
    auth = useSession(),
    cart = useCart(),
    settings = useSettings();
  const [mode, setMode] = useState(
      sp.get('mode') === 'prescription' ? 'prescription_image' : 'manual_text',
    ),
    [lines, setLines] = useState([{ name: '', quantity: 1 }]),
    [file, setFile] = useState<File | null>(null),
    [stage, setStage] = useState(''),
    [error, setError] = useState<Error | null>(null),
    [result, setResult] = useState(''),
    [uncertain, setUncertain] = useState(false);
  const id = useRef(''),
    frozen = useRef<Record<string, unknown> | null>(null),
    upload = useRef<{ file: File; url: string } | null>(null),
    controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

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
    setStage('Checking your order…');
    try {
      if (!id.current) id.current = crypto.randomUUID();
      let payload = frozen.current;
      if (!payload) {
        const fresh = await cart.refetch();
        if (fresh.error || !fresh.data)
          throw fresh.error ?? new Error('Unable to verify your cart.');
        if (fresh.data.cart.items.some((i) => !i.isAvailable))
          throw new Error(
            'Remove unavailable items from your bag before ordering.',
          );
        const medicines = lines
          .filter((l) => l.name.trim())
          .map((l) => ({ name: l.name.trim(), quantity: l.quantity }));
        if (
          medicines.some(
            (l) =>
              l.name.length > 120 ||
              !Number.isInteger(l.quantity) ||
              l.quantity < 1 ||
              l.quantity > 100,
          )
        )
          throw new Error(
            'Medicine names must be up to 120 characters and quantities from 1 to 100.',
          );
        if (fresh.data.cart.items.length > 20)
          throw new Error('An order can contain up to 20 catalog products.');
        if (
          mode === 'manual_text' &&
          !medicines.length &&
          !fresh.data.cart.items.length
        )
          throw new Error('Add a medicine or a product to your order.');
        let prescriptionUrl: string | undefined;
        if (mode === 'prescription_image') {
          if (!file) throw new Error('Choose a prescription image.');
          setStage('Uploading your prescription…');
          controller.current = new AbortController();
          prescriptionUrl =
            upload.current?.file === file
              ? upload.current.url
              : await uploadPrescription(
                  file,
                  id.current,
                  controller.current.signal,
                );
          upload.current = { file, url: prescriptionUrl };
        }
        payload = {
          clientRequestId: id.current,
          customerName: values.customerName,
          mobileNumber: values.mobileNumber,
          address: {
            flat: values.flat,
            area: values.area,
            landmark: values.landmark,
          },
          orderType: mode,
          medicines: mode === 'manual_text' ? medicines : [],
          products: fresh.data.cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          ...(prescriptionUrl ? { prescriptionUrl } : {}),
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

  return (
    <div className="container page">
      <PageHeading
        eyebrow="THOUGHTFULLY TAKEN CARE OF"
        title="Let’s get your care home."
      >
        Tell us what you need. We’ll send it to your neighbourhood pharmacy.
      </PageHeading>
      {auth.isPending ? (
        <CheckoutSkeleton />
      ) : auth.error ? (
        <ErrorState error={auth.error} retry={() => auth.refetch()} />
      ) : !auth.data ? (
        <Empty title="A quick sign-in, then you’re all set.">
          <p>
            Sign in securely with email to place an order or upload a
            prescription.
          </p>
          <Link className="btn" href="/login/?next=/checkout/">
            Sign in to continue
          </Link>
        </Empty>
      ) : (
        <form className="checkout-layout" onSubmit={form.handleSubmit(submit)}>
          <div>
            <fieldset disabled={locked} className="panel">
              <div className="form-section-title">
                <span>01</span>
                <h2>What do you need?</h2>
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={mode === 'manual_text' ? 'active' : ''}
                  onClick={() => setMode('manual_text')}
                >
                  <ClipboardList size={17} />
                  Medicine list
                </button>
                <button
                  type="button"
                  className={mode === 'prescription_image' ? 'active' : ''}
                  onClick={() => setMode('prescription_image')}
                >
                  <Upload size={17} />
                  Prescription
                </button>
              </div>
              {mode === 'manual_text' ? (
                <>
                  <p className="muted">
                    Include the medicine name, strength, and pack or tablet
                    unit.
                  </p>
                  {lines.map((l, i) => (
                    <div className="medicine-row" key={i}>
                      <input
                        aria-label={`Medicine ${i + 1} name`}
                        maxLength={120}
                        placeholder="Medicine name, strength, pack"
                        value={l.name}
                        onChange={(e) =>
                          setLines(
                            lines.map((v, j) =>
                              i === j ? { ...v, name: e.target.value } : v,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={`Medicine ${i + 1} quantity`}
                        type="number"
                        min="1"
                        max="100"
                        value={l.quantity}
                        onChange={(e) =>
                          setLines(
                            lines.map((v, j) =>
                              i === j
                                ? { ...v, quantity: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Remove medicine"
                        onClick={() =>
                          setLines(lines.filter((_, j) => i !== j))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-link"
                    disabled={lines.length >= 30}
                    onClick={() =>
                      setLines([...lines, { name: '', quantity: 1 }])
                    }
                  >
                    <Plus size={17} />
                    Add another medicine
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">
                    Your prescription is shared to process and review your
                    order. Read our{' '}
                    <Link href="/prescription-notice/">
                      prescription notice
                    </Link>{' '}
                    and <Link href="/privacy/">privacy notice</Link>.
                  </p>
                  <label className="upload-zone">
                    <Upload size={30} />
                    <strong>
                      {file ? file.name : 'Choose your prescription'}
                    </strong>
                    <span>JPG, PNG or WebP · Up to 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (
                          f &&
                          (!['image/jpeg', 'image/png', 'image/webp'].includes(
                            f.type,
                          ) ||
                            f.size > 5242880)
                        ) {
                          setError(
                            new Error('Choose JPG, PNG, or WebP up to 5 MB.'),
                          );
                          e.target.value = '';
                          return;
                        }
                        setFile(f ?? null);
                        upload.current = null;
                      }}
                    />
                  </label>
                  <p className="fine-print">
                    Uploading does not mean your prescription has been medically
                    verified.
                  </p>
                </>
              )}
              {cart.data && cart.data.cart.items.length > 0 && (
                <div className="notice">
                  Also included:{' '}
                  {cart.data.cart.items
                    .map((i) => `${i.name} × ${i.quantity}`)
                    .join(', ')}
                </div>
              )}
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
            <p>
              Prices, availability, and your final bill are confirmed by the
              pharmacy.
            </p>
            {settings.data?.settings.firstOrderOfferEnabled && (
              <p className="notice">
                A first-order gift may apply when the medicine subtotal meets
                the offer threshold. Eligibility is confirmed at billing.
              </p>
            )}
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