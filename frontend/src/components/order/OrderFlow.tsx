// src/components/order/OrderFlow.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  useEffect, useRef, useState, useCallback, 
  forwardRef, useId, type InputHTMLAttributes, type ChangeEvent, type ReactNode 
} from 'react';
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Gift, MapPin, 
  ShieldCheck, Wallet, Loader2, Camera, Images, 
  FolderOpen, RefreshCw, X, CheckCircle2, Plus, Minus, Trash2, Info, ShoppingBag, FileText
} from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { ApiError, apiRequest } from '@/lib/api';
import { clearCheckout, loadCheckout, saveCheckout } from '@/lib/checkoutStorage';
import { GIFT, PAYMENT_LABEL } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { formatMobile, formatRupees, normalizeMobile } from '@/lib/format';
import type { CreateOrderPayload, CreateOrderResponse, Address, Product, MedicineItem } from '@/lib/types';
import { createRequestId } from '@/lib/uuid';
import { compressPrescription, ImageCompressionError } from '@/lib/imageCompression';
import { uploadPrescription, UploadError } from '@/lib/cloudinaryUpload';
import { useCartStore } from '@/store/cartStore';

// --- UI Components ---
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[#156253] text-white hover:bg-[#0f4b3f] shadow-[0_8px_20px_-8px_rgba(21,98,83,0.6)] disabled:bg-[#156253]/60',
  secondary: 'bg-white text-[#156253] border-2 border-[#156253]/10 hover:bg-[#eaf4f4] disabled:text-[#156253]/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-[20px]',
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex select-none items-center justify-center font-bold transition-[background-color,box-shadow,border-color,opacity] duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        'disabled:cursor-not-allowed disabled:opacity-70',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
    </motion.button>
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
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-ink-muted">
        {label}
        {optional && <span className="text-[10px] font-medium text-ink-soft">Optional</span>}
      </label>
      <div
        className={cn(
          'flex items-center rounded-2xl bg-white ring-1 ring-inset transition-all duration-300 focus-within:ring-2 focus-within:shadow-[0_4px_20px_rgba(21,98,83,0.08)]',
          error ? 'ring-red-300 focus-within:ring-red-500' : 'ring-gray-200 focus-within:ring-[#156253]',
        )}
      >
        {leading && <span className="pl-4 text-[15px] font-semibold text-ink-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-[52px] w-full rounded-2xl bg-transparent px-4 text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-gray-400 focus:outline-none"
          {...props}
        />
      </div>
      {error ? (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </motion.p>
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
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn('flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#eaf4f4] to-[#f4fafa] p-4 ring-1 ring-[#156253]/10', className)} role="note">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#156253]/10">
        <Info className="h-4 w-4 text-[#156253]" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold text-ink">Complete strips & sealed packs only.</p>
        <p className="mt-0.5 text-xs font-medium text-ink-muted">We do not dispense loose tablets for your safety.</p>
      </div>
    </motion.div>
  );
}

// --- Types & Validation ---
type OrderType = 'prescription_image' | 'manual_text';

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

const STEPS = ['Items', 'Delivery', 'Review'] as const;
type Step = 0 | 1 | 2;

export const MAX_MEDICINES = 30;

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
    <div className="w-full">
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSelect} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onSelect} />
      <input ref={filesInput} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onSelect} />

      <AnimatePresence mode="wait" initial={false}>
        {state.status === 'idle' || state.status === 'error' ? (
          <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className={cn('rounded-[24px] border-2 border-dashed p-6 sm:p-8 text-center transition-colors bg-[#f4fafa]', error || state.status === 'error' ? 'border-red-300 bg-red-50' : 'border-[#156253]/20 hover:bg-[#eaf4f4]')}>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm mb-4 text-[#156253]">
                <Images className="h-6 w-6" />
              </div>
              <p className="text-lg font-bold text-ink">Upload Prescription</p>
              <p className="mt-1.5 text-xs font-medium text-ink-muted px-2">Ensure the doctor’s name, date, and medicines are clearly readable.</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: 'Camera', icon: Camera, ref: cameraInput },
                  { label: 'Gallery', icon: Images, ref: galleryInput },
                  { label: 'Files', icon: FolderOpen, ref: filesInput },
                ].map((source) => (
                  <motion.button
                    key={source.label}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => source.ref.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white h-20 text-xs font-bold text-[#156253] shadow-sm ring-1 ring-gray-100 hover:ring-[#156253]/30 hover:shadow-md transition-all duration-200"
                  >
                    <source.icon className="h-6 w-6" aria-hidden />
                    {source.label}
                  </motion.button>
                ))}
              </div>
            </div>
            {state.status === 'error' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                <span>{state.message}</span>
                {state.file && (
                  <button type="button" onClick={() => state.file && start(state.file)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-100 px-3 text-red-800 active:scale-95 transition-transform">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                )}
              </motion.div>
            )}
            {error && state.status !== 'error' && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-sm font-semibold text-red-600">{error}</motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', damping: 22, stiffness: 300 }} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex gap-4">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[16px] bg-[#f4fafa] ring-1 ring-gray-100">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={previewUrl} alt="Prescription preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#156253]" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold text-ink">{state.fileName}</p>
                  <button type="button" onClick={reset} className="rounded-full bg-gray-50 p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all duration-200" aria-label={busy ? 'Cancel upload' : 'Remove prescription'}>
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
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#156253]"><CheckCircle2 className="h-4 w-4" /> Uploaded successfully</p>
                    <p className="mt-1 text-[10px] font-medium text-ink-soft">
                      {state.uploadedSize < state.originalSize ? `Optimised to ${formatSize(state.uploadedSize)}` : formatSize(state.uploadedSize)}
                    </p>
                    <button type="button" onClick={() => galleryInput.current?.click()} className="mt-3 text-xs font-bold text-[#156253] hover:underline w-fit">Replace photo</button>
                  </motion.div>
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

export function DeliveryDetailsForm({ value, errors, saveDetails, onChange, onSaveDetailsChange }: DeliveryDetailsFormProps) {
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
        placeholder="Enter your name"
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
      <div className="rounded-[24px] bg-white p-4 ring-1 ring-gray-200 sm:p-5 mt-2">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-muted">Delivery Address</h3>
        <div className="space-y-4">
          <Field
            label="Flat / House / Building"
            autoComplete="address-line1"
            maxLength={120}
            value={value.address.flat}
            onChange={(event) => setAddress('flat', event.target.value)}
            error={errors.flat}
            placeholder="e.g. 402, Shiv Shakti"
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
      <label className="flex cursor-pointer items-start gap-3 rounded-[20px] bg-white p-4 text-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 mt-2">
        <input
          type="checkbox"
          checked={saveDetails}
          onChange={(event) => onSaveDetailsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#156253] accent-[#156253] transition-transform active:scale-90"
        />
        <span>
          <span className="font-bold text-ink">Save my details for faster checkout</span>
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
  medicines: MedicineItem[];
  errors: Record<string, string>;
  updateMedicine: (id: string, field: 'name' | 'quantity', value: string) => void;
  removeMedicine: (id: string) => void;
  addMedicine: () => void;
}

function MedicineListEditor({ medicines, errors, updateMedicine, removeMedicine, addMedicine }: MedicineListEditorProps) {
  const getQtyNumber = (qtyString: string) => {
    const num = parseInt(qtyString, 10);
    return isNaN(num) ? 1 : num;
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-ink">Add your medicines</h2>
        <p className="mt-1 text-[13px] text-ink-muted font-medium">Search for the medicine name and choose quantity.</p>
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {medicines.map((row) => (
            <motion.div
              key={row._id}
              layout
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <div className={cn(
                "flex items-stretch rounded-[24px] bg-white p-3.5 shadow-sm ring-1 transition-all duration-300 group focus-within:ring-2 focus-within:shadow-[0_4px_24px_rgba(21,98,83,0.08)]", 
                errors[`${row._id}-name`] ? "ring-red-300 focus-within:ring-red-500" : "ring-gray-100 focus-within:ring-[#156253]"
              )}>
                
                <div className="flex-1 flex flex-col justify-center space-y-3 py-1 pr-1">
                  
                  <div className="relative">
                    <label htmlFor={`${row._id}-name`} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-muted">Medicine name</label>
                    <div className="relative">
                      <input
                        id={`${row._id}-name`}
                        value={row.name}
                        onChange={(event) => updateMedicine(row._id!, 'name', event.target.value)}
                        placeholder="e.g. Dolo 650"
                        maxLength={120}
                        autoComplete="off"
                        className="h-10 w-full rounded-xl bg-[#f8fbfb] px-3 text-[15px] font-bold text-ink ring-1 ring-inset ring-gray-100 placeholder:font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#156253]/20 focus:bg-white transition-all"
                      />
                      {row.name && (
                         <button 
                            type="button" 
                            onClick={() => updateMedicine(row._id!, 'name', '')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                         >
                            <X className="h-4 w-4" />
                         </button>
                      )}
                    </div>
                    {errors[`${row._id}-name`] && <p className="mt-1 text-[10px] font-semibold text-red-600">{errors[`${row._id}-name`]}</p>}
                  </div>

                  {/* Quantity & Delete */}
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-muted">Quantity</label>
                      <div className="flex h-10 w-full max-w-[180px] items-center justify-between rounded-xl bg-white px-1 ring-1 ring-inset ring-gray-200 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const currentVal = getQtyNumber(row.quantity);
                            if (currentVal > 1) {
                              const newVal = currentVal - 1;
                              updateMedicine(row._id!, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                            }
                          }}
                          disabled={getQtyNumber(row.quantity) <= 1}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf4f4] text-[#156253] font-bold active:scale-90 disabled:opacity-40 transition-transform"
                        >
                          <Minus className="h-4 w-4" strokeWidth={2.5} />
                        </button>

                        <span className="text-[13px] font-bold tabular-nums text-ink">
                          {getQtyNumber(row.quantity)} Strip{getQtyNumber(row.quantity) > 1 ? 's' : ''}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const newVal = getQtyNumber(row.quantity) + 1;
                            updateMedicine(row._id!, 'quantity', `${newVal} Strip${newVal > 1 ? 's' : ''}`);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-[#156253] text-white font-bold active:scale-90 transition-transform"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Trash Button */}
                    <button 
                      type="button" 
                      onClick={() => removeMedicine(row._id!)} 
                      disabled={medicines.length === 1 && !row.name}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-red-50 hover:text-red-600 hover:ring-red-100 disabled:opacity-40 active:scale-90 transition-all duration-200" 
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button 
        variant="secondary" 
        onClick={addMedicine} 
        disabled={medicines.length >= MAX_MEDICINES} 
        icon={<Plus className="h-5 w-5 mr-1" />} 
        className="w-full bg-white hover:bg-[#f4fafa] border-2 border-[#156253]/10 font-bold text-[#156253] h-[52px] rounded-[20px]"
      >
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
  const prefersReducedMotion = useReducedMotion();

  const urlStepParam = parseInt(params.get('step') || '1', 10) - 1;
  const initialStep = (isNaN(urlStepParam) || urlStepParam < 0 || urlStepParam > 2) ? 0 : (urlStepParam as Step);

  const [step, setStep] = useState<Step>(initialStep);
  const [direction, setDirection] = useState(1);
  const [method, setMethod] = useState<OrderType>(params.get('method') === 'prescription' ? 'prescription_image' : 'manual_text');
  
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  
  // Cart Store State
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const { 
    items: selectedProducts, 
    medicines, 
    prescription, 
    addMedicine, 
    removeMedicine, 
    updateMedicine, 
    setPrescription,
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart 
  } = useCartStore();

  const [upload, setUpload] = useState<UploadState>(() => {
    if (prescription) return { status: 'done', url: prescription.url, previewUrl: prescription.previewUrl || prescription.url, fileName: prescription.fileName, originalSize: 0, uploadedSize: 0 };
    return { status: 'idle' };
  });
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

  useEffect(() => { setIsClientMounted(true); }, []);
  
  useEffect(() => {
    const saved = loadCheckout();
    if (saved) { setDetails(saved); setSaveDetails(true); }
  }, []);

  // Fetch active products on load for Everyday Essentials
  useEffect(() => {
    apiRequest<{products: Product[]}>('/products')
      .then(res => setAvailableProducts(res.products))
      .catch(() => {});
  }, []);

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

  const go = useCallback((next: Step) => {
    const newParams = new URLSearchParams(params.toString());
    newParams.set('step', (next + 1).toString());
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [params, pathname, router]);

  const handleMethodChange = (newMethod: OrderType) => {
    setMethod(newMethod);
    const newParams = new URLSearchParams(params.toString());
    newParams.set('method', newMethod === 'prescription_image' ? 'prescription' : 'manual');
    window.history.replaceState(null, '', `${pathname}?${newParams.toString()}`);
  };

  const handleProductToggle = (product: Product) => {
    const existing = selectedProducts.find(p => p.product._id === product._id);
    if (existing) {
      removeItem(product._id);
    } else {
      addItem(product);
    }
  };

  const handleProductQuantity = (productId: string, increment: boolean) => {
    const item = selectedProducts.find(p => p.product._id === productId);
    if (!item) return;
    const newQty = increment ? item.quantity + 1 : Math.max(1, item.quantity - 1);
    updateQuantity(productId, newQty);
  };

  const filledRows = medicines.filter((row) => row.name.trim());
  const hasMedicineInput = filledRows.length > 0;
  const hasProductInput = selectedProducts.length > 0;

const validateItems = () => {
    if (method === 'manual_text') {
      const errors: Record<string, string> = {};
      for (const row of filledRows) {
        if (!row.name.trim()) errors[`${row._id}-name`] = 'Required';
      }
      if (filledRows.length === 0 && !hasProductInput && medicines.length > 0) {
        // Add the exclamation mark (!) after medicines[0]
        errors[`${medicines[0]!._id}-name`] = 'Add at least one medicine or product';
      }
      setRowErrors(errors);
      return Object.keys(errors).length === 0;
    }
    
    // Prescription validation
    if (upload.status === 'compressing' || upload.status === 'uploading') {
      setUploadError('Please wait for the upload to finish');
      return false;
    }
    if (upload.status !== 'done' && !hasProductInput) {
      setUploadError('Upload a prescription or add a product to continue');
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
    
    const orderProducts = selectedProducts.map(p => ({
      productId: p.product._id,
      name: p.product.name,
      price: p.product.price,
      quantity: p.quantity
    }));

    const payload: CreateOrderPayload = {
      clientRequestId: clientRequestId.current,
      customerName: details.customerName.trim(),
      mobileNumber: normalizeMobile(details.mobileNumber) ?? details.mobileNumber,
      orderType: method,
      medicines: method === 'manual_text' ? filledRows.map(({ name, quantity }) => ({ name: name.trim(), quantity: quantity.trim() })) : [],
      products: orderProducts,
      prescriptionUrl: method === 'prescription_image' && upload.status === 'done' ? upload.url : undefined,
      address: { flat: details.address.flat.trim(), area: details.address.area.trim(), landmark: details.address.landmark.trim() },
      offerOptIn: settings.firstOrderOfferEnabled && offerOptIn,
    };

    try {
      const result = await apiRequest<CreateOrderResponse>('/orders/create', { method: 'POST', body: payload });
      if (saveDetails) saveCheckout({ customerName: payload.customerName, mobileNumber: payload.mobileNumber, address: payload.address });
      else clearCheckout();
      
      clearCart();
      
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

  const isStep0Valid = method === 'manual_text' ? hasMedicineInput || hasProductInput : upload.status === 'done' || hasProductInput;
  const showCTA = step > 0 || isStep0Valid;

  const giftAvailable = !settingsLoading && settings.firstOrderOfferEnabled;
  const threshold = formatRupees(settings.firstOrderMinimumMedicineAmount);

  if (!isClientMounted) return null;

  return (
    <div ref={topRef} className="mx-auto w-full max-w-2xl px-4 sm:px-6 relative pb-6 md:pb-8 pt-4">
        
      {/* Progress Indicator */}
      <div className="mb-8 flex items-center justify-between px-2 pt-4 relative z-10">
        <div className="absolute top-1/2 left-6 right-6 h-[1px] bg-gray-200 -translate-y-1/2 -z-10" />
        {STEPS.map((label, index) => {
          const isActive = index === step;
          const isPast = index < step;
          return (
            <div key={label} className="flex items-center gap-2.5 bg-[#f8fbfb] pl-1 pr-2">
              <motion.div 
                animate={{
                  backgroundColor: isActive ? "#156253" : isPast ? "rgba(21,98,83,0.15)" : "#f3f4f6",
                  color: isActive ? "#ffffff" : isPast ? "#156253" : "#9ca3af"
                }}
                className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold"
              >
                {index + 1}
              </motion.div>
              <span className={cn("text-[13px] font-bold", isActive ? "text-[#156253]" : "text-gray-400")}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : direction * 25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: prefersReducedMotion ? 0 : direction * -25 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
          {step === 0 && (
            <section aria-labelledby="step-items">
              
              <div className="relative mb-8 flex items-center justify-between gap-4 rounded-[32px] bg-gradient-to-br from-[#eaf4f4] via-[#f4fafa] to-transparent py-6 px-6 sm:px-8 border border-white shadow-sm overflow-hidden">
                 <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-[#156253]/5 rounded-full blur-2xl pointer-events-none" />
                 
                 <div className="relative z-10 flex-1">
                   <h1 id="step-items" className="text-[30px] sm:text-[34px] leading-tight font-extrabold text-ink tracking-tight mb-1">
                     What do you need?
                   </h1>
                   <p className="text-[15px] sm:text-[16px] font-medium text-ink-muted">Your medicines, delivered with care.</p>
                 </div>

                 <div className="relative z-10 shrink-0">
                   <Image 
                     src="/home/hero-pharmacy.svg" 
                     alt="Pharmacy delivery" 
                     width={140} 
                     height={140} 
                     className="object-contain drop-shadow-sm" 
                     priority 
                   />
                 </div>
              </div>

             <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5" role="group" aria-label="Ordering method">
                {/* 1. Enter Medicines Button */}
                <button
                  type="button"
                  onClick={() => handleMethodChange('manual_text')}
                  className={cn(
                    "relative flex items-center justify-center gap-3 h-[56px] md:h-[64px] rounded-[20px] transition-all duration-300 px-4 group active:scale-[0.98]",
                    method === 'manual_text' 
                      ? "bg-[#156253] text-white shadow-[0_8px_20px_-8px_rgba(21,98,83,0.6)]" 
                      : "bg-white text-[#156253] ring-1 ring-inset ring-[#156253]/20 hover:ring-[#156253]/40 hover:bg-[#f4fafa]"
                  )}
                >
                  <FileText size={22} strokeWidth={2.5} className="shrink-0" />
                  <span className={cn("text-[14px] md:text-[16px] font-bold leading-none mt-[2px]", method === 'manual_text' ? "text-white" : "text-[#0f1f1c]")}>
                    Enter Medicines
                  </span>
                  {method === 'manual_text' && (
                    <motion.div layoutId="methodIndicator" className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-white/70" />
                  )}
                </button>

                {/* 2. Upload Prescription Button */}
                <button
                  type="button"
                  onClick={() => handleMethodChange('prescription_image')}
                  className={cn(
                    "relative flex items-center justify-center gap-3 h-[56px] md:h-[64px] rounded-[20px] transition-all duration-300 px-4 group active:scale-[0.98]",
                    method === 'prescription_image' 
                      ? "bg-[#156253] text-white shadow-[0_8px_20px_-8px_rgba(21,98,83,0.6)]" 
                      : "bg-white text-[#156253] ring-1 ring-inset ring-[#156253]/20 hover:ring-[#156253]/40 hover:bg-[#f4fafa]"
                  )}
                >
                  <Camera size={22} strokeWidth={2.5} className="shrink-0" />
                  <span className={cn("text-[14px] md:text-[16px] font-bold leading-none mt-[2px]", method === 'prescription_image' ? "text-white" : "text-[#0f1f1c]")}>
                    Upload Prescription
                  </span>
                  {method === 'prescription_image' && (
                    <motion.div layoutId="methodIndicator" className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-white/70" />
                  )}
                </button>
              </div>

              <motion.div layout>
                {method === 'manual_text' ? (
                  <MedicineListEditor 
                    medicines={medicines} 
                    errors={rowErrors} 
                    updateMedicine={updateMedicine} 
                    removeMedicine={removeMedicine} 
                    addMedicine={addMedicine} 
                  />
                ) : (
                  <>
                    <PrescriptionUploader
                      state={upload}
                      onChange={(state) => {
                        setUpload(state);
                        if (state.status === 'done') {
                          setUploadError(undefined);
                          setPrescription({ url: state.url, previewUrl: state.previewUrl, fileName: state.fileName });
                        } else if (state.status === 'idle') {
                          setPrescription(null);
                        }
                      }}
                      error={uploadError}
                    />
                    <PharmacyNotice className="mt-8" />
                  </>
                )}
              </motion.div>

              {/* Cosmetics & OTC Products Section */}
              {availableProducts.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-100 pb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <ShoppingBag className="w-6 h-6 text-[#156253]" />
                    <h2 className="text-xl font-bold text-ink">Everyday Essentials</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {availableProducts.map(product => {
                      const selected = selectedProducts.find(p => p.product._id === product._id);
                      return (
                        <div key={product._id} className={cn("flex flex-col bg-white rounded-2xl border p-3 transition-all duration-200 relative overflow-hidden group", selected ? "border-[#156253] ring-1 ring-[#156253] shadow-md" : "border-gray-200 hover:border-[#156253]/30 hover:shadow-sm")}>
                          {selected && <div className="absolute top-0 right-0 w-8 h-8 bg-[#156253] rounded-bl-[20px] flex items-start justify-end p-1.5"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                          
                          <div className="h-24 w-full bg-[#f8fbfb] rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                            {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover mix-blend-multiply" />
                            ) : (
                              <ShoppingBag className="w-8 h-8 text-gray-300" />
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-[#156253] uppercase tracking-wider mb-1">{product.category}</p>
                              <h3 className="text-sm font-bold text-ink line-clamp-2 leading-tight">{product.name}</h3>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <span className="font-bold text-ink text-sm">{formatRupees(product.price)}</span>
                              
                              {!selected ? (
                                <button type="button" onClick={() => handleProductToggle(product)} className="h-7 w-7 rounded-full bg-gray-50 text-[#156253] grid place-items-center hover:bg-[#eaf4f4] ring-1 ring-gray-200 transition-colors">
                                  <Plus className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 bg-[#f8fbfb] rounded-full px-1 py-0.5 ring-1 ring-gray-200">
                                  <button type="button" onClick={() => { if (selected.quantity === 1) handleProductToggle(product); else handleProductQuantity(product._id, false); }} className="h-6 w-6 rounded-full bg-white text-ink grid place-items-center shadow-sm">
                                    {selected.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                  </button>
                                  <span className="text-xs font-bold w-3 text-center">{selected.quantity}</span>
                                  <button type="button" onClick={() => handleProductQuantity(product._id, true)} className="h-6 w-6 rounded-full bg-[#156253] text-white grid place-items-center shadow-sm">
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="step-details" className="pt-2">
              <h1 id="step-details" className="text-[32px] font-extrabold text-ink tracking-tight mb-2">Delivery details</h1>
              <p className="mt-1 text-[16px] font-medium text-ink-muted">We deliver safely across Goregaon East, Mumbai.</p>
              <div className="mt-8">
                <DeliveryDetailsForm value={details} errors={detailErrors} saveDetails={saveDetails} onChange={setDetails} onSaveDetailsChange={setSaveDetails} />
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-review" className="pt-2 space-y-6">
              <h1 id="step-review" className="text-[32px] font-extrabold text-ink tracking-tight mb-2">Review your order</h1>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">{method === 'manual_text' ? 'Medicines' : 'Prescription'}</p>
                  <button type="button" onClick={() => go(0)} className="text-[14px] font-bold text-[#156253] active:scale-95 transition-transform">Edit</button>
                </div>
                {method === 'manual_text' ? (
                  <ul className="mt-5 space-y-4">
                    {filledRows.map((row) => (
                      <li key={row._id} className="flex justify-between items-center gap-4 text-[16px]">
                        <span className="font-bold text-ink">{row.name}</span>
                        <span className="font-bold text-ink-muted bg-[#f4fafa] px-3 py-1 rounded-lg text-[13px]">{row.quantity}</span>
                      </li>
                    ))}
                    {filledRows.length === 0 && <li className="text-sm font-medium text-ink-soft italic">No medicines added</li>}
                  </ul>
                ) : (
                  upload.status === 'done' && (
                    <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-[#f8fbfb] p-3.5 ring-1 ring-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={upload.previewUrl} alt="Your prescription" className="h-[80px] w-[64px] shrink-0 rounded-[14px] object-cover shadow-sm ring-1 ring-black/5" />
                      <p className="text-[13px] font-medium leading-relaxed text-ink-muted pr-2">The pharmacy will review your prescription and confirm medicines with you.</p>
                    </div>
                  )
                )}

                {/* Display selected products in review */}
                {selectedProducts.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-[13px] font-bold uppercase tracking-wider text-ink-muted mb-4">Other Items</p>
                    <ul className="space-y-4">
                      {selectedProducts.map((p) => (
                        <li key={p.product._id} className="flex justify-between items-center gap-4 text-[16px]">
                          <span className="font-bold text-ink">{p.product.name}</span>
                          <span className="font-bold text-ink-muted bg-[#f4fafa] px-3 py-1 rounded-lg text-[13px]">Qty: {p.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Delivery to</p>
                  <button type="button" onClick={() => go(1)} className="text-[14px] font-bold text-[#156253] active:scale-95 transition-transform">Edit</button>
                </div>
                <p className="text-[16px] font-bold text-ink mb-0.5">{details.customerName}</p>
                <p className="text-[15px] font-medium text-ink-muted mb-2">{formatMobile(normalizeMobile(details.mobileNumber) ?? '')}</p>
                <p className="text-[14px] font-medium leading-relaxed text-ink-muted">{[details.address.flat, details.address.area, details.address.landmark].filter(Boolean).join(', ')}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3.5 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf4f4]">
                     <Wallet className="h-5 w-5 text-[#156253]" aria-hidden />
                  </div>
                  <p className="text-[13px] pt-0.5"><span className="font-bold text-ink text-[15px] block mb-0.5">Payment</span><span className="font-medium text-ink-muted">{PAYMENT_LABEL}</span></p>
                </div>
                <div className="flex items-start gap-3.5 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-200">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf4f4]">
                     <ShieldCheck className="h-5 w-5 text-[#156253]" aria-hidden />
                  </div>
                  <p className="text-[13px] pt-0.5">
                    <span className="font-bold text-ink text-[15px] block mb-0.5">{settings.deliveryCharge === 0 ? 'FREE Delivery' : `Delivery ${formatRupees(settings.deliveryCharge)}`}</span>
                    <span className="font-medium text-ink-muted">Final amount confirmed after billing</span>
                  </p>
                </div>
              </div>

              {giftAvailable && (
                <label className={cn('flex cursor-pointer items-start gap-4 rounded-[28px] p-5 ring-1 transition-all duration-300', offerOptIn ? 'bg-[#fff5e6] ring-[#dfa442]/50 shadow-sm scale-[1.01]' : 'bg-white ring-gray-200')}>
                  <input type="checkbox" checked={offerOptIn} onChange={(event) => setOfferOptIn(event.target.checked)} className="mt-1 h-5 w-5 accent-[#dfa442] transition-transform active:scale-90" />
                  <span className="text-[13px]">
                    <span className="flex items-center gap-2 font-bold text-ink text-[16px] mb-1"><Gift className="h-5 w-5 text-[#dfa442]" aria-hidden /> Claim FREE {GIFT.shortName}</span>
                    <span className="block font-medium text-[#7a6441] leading-relaxed">
                      For first orders over {threshold} in medicines (after discounts). Final eligibility is confirmed upon billing.
                    </span>
                  </span>
                </label>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Conditionally Animated Sticky Bottom Actions */}
      <AnimatePresence>
         {showCTA && (
            <motion.div 
              initial={{ y: prefersReducedMotion ? 0 : 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: prefersReducedMotion ? 0 : 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(21,98,83,0.06)] border-t border-white/60 md:bg-white/90 md:border-gray-100"
            >
              <div className="mx-auto flex max-w-2xl gap-3 px-4 py-3 sm:px-6 sm:py-4">
                {step > 0 && (
                  <Button variant="secondary" size="lg" onClick={() => go((step - 1) as Step)} disabled={submitting} className="w-[60px] shrink-0 p-0 shadow-sm border-gray-200">
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                )}
                {step < 2 ? (
                  <Button size="lg" className="flex-1 text-[17px] shadow-[0_8px_24px_-8px_rgba(21,98,83,0.6)]" onClick={next}>
                    Continue <ArrowRight className="h-5 w-5 ml-1" aria-hidden />
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1 text-[17px] shadow-[0_8px_24px_-8px_rgba(21,98,83,0.6)]" onClick={placeOrder} loading={submitting}>
                    {submitting ? 'Placing order…' : 'Place Order'}
                  </Button>
                )}
              </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}