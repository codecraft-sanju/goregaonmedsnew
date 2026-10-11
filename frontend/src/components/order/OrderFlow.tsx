// src/components/order/OrderFlow.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  useEffect, useRef, useState, useCallback, ChangeEvent, 
  forwardRef, useId, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode 
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Camera, ClipboardList, Gift, MapPin, 
  ShieldCheck, Wallet, Minus, Plus, Trash2, Info, CheckCircle2, 
  FolderOpen, Images, Loader2, RefreshCw, X 
} from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { ApiError, apiRequest } from '@/lib/api';
import { clearCheckout, loadCheckout, saveCheckout } from '@/lib/checkoutStorage';
import { GIFT, PAYMENT_LABEL } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatMobile, formatRupees, normalizeMobile } from '@/lib/format';
import type { CreateOrderPayload, CreateOrderResponse, OrderType, Address } from '@/lib/types';
import { createRequestId } from '@/lib/uuid';
import { compressPrescription, ImageCompressionError } from '@/lib/imageCompression';
import { uploadPrescription, UploadError } from '@/lib/cloudinaryUpload';


type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-[background-color,transform,box-shadow] duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

// --- Field Component ---
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  leading?: ReactNode;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, optional, leading, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      <div
        className={cn(
          'flex items-center rounded-2xl bg-white ring-1 ring-inset transition-shadow focus-within:ring-2',
          error ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500',
        )}
      >
        {leading && <span className="pl-4 text-[15px] font-medium text-ink-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-12 w-full rounded-2xl bg-transparent px-4 text-[15px] text-ink placeholder:text-ink-soft focus:outline-none"
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

// --- Pharmacy Notice Component ---
function PharmacyNotice({ className }: { className?: string }) {
  return (
    <div className={cn('hidden md:flex gap-3 rounded-2xl bg-brand-50/70 p-4 text-sm text-ink-muted ring-1 ring-brand-100', className)} role="note">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      <p>
        Prescription medicines will be supplied only against a valid prescription where required. Medicine availability and the final payable amount will be confirmed by the pharmacy.
      </p>
    </div>
  );
}



export interface MedicineRow {
  id: string;
  name: string;
  quantity: string;
}

export interface DeliveryDetails {
  customerName: string;
  mobileNumber: string;
  address: Address;
}

export type UploadState =
  | { status: 'idle' }
  | { status: 'compressing'; fileName: string }
  | { status: 'uploading'; fileName: string; progress: number; previewUrl: string }
  | { status: 'done'; fileName: string; previewUrl: string; url: string; originalSize: number; uploadedSize: number }
  | { status: 'error'; message: string; file?: File };

type DetailErrors = Partial<Record<'customerName' | 'mobileNumber' | 'flat' | 'area' | 'landmark', string>>;

const STEPS = ['Your medicines', 'Delivery details', 'Review & place'] as const;
type Step = 0 | 1 | 2;

export const MAX_MEDICINES = 30;

const emptyRow = (): MedicineRow => ({ id: createRequestId(), name: '', quantity: '1 Strip' });
const emptyDetails: DeliveryDetails = { customerName: '', mobileNumber: '', address: { flat: '', area: '', landmark: '' } };

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

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

function failureMessage(error: unknown) {
  if (error instanceof ImageCompressionError || error instanceof UploadError || error instanceof ApiError) return error.message;
  return 'Upload failed. Please try again.';
}

// ==========================================
// COMPONENT: PrescriptionUploader
// ==========================================

interface PrescriptionUploaderProps {
  state: UploadState;
  onChange: (state: UploadState) => void;
  error?: string;
}

function PrescriptionUploader({ state, onChange, error }: PrescriptionUploaderProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const replacePreview = (next: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
  };

  const start = async (file: File) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    onChange({ status: 'compressing', fileName: file.name });
    try {
      const compressed = await compressPrescription(file);
      const previewUrl = URL.createObjectURL(compressed);
      replacePreview(previewUrl);
      onChange({ status: 'uploading', fileName: file.name, progress: 0, previewUrl });
      const url = await uploadPrescription(
        compressed,
        (progress) => !abort.signal.aborted && onChange({ status: 'uploading', fileName: file.name, progress, previewUrl }),
        abort.signal,
      );
      if (abort.signal.aborted) return;
      onChange({ status: 'done', fileName: file.name, previewUrl, url, originalSize: file.size, uploadedSize: compressed.size });
    } catch (err) {
      if (abort.signal.aborted || (err as Error).name === 'AbortError') return;
      onChange({ status: 'error', message: failureMessage(err), file });
    }
  };

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void start(file);
  };

  const reset = () => {
    controller.current?.abort();
    replacePreview(null);
    onChange({ status: 'idle' });
  };

  const busy = state.status === 'compressing' || state.status === 'uploading';
  const previewUrl = state.status === 'uploading' || state.status === 'done' ? state.previewUrl : null;

  return (
    <div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSelect} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onSelect} />
      <input ref={filesInput} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onSelect} />

      <AnimatePresence mode="wait" initial={false}>
        {state.status === 'idle' || state.status === 'error' ? (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={cn('rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors', error || state.status === 'error' ? 'border-red-300 bg-red-50/50' : 'border-[#156253]/30 bg-[#e5f7ed]/50')}>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm mb-4 text-[#156253]">
                <Images className="h-6 w-6" />
              </div>
              <p className="font-display text-lg font-bold text-ink">Upload Prescription</p>
              <p className="mt-1.5 text-xs font-medium text-ink-muted px-2">Ensure the doctor’s name, date, and medicines are clearly readable.</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: 'Camera', icon: Camera, ref: cameraInput },
                  { label: 'Gallery', icon: Images, ref: galleryInput },
                  { label: 'Files', icon: FolderOpen, ref: filesInput },
                ].map((source) => (
                  <button
                    key={source.label}
                    type="button"
                    onClick={() => source.ref.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white h-20 text-xs font-bold text-[#156253] shadow-sm transition-transform active:scale-[0.96]"
                  >
                    <source.icon className="h-6 w-6" aria-hidden />
                    {source.label}
                  </button>
                ))}
              </div>
            </div>
            {state.status === 'error' && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                <span>{state.message}</span>
                {state.file && (
                  <button type="button" onClick={() => state.file && start(state.file)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-100 px-3 text-red-800">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                )}
              </div>
            )}
            {error && state.status !== 'error' && <p className="mt-2 text-center text-sm font-semibold text-red-600 animate-in slide-in-from-top-1">{error}</p>}
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
            <div className="flex gap-4">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-brand-50">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Prescription preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#156253]" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold text-ink">{state.fileName}</p>
                  <button type="button" onClick={reset} className="rounded-full bg-surface p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors" aria-label={busy ? 'Cancel upload' : 'Remove prescription'}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {state.status === 'compressing' && <p className="mt-2 text-xs font-medium text-ink-muted">Optimising photo…</p>}
                {state.status === 'uploading' && (
                  <div className="mt-3 w-full pr-2">
                    <div className="flex justify-between text-xs font-bold text-[#156253] mb-1.5">
                      <span>Uploading…</span><span>{state.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eaf4f4]">
                      <motion.div className="h-full bg-[#156253]" animate={{ width: `${state.progress}%` }} transition={{ ease: 'easeOut' }} />
                    </div>
                  </div>
                )}
                {state.status === 'done' && (
                  <>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#147a4a]"><CheckCircle2 className="h-4 w-4" /> Uploaded successfully</p>
                    <p className="mt-1 text-[10px] font-medium text-ink-soft">
                      {state.uploadedSize < state.originalSize ? `Optimised to ${formatSize(state.uploadedSize)}` : formatSize(state.uploadedSize)}
                    </p>
                    <button type="button" onClick={() => galleryInput.current?.click()} className="mt-3 text-xs font-bold text-[#156253] hover:underline w-fit">Replace photo</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// COMPONENT: DeliveryDetailsForm
// ==========================================

interface DeliveryDetailsFormProps {
  value: DeliveryDetails;
  errors: Partial<Record<'customerName' | 'mobileNumber' | 'flat' | 'area' | 'landmark', string>>;
  saveDetails: boolean;
  onChange: (value: DeliveryDetails) => void;
  onSaveDetailsChange: (save: boolean) => void;
}

function DeliveryDetailsForm({ value, errors, saveDetails, onChange, onSaveDetailsChange }: DeliveryDetailsFormProps) {
  const setAddress = (field: keyof Address, fieldValue: string) => onChange({ ...value, address: { ...value.address, [field]: fieldValue } });

  return (
    <div className="space-y-4">
      <Field
        label="Full Name"
        autoComplete="name"
        maxLength={80}
        value={value.customerName}
        onChange={(event) => onChange({ ...value, customerName: event.target.value })}
        error={errors.customerName}
      />
      <Field
        label="Mobile Number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        leading="+91"
        placeholder="98200 12345"
        value={value.mobileNumber}
        onChange={(event) => onChange({ ...value, mobileNumber: event.target.value.replace(/[^\d\s-]/g, '') })}
        error={errors.mobileNumber}
        hint="We’ll call this number to confirm your order."
      />
      <div className="rounded-3xl bg-surface p-4 ring-1 ring-brand-100 sm:p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-soft">Delivery Address</h3>
        <div className="space-y-4">
          <Field
            label="Flat / House / Building"
            autoComplete="address-line1"
            maxLength={120}
            value={value.address.flat}
            onChange={(event) => setAddress('flat', event.target.value)}
            error={errors.flat}
          />
          <Field
            label="Area"
            autoComplete="address-line2"
            maxLength={120}
            placeholder="e.g. Aarey Road, Goregaon East"
            value={value.address.area}
            onChange={(event) => setAddress('area', event.target.value)}
            error={errors.area}
          />
          <Field
            label="Landmark"
            optional
            maxLength={120}
            placeholder="e.g. Near Oberoi Mall"
            value={value.address.landmark}
            onChange={(event) => setAddress('landmark', event.target.value)}
            error={errors.landmark}
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-brand-50/50 p-4 text-sm ring-1 ring-brand-100 transition-colors hover:bg-brand-50">
        <input
          type="checkbox"
          checked={saveDetails}
          onChange={(event) => onSaveDetailsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-brand-300 text-[#156253] accent-[#156253]"
        />
        <span>
          <span className="font-semibold text-ink">Save my details for faster checkout</span>
          <span className="mt-1 block text-xs font-medium text-ink-muted">Stored securely on this device for 180 days.</span>
        </span>
      </label>
    </div>
  );
}

// ==========================================
// COMPONENT: MedicineListEditor
// ==========================================

interface MedicineListEditorProps {
  rows: MedicineRow[];
  errors: Record<string, string>;
  onChange: (rows: MedicineRow[]) => void;
  onAdd: () => void;
}

function MedicineListEditor({ rows, errors, onChange, onAdd }: MedicineListEditorProps) {
  const update = (id: string, field: 'name' | 'quantity', value: string) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const remove = (id: string) => onChange(rows.filter((row) => row.id !== id));

  const getQtyNumber = (qtyString: string) => {
    const num = parseInt(qtyString, 10);
    return isNaN(num) ? 1 : num;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-2xl bg-[#fff5e6] p-3 ring-1 ring-[#dfa442]/30">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#b87c1c]" aria-hidden="true" />
        <p className="text-xs text-[#7a6441] leading-relaxed font-medium">
          <strong className="font-bold">Please note:</strong> We currently fulfill orders in complete strips or sealed packs only. Loose tablets are not available.
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <motion.div
              key={row.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <fieldset className={cn("rounded-3xl bg-white p-4 shadow-sm ring-1", errors[`${row.id}-name`] ? "ring-red-300" : "ring-brand-100")}>
                <legend className="sr-only">Medicine {index + 1}</legend>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[10px] font-bold uppercase tracking-widest text-[#156253]">
                    Item {index + 1}
                  </span>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => remove(row.id)} className="rounded-full p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors" aria-label={`Remove item ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
                  <div>
                    <label htmlFor={`${row.id}-name`} className="mb-1.5 block text-xs font-bold text-ink">Medicine Name</label>
                    <input
                      id={`${row.id}-name`}
                      value={row.name}
                      onChange={(event) => update(row.id, 'name', event.target.value)}
                      placeholder="e.g. Dolo 650"
                      maxLength={120}
                      autoComplete="off"
                      className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] font-medium ring-1 ring-inset ring-brand-50 placeholder:font-normal placeholder:text-ink-soft focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#156253] transition-all"
                    />
                    {errors[`${row.id}-name`] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[`${row.id}-name`]}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-ink">Quantity</label>
                    <div className="flex h-12 w-full items-center justify-between rounded-xl bg-surface px-1.5 ring-1 ring-inset ring-brand-50">
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = getQtyNumber(row.quantity);
                          if (currentVal > 1) {
                            const newVal = currentVal - 1;
                            update(row.id, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                          }
                        }}
                        disabled={getQtyNumber(row.quantity) <= 1}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="text-sm font-bold tabular-nums text-[#156253]">
                        {getQtyNumber(row.quantity)} Strip{getQtyNumber(row.quantity) > 1 ? 's' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const newVal = getQtyNumber(row.quantity) + 1;
                          update(row.id, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink shadow-sm transition-transform active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </fieldset>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button variant="secondary" onClick={onAdd} disabled={rows.length >= MAX_MEDICINES} icon={<Plus className="h-4 w-4" />} className="w-full bg-surface hover:bg-brand-50 border-none font-bold text-brand-700">
        Add Another Medicine
      </Button>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT: OrderFlow
// ==========================================

export function OrderFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const { settings, loading: settingsLoading } = usePublicSettings();

  // URL se initial step calculate karna (default 0)
  const urlStepParam = parseInt(params.get('step') || '1', 10) - 1;
  const initialStep = (isNaN(urlStepParam) || urlStepParam < 0 || urlStepParam > 2) ? 0 : (urlStepParam as Step);

  const [step, setStep] = useState<Step>(initialStep);
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

  const [isClientMounted, setIsClientMounted] = useState(false);

  const clientRequestId = useRef<string | null>(null);
  const submitLock = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Mounted check to avoid hydration mismatch
  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Load saved details on mount
  useEffect(() => {
    const saved = loadCheckout();
    if (saved) {
      setDetails(saved);
      setSaveDetails(true);
    }
  }, []);

  // Listen for URL changes to handle Browser Back/Forward buttons
  useEffect(() => {
    const currentUrlStep = parseInt(params.get('step') || '1', 10) - 1;
    const validStep = (isNaN(currentUrlStep) || currentUrlStep < 0 || currentUrlStep > 2) ? 0 : (currentUrlStep as Step);

    setStep((prevStep) => {
      if (validStep !== prevStep) {
        setDirection(validStep > prevStep ? 1 : -1);
        return validStep;
      }
      return prevStep;
    });
  }, [params]);

  // Handle Step Navigation with URL update
  const go = useCallback(
    (next: Step) => {
      const newParams = new URLSearchParams(params.toString());
      newParams.set('step', (next + 1).toString());

      router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [params, pathname, router]
  );

  // Handle Method Tab change (Prescription vs Text) with URL update
  const handleMethodChange = (newMethod: OrderType) => {
    setMethod(newMethod);
    const newParams = new URLSearchParams(params.toString());
    newParams.set('method', newMethod === 'prescription_image' ? 'prescription' : 'manual');
    // replaceState keeps history clean, so hitting back doesn't just switch tabs
    window.history.replaceState(null, '', `${pathname}?${newParams.toString()}`);
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

  if (!isClientMounted) return null;

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
                      onClick={() => handleMethodChange(option.value)}
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