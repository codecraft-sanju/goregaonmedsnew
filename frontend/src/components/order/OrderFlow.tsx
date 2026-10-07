// src/components/order/OrderFlow.tsx
'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, ClipboardList, Gift, MapPin, ShieldCheck, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { PharmacyNotice } from '@/components/home/PharmacyNotice';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { ApiError, apiRequest } from '@/lib/api';
import { clearCheckout, loadCheckout, saveCheckout } from '@/lib/checkoutStorage';
import { GIFT, PAYMENT_LABEL } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatMobile, formatRupees, normalizeMobile } from '@/lib/format';
import type { CreateOrderPayload, CreateOrderResponse, OrderType } from '@/lib/types';
import { createRequestId } from '@/lib/uuid';
import { DeliveryDetailsForm, type DeliveryDetails } from './DeliveryDetailsForm';
import { MedicineListEditor, type MedicineRow } from './MedicineListEditor';
import type { UploadState } from './PrescriptionUploader';

const PrescriptionUploader = dynamic(() => import('./PrescriptionUploader').then((mod) => mod.PrescriptionUploader), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full rounded-3xl" />,
});

const STEPS = ['Your medicines', 'Delivery details', 'Review & place'] as const;
type Step = 0 | 1 | 2;

const emptyRow = (): MedicineRow => ({ id: createRequestId(), name: '', quantity: '1 Strip' });
const emptyDetails: DeliveryDetails = { customerName: '', mobileNumber: '', address: { flat: '', area: '', landmark: '' } };

type DetailErrors = Partial<Record<'customerName' | 'mobileNumber' | 'flat' | 'area' | 'landmark', string>>;

function validateDetails(details: DeliveryDetails): DetailErrors {
  const errors: DetailErrors = {};
  if (details.customerName.trim().length < 2) errors.customerName = 'Enter your full name';
  if (!normalizeMobile(details.mobileNumber)) errors.mobileNumber = 'Enter a valid 10-digit mobile number';
  if (!details.address.flat.trim()) errors.flat = 'Enter your flat, house or building';
  if (details.address.area.trim().length < 2) errors.area = 'Enter your area';
  return errors;
}

const DETAIL_FIELDS: Record<string, keyof DetailErrors> = {
  customerName: 'customerName',
  mobileNumber: 'mobileNumber',
  'address.flat': 'flat',
  'address.area': 'area',
  'address.landmark': 'landmark',
};

export function OrderFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { settings, loading: settingsLoading } = usePublicSettings();

  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [method, setMethod] = useState<OrderType>(params.get('method') === 'prescription' ? 'prescription_image' : 'manual_text');
  const [rows, setRows] = useState<MedicineRow[]>([{ id: 'initial-row', name: '', quantity: '1 Strip' }]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [uploadError, setUploadError] = useState<string>();
  const [details, setDetails] = useState<DeliveryDetails>(emptyDetails);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [saveDetails, setSaveDetails] = useState(false);
  const [offerOptIn, setOfferOptIn] = useState(params.get('gift') === '1');
  const [submitting, setSubmitting] = useState(false);

  const clientRequestId = useRef<string | null>(null);
  const submitLock = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadCheckout();
    if (saved) {
      setDetails(saved);
      setSaveDetails(true);
    }
  }, []);

  const go = (next: Step) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filledRows = rows.filter((row) => row.name.trim() || row.quantity.trim());

  const validateItems = () => {
    if (method === 'manual_text') {
      const errors: Record<string, string> = {};
      for (const row of filledRows) {
        if (!row.name.trim()) errors[`${row.id}-name`] = 'Enter the medicine name';
        if (!row.quantity.trim()) errors[`${row.id}-qty`] = 'Enter a quantity, e.g. 1 strip';
      }
      if (filledRows.length === 0 && rows[0]) errors[`${rows[0].id}-name`] = 'Add at least one medicine';
      setRowErrors(errors);
      return Object.keys(errors).length === 0;
    }
    if (upload.status === 'compressing' || upload.status === 'uploading') {
      setUploadError('Please wait for the upload to finish');
      return false;
    }
    if (upload.status !== 'done') {
      setUploadError('Upload a photo of your prescription to continue');
      return false;
    }
    setUploadError(undefined);
    return true;
  };

  const next = () => {
    if (step === 0 && validateItems()) go(1);
    if (step === 1) {
      const errors = validateDetails(details);
      setDetailErrors(errors);
      if (Object.keys(errors).length === 0) go(2);
    }
  };

  const placeOrder = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);

    clientRequestId.current ??= createRequestId();
    const payload: CreateOrderPayload = {
      clientRequestId: clientRequestId.current,
      customerName: details.customerName.trim(),
      mobileNumber: normalizeMobile(details.mobileNumber) ?? details.mobileNumber,
      orderType: method,
      medicines: method === 'manual_text' ? filledRows.map(({ name, quantity }) => ({ name: name.trim(), quantity: quantity.trim() })) : [],
      prescriptionUrl: method === 'prescription_image' && upload.status === 'done' ? upload.url : undefined,
      address: { flat: details.address.flat.trim(), area: details.address.area.trim(), landmark: details.address.landmark.trim() },
      offerOptIn: settings.firstOrderOfferEnabled && offerOptIn,
    };

    try {
      const result = await apiRequest<CreateOrderResponse>('/orders/create', { method: 'POST', body: payload });
      if (saveDetails) saveCheckout({ customerName: payload.customerName, mobileNumber: payload.mobileNumber, address: payload.address });
      else clearCheckout();
      router.replace(`/order/success?id=${encodeURIComponent(result.orderId)}&notified=${result.telegramNotificationSent ? '1' : '0'}`);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        clientRequestId.current = null;
        const fieldErrors: DetailErrors = {};
        for (const issue of error.fields) {
          const key = DETAIL_FIELDS[issue.path];
          if (key) fieldErrors[key] = issue.message;
        }
        if (Object.keys(fieldErrors).length > 0) {
          setDetailErrors(fieldErrors);
          go(1);
        }
      }
      toast.error(error instanceof Error ? error.message : 'Could not place your order. Please try again.');
    }
  };

  const giftAvailable = !settingsLoading && settings.firstOrderOfferEnabled;
  const threshold = formatRupees(settings.firstOrderMinimumMedicineAmount);

  return (
    <div ref={topRef} className="mx-auto w-full max-w-2xl scroll-mt-24">
      {/* iOS Style Step Progress */}
      <ol className="mb-8 flex justify-between gap-2" aria-label="Order progress">
        {STEPS.map((label, index) => (
          <li key={label} className="w-full text-center" aria-current={index === step ? 'step' : undefined}>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eaf4f4]">
              <motion.div className="h-full bg-[#156253]" initial={false} animate={{ width: index <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
            </div>
            <p className={cn('mt-2 text-[11px] font-bold sm:text-xs', index === step ? 'text-[#156253]' : 'text-[#8ba7a7]')}>{label}</p>
          </li>
        ))}
      </ol>

      <div className="card overflow-hidden bg-white p-5 shadow-sm sm:p-8">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <section aria-labelledby="step-items">
                <h1 id="step-items" className="font-display text-2xl font-extrabold text-ink">What do you need?</h1>
                
                {/* Segmented Control / Tabs */}
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-brand-50/70 p-1.5" role="tablist" aria-label="Ordering method">
                  {[
                    { value: 'manual_text' as const, label: 'Enter medicines', icon: ClipboardList },
                    { value: 'prescription_image' as const, label: 'Upload Rx', icon: Camera },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={method === option.value}
                      onClick={() => setMethod(option.value)}
                      className={cn('relative flex h-12 items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-all duration-200', method === option.value ? 'text-[#156253]' : 'text-ink-muted hover:text-ink')}
                    >
                      {method === option.value && <motion.span layoutId="method-pill" className="absolute inset-0 rounded-xl bg-white shadow-sm border border-brand-100/50" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                      <option.icon className="relative h-4 w-4" aria-hidden />
                      <span className="relative">{option.label}</span>
                    </button>
                  ))}
                </div>
                
                <div className="mt-6">
                  {method === 'manual_text' ? (
                    <MedicineListEditor rows={rows} errors={rowErrors} onChange={setRows} onAdd={() => setRows((current) => [...current, emptyRow()])} />
                  ) : (
                    <PrescriptionUploader
                      state={upload}
                      onChange={(state) => {
                        setUpload(state);
                        if (state.status === 'done') setUploadError(undefined);
                      }}
                      error={uploadError}
                    />
                  )}
                </div>
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="step-details">
                <h1 id="step-details" className="font-display text-2xl font-extrabold text-ink">Delivery details</h1>
                <p className="mt-1 text-sm font-medium text-ink-muted">We deliver safely across Goregaon East, Mumbai.</p>
                <div className="mt-6">
                  <DeliveryDetailsForm value={details} errors={detailErrors} saveDetails={saveDetails} onChange={setDetails} onSaveDetailsChange={setSaveDetails} />
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="step-review" className="space-y-5">
                <h1 id="step-review" className="font-display text-2xl font-extrabold text-ink">Review your order</h1>

                <div className="rounded-3xl bg-surface p-5 ring-1 ring-brand-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink-muted">{method === 'manual_text' ? 'Medicines' : 'Prescription'}</p>
                    <button type="button" onClick={() => go(0)} className="text-[13px] font-bold text-[#156253] hover:underline">Edit</button>
                  </div>
                  {method === 'manual_text' ? (
                    <ul className="mt-4 space-y-3">
                      {filledRows.map((row) => (
                        <li key={row.id} className="flex justify-between gap-4 text-sm">
                          <span className="font-semibold text-ink">{row.name}</span>
                          <span className="font-medium text-ink-muted">{row.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    upload.status === 'done' && (
                      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-brand-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={upload.previewUrl} alt="Your prescription" className="h-16 w-14 shrink-0 rounded-xl object-cover shadow-sm" />
                        <p className="text-xs font-medium leading-relaxed text-ink-muted">The pharmacy will review your prescription and confirm medicines with you.</p>
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-3xl bg-surface p-5 ring-1 ring-brand-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink-muted"><MapPin className="h-4 w-4" aria-hidden /> Delivery to</p>
                    <button type="button" onClick={() => go(1)} className="text-[13px] font-bold text-[#156253] hover:underline">Edit</button>
                  </div>
                  <p className="text-sm font-bold text-ink">{details.customerName}</p>
                  <p className="text-sm font-medium text-ink-muted">{formatMobile(normalizeMobile(details.mobileNumber) ?? '')}</p>
                  <p className="mt-1 text-sm font-medium text-ink-muted">{[details.address.flat, details.address.area, details.address.landmark].filter(Boolean).join(', ')}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-3xl bg-white p-4 ring-1 ring-brand-100">
                    <Wallet className="mt-0.5 h-5 w-5 text-[#156253]" aria-hidden />
                    <p className="text-sm"><span className="font-bold text-ink">Payment</span><br /><span className="font-medium text-ink-muted">{PAYMENT_LABEL}</span></p>
                  </div>
                  <div className="flex items-start gap-3 rounded-3xl bg-white p-4 ring-1 ring-brand-100">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#156253]" aria-hidden />
                    <p className="text-sm">
                      <span className="font-bold text-ink">{settings.deliveryCharge === 0 ? 'FREE Delivery' : `Delivery ${formatRupees(settings.deliveryCharge)}`}</span>
                      <br />
                      <span className="font-medium text-ink-muted">Final amount confirmed after billing</span>
                    </p>
                  </div>
                </div>

                {giftAvailable && (
                  <label className={cn('flex cursor-pointer items-start gap-3 rounded-3xl p-4 ring-1 transition-colors', offerOptIn ? 'bg-[#fff5e6] ring-[#dfa442]/50' : 'bg-white ring-brand-100')}>
                    <input type="checkbox" checked={offerOptIn} onChange={(event) => setOfferOptIn(event.target.checked)} className="mt-1 h-4 w-4 accent-[#dfa442]" />
                    <span className="text-sm">
                      <span className="flex items-center gap-1.5 font-bold text-ink"><Gift className="h-4 w-4 text-[#dfa442]" aria-hidden /> Claim FREE {GIFT.shortName}</span>
                      <span className="mt-1 block text-xs font-medium text-[#7a6441] leading-relaxed">
                        For first orders over {threshold} in medicines (after discounts). Final eligibility is confirmed upon billing.
                      </span>
                    </span>
                  </label>
                )}
                
                <PharmacyNotice />
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => go((step - 1) as Step)} disabled={submitting} className="px-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {step < 2 ? (
            <Button size="lg" className="flex-1 bg-[#156253] hover:bg-[#0f4b3f]" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button size="lg" className="flex-1 bg-[#156253] hover:bg-[#0f4b3f]" onClick={placeOrder} loading={submitting}>
              {submitting ? 'Placing order…' : 'Place Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}