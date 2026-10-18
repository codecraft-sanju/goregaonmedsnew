'use client';

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
  EyeOff,
  Search,
  ChevronDown,
  Eye,
  Package,
  PackageX
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
export interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatRupees = (amount: number) => rupees.format(amount);

// ============================================================================
// API CLIENT
// ============================================================================
export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = 'Could not reach GoregaonMeds. Check your connection and try again.';

export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(NETWORK_MESSAGE, 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.',
      response.status,
      typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      Array.isArray(error?.fields) ? error.fields : [],
    );
  }
  return data as T;
}

export async function adminRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  try {
    return await apiRequest<T>(`/admin${path}`, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/admin/login?next=${next}`);
    }
    throw error;
  }
}

// ============================================================================
// IMAGE COMPRESSION & UPLOAD
// ============================================================================
const TARGET_BYTES = 1.2 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const MIN_DIMENSION = 1600;
const QUALITY_STEPS = [0.9, 0.82, 0.75, 0.68];
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_UNCOMPRESSED_UPLOAD_BYTES = 10 * 1024 * 1024;

export class ImageCompressionError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageCompressionError('Could not process image'))), 'image/jpeg', quality);
  });
}

function render(source: ImageBitmap | HTMLImageElement, longestSide: number) {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, longestSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new ImageCompressionError('Your browser could not process this image');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, longestSide: Math.max(canvas.width, canvas.height) };
}

export async function compressPrescription(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageCompressionError('Please choose a photo (JPG, PNG, WEBP or HEIC).');
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageCompressionError('This photo is larger than 25 MB. Please choose a smaller one.');

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    if (file.size <= MAX_UNCOMPRESSED_UPLOAD_BYTES) return file;
    throw new ImageCompressionError('This photo format is not supported here. Please take a screenshot or choose a JPG.');
  }

  try {
    const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (file.size <= TARGET_BYTES && Math.max(width, height) <= MAX_DIMENSION && /^image\/(jpeg|png|webp)$/.test(file.type)) {
      return file;
    }

    let longestSide = Math.min(MAX_DIMENSION, Math.max(width, height));
    let best: Blob | null = null;
    while (true) {
      const rendered = render(source, longestSide);
      for (const quality of QUALITY_STEPS) {
        best = await toBlob(rendered.canvas, quality);
        if (best.size <= TARGET_BYTES) break;
      }
      if (!best || best.size <= TARGET_BYTES || rendered.longestSide <= MIN_DIMENSION) break;
      longestSide = Math.max(MIN_DIMENSION, Math.round(rendered.longestSide * 0.85));
    }

    const name = file.name.replace(/\.[^.]+$/, '') || 'product-image';
    return new File([best!], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    if ('close' in source) source.close();
  }
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  uploadUrl: string;
}

export class UploadError extends Error {}

export async function uploadPrescription(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<string> {
  const { upload } = await apiRequest<{ upload: UploadSignature }>('/uploads/signature', { signal });
  if (!upload.uploadUrl.startsWith('https://api.cloudinary.com/')) throw new UploadError('Upload could not be authorised.');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', upload.apiKey);
  form.append('timestamp', String(upload.timestamp));
  form.append('signature', upload.signature);
  form.append('folder', upload.folder);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', upload.uploadUrl);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const url = xhr.response?.secure_url;
      if (xhr.status >= 200 && xhr.status < 300 && typeof url === 'string' && url.startsWith('https://res.cloudinary.com/')) {
        onProgress(100);
        resolve(url);
      } else {
        reject(new UploadError('Upload failed. Please try again.'));
      }
    };
    xhr.onerror = () => reject(new UploadError('Upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative overflow-hidden bg-[#156253]/5', className)}>
      <style>{`@keyframes gmedShimmer { to { transform: translateX(100%); } }`}</style>
      <div className="absolute inset-0 -translate-x-full animate-[gmedShimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// --- Button ---
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonVariants: Record<Variant, string> = {
  primary: 'bg-[#156253] text-white hover:bg-[#0F1F1C] shadow-[0_2px_8px_rgba(21,98,83,0.25)] disabled:opacity-50 disabled:hover:bg-[#156253]',
  secondary: 'bg-[#FFFFFF] text-[#0F1F1C] ring-1 ring-inset ring-[#156253]/10 hover:bg-[#F6FAF8] hover:ring-[#156253]/20 disabled:opacity-50',
  ghost: 'text-[#156253] hover:bg-[#156253]/10 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50',
};

const buttonSizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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
        'inline-flex select-none items-center justify-center font-semibold transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden /> : icon}
      {children}
    </button>
  );
});

// --- Toast ---
type ToastTone = 'success' | 'error' | 'info';

interface ToastData {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const toastTones = {
  success: 'text-[#156253]',
  error: 'text-red-600',
  info: 'text-[#0F1F1C]/70',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[999] md:bottom-6 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-3.5 shadow-xl ring-1 ring-[#156253]/10 backdrop-blur-md"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toastTones[toast.tone])} aria-hidden />
                <p className="flex-1 text-[14px] font-medium text-[#0F1F1C]">{toast.message}</p>
                <button type="button" onClick={() => dismiss(toast.id)} className="text-[#60756D] hover:text-[#0F1F1C] transition-colors" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

// --- Toggle Switch ---
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (c: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-[#F6FAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]"
    >
      <div className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ease-in-out", checked ? "bg-[#156253]" : "bg-[#0F1F1C]/20")}>
        <motion.div
          layout
          className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        />
      </div>
      <span className={cn("text-[14px] font-semibold transition-colors duration-200", checked ? "text-[#0F1F1C]" : "text-[#52675F]")}>{label}</span>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProductsViewInner() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const visibleProducts = products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const [loading, setLoading] = useState(true);
  
  // Extract Unique Categories for the Dropdown Combobox
  const existingCategories = useMemo(() => {
    const categoriesSet = new Set(products.map(p => p.category));
    return Array.from(categoriesSet).sort();
  }, [products]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Combobox State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    imageUrl: '',
    isActive: true,
    inStock: true,
  });

  const fetchProducts = async () => {
    setLoading(true); setLoadError(null);
    try {
      const res = await adminRequest<{ products: Product[] }>('/products');
      setProducts(res.products);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => modalRef.current?.querySelector<HTMLInputElement>('input')?.focus(), 50);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; previous?.focus(); };
  }, [isModalOpen]);

  const closeModal = () => { if (!saving && !isUploading) setIsModalOpen(false); };
  const handleModalKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); closeModal(); }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')).filter(node => node.getClientRects().length > 0);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', description: '', price: '', imageUrl: '', isActive: true, inStock: true });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: String(product.price),
      imageUrl: product.imageUrl || '',
      isActive: product.isActive,
      inStock: product.inStock,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminRequest(`/products/${id}`, { method: 'DELETE' });
      setProducts(current => current.filter(p => p._id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const compressed = await compressPrescription(file);
      const url = await uploadPrescription(compressed, (progress) => {
        setUploadProgress(progress);
      });
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isUploading) return;
    
    const finalCategory = formData.category.trim();
    const finalName = formData.name.trim();
    
    if (!finalName || !finalCategory || !formData.price) {
      toast.error('Name, category, and price are required.');
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      name: finalName,
      category: finalCategory,
      price: Number(formData.price),
    };

    try {
      if (editingId) {
        const res = await adminRequest<{ product: Product }>(`/products/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
        setProducts(current => current.map(p => p._id === editingId ? res.product : p));
        toast.success('Product updated successfully');
      } else {
        const res = await adminRequest<{ product: Product }>('/products', {
          method: 'POST',
          body: payload,
        });
        setProducts(current => [res.product, ...current]);
        toast.success('Product added successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* PAGE HEADER */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end justify-between border-b border-[#156253]/10 pb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold text-[#0F1F1C] tracking-tight">Products</h1>
          <p className="mt-1 text-[14px] text-[#52675F]">Manage your product catalog, visibility, and stock levels.</p>
        </div>
        
        {/* Actions & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          {/* SEARCH BAR */}
          <div className="relative w-full max-w-[340px] group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-[18px] w-[18px] text-[#60756D] transition-colors group-focus-within:text-[#156253]" aria-hidden />
            </div>
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <input
              id="product-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or category..."
              className="h-[42px] w-full rounded-xl border-none bg-[#FFFFFF] pl-10 pr-10 text-[14px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/15 transition-all placeholder:text-[#0F1F1C]/30 hover:bg-[#F6FAF8] focus:bg-[#FFFFFF] focus:outline-none focus:ring-4 focus:ring-[#156253]/10"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-1.5 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-[#60756D] hover:bg-[#0F1F1C]/5 hover:text-[#0F1F1C]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <Button onClick={openAddModal} icon={<Plus className="h-[18px] w-[18px]" />} size="md" className="w-full shadow-[0_2px_12px_rgba(21,98,83,0.2)] sm:w-auto shrink-0">
            Add Product
          </Button>
        </div>
      </header>

      {/* QUICK STATS */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Total Products', products.length], 
          ['Visible on store', products.filter(p => p.isActive).length], 
          ['Out of stock', products.filter(p => !p.inStock).length]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#156253]/10 bg-white px-4 py-3">
            <p className="text-xs text-[#60756D]">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0F1F1C]">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>
      
      {/* MAIN CONTENT AREA */}
      <div className="min-h-[400px]" aria-busy={loading}>
        {loading ? (
          <div aria-label="Loading products">
            <div className="space-y-3 hidden md:block">
              {Array.from({ length: 10 }, (_, i) => <Skeleton key={`desktop-skel-${i}`} className="h-[60px] rounded-xl" />)}
            </div>
            <div className="space-y-4 md:hidden">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={`mobile-skel-${i}`} className="h-[140px] rounded-2xl" />)}
            </div>
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="text-sm text-red-700">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => void fetchProducts()}>Retry</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#156253]/20 bg-[#FFFFFF]/50 py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F6FAF8] ring-1 ring-inset ring-[#156253]/10">
              <PackageSearch className="h-10 w-10 text-[#156253]/60" />
            </div>
            <h3 className="font-display text-[22px] font-bold text-[#0F1F1C]">No products found</h3>
            <p className="mt-2 text-[14px] font-medium text-[#52675F] max-w-sm">Start building your catalog to showcase items to your customers.</p>
            <Button onClick={openAddModal} className="mt-8 shadow-sm" variant="secondary" size="lg">Add your first product</Button>
          </div>
        ) : (
          <div className={cn("transition-opacity duration-300", loading ? "opacity-50 pointer-events-none" : "opacity-100")}>
            
            {/* DESKTOP DATA TABLE */}
            <div className="hidden overflow-hidden rounded-2xl bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10 md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#156253]/10 bg-[#F6FAF8] text-[11px] font-bold tracking-wide text-[#60756D]">
                    <tr>
                      <th scope="col" className="px-5 py-4 whitespace-nowrap w-24">Image</th>
                      <th scope="col" className="px-5 py-4 whitespace-nowrap">Product Details</th>
                      <th scope="col" className="px-5 py-4 whitespace-nowrap text-right">Price</th>
                      <th scope="col" className="px-5 py-4 whitespace-nowrap text-center">Status</th>
                      <th scope="col" className="px-5 py-4 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody layout className="divide-y divide-[#156253]/5">
                    <AnimatePresence>
                      {visibleProducts.map((product) => (
                        <motion.tr 
                          key={product._id} 
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, backgroundColor: '#fef2f2' }}
                          transition={{ duration: 0.2 }}
                          className="transition-colors hover:bg-[#F6FAF8] group"
                        >
                          {/* Image Cell */}
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[#F8FBFB] ring-1 ring-[#156253]/10">
                              {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover mix-blend-multiply" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#156253]/20">
                                  <ImageIcon className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Details Cell */}
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#156253] mb-0.5">
                                {product.category}
                              </span>
                              <span className="font-bold text-[#0F1F1C] text-[14px]">
                                {product.name}
                              </span>
                              {product.description && (
                                <span className="text-[12px] text-[#60756D] line-clamp-1 max-w-sm mt-0.5">
                                  {product.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Price Cell */}
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <span className="font-display font-bold text-[15px] text-[#0F1F1C]">
                              {formatRupees(product.price)}
                            </span>
                          </td>

                          {/* Status Cell */}
                          <td className="px-5 py-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1.5">
                              {product.isActive ? (
                                <span className="inline-flex items-center rounded-full bg-[#D8F3E8]/60 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#156253]">
                                  <Eye className="w-3 h-3 mr-1" /> Visible
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-[#0F1F1C]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#0F1F1C]/70">
                                  <EyeOff className="w-3 h-3 mr-1" /> Hidden
                                </span>
                              )}

                              {product.inStock ? (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200">
                                  <Package className="w-3 h-3 mr-1" /> In Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-700 ring-1 ring-inset ring-red-200">
                                  <PackageX className="w-3 h-3 mr-1" /> Out of Stock
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions Cell */}
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button 
                                onClick={() => openEditModal(product)} 
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#60756D] hover:bg-[#F6FAF8] hover:text-[#156253] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156253]"
                                aria-label="Edit Product"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(product._id)} 
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#60756D] hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                                aria-label="Delete Product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>
            </div>

            {/* MOBILE COMPACT LIST */}
            <ul className="flex flex-col gap-3 md:hidden">
              <AnimatePresence>
                {visibleProducts.map((product) => (
                  <motion.li 
                    key={product._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden rounded-2xl bg-[#FFFFFF] p-4 shadow-sm ring-1 ring-inset ring-[#156253]/10"
                  >
                    <div className="flex gap-4">
                      {/* Mobile Image */}
                      <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-[12px] bg-[#F8FBFB] ring-1 ring-[#156253]/10">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover mix-blend-multiply" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#156253]/20">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      
                      {/* Mobile Info */}
                      <div className="flex flex-1 flex-col justify-center min-w-0">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#156253] mb-0.5 line-clamp-1">
                          {product.category}
                        </span>
                        <h3 className="text-[14px] font-bold text-[#0F1F1C] line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        <span className="font-display font-bold text-[16px] text-[#0F1F1C] mt-2">
                          {formatRupees(product.price)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Badges & Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-[#156253]/5 pt-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!product.isActive && (
                          <span className="inline-flex items-center rounded-md bg-[#0F1F1C]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0F1F1C]/70">
                            Hidden
                          </span>
                        )}
                        {!product.inStock && (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-200">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditModal(product)} 
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6FAF8] text-[#52675F] hover:bg-[#D8F3E8]/50 hover:text-[#156253]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product._id)} 
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6FAF8] text-[#52675F] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

          </div>
        )}
      </div>

      {/* Add / Edit Modal - iOS/Native Style */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-[#0F1F1C]/30 backdrop-blur-[2px]" 
              onClick={closeModal} 
            />
            
            {/* Modal Sheet */}
            <motion.div
              ref={modalRef}
              onKeyDown={handleModalKeys}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              initial={{ opacity: 0, y: '100%', scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: '100%', scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-[#FFFFFF] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#156253]/10 bg-[#FFFFFF] px-6 py-5">
                <h2 id="modal-title" className="font-display text-[22px] font-bold text-[#0F1F1C]">{editingId ? 'Edit Product' : 'New Product'}</h2>
                <button 
                  onClick={closeModal} 
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6FAF8] text-[#60756D] transition-colors hover:bg-[#156253]/10 hover:text-[#156253] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Form Body */}
              <form aria-busy={saving || isUploading} id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain bg-[#FFFFFF] p-6">
                <div className="space-y-6">
                  {/* Row 1 */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold tracking-wide text-[#52675F]">Product Name <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        aria-label="Product name" value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="h-12 w-full rounded-xl bg-[#F6FAF8] px-4 text-[15px] font-semibold text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all placeholder:text-[#0F1F1C]/30 hover:ring-[#156253]/20 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#156253]" 
                        placeholder="e.g. Nivea Face Wash" 
                      />
                    </div>
                    
                    {/* COMBOBOX CATEGORY INPUT */}
                    <div className="space-y-2 relative">
                      <label className="block text-[13px] font-bold tracking-wide text-[#52675F]">Category <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input 
                          required 
                          aria-label="Category" 
                          value={formData.category} 
                          onChange={e => {
                            setFormData({...formData, category: e.target.value});
                            setIsCategoryDropdownOpen(true);
                          }}
                          onFocus={() => setIsCategoryDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                          className="h-12 w-full rounded-xl bg-[#F6FAF8] pl-4 pr-10 text-[15px] font-semibold text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all placeholder:text-[#0F1F1C]/30 hover:ring-[#156253]/20 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#156253]" 
                          placeholder="e.g. Cosmetics" 
                        />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#60756D] pointer-events-none" />
                        
                        <AnimatePresence>
                          {isCategoryDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-[110] mt-2 w-full max-h-48 overflow-y-auto rounded-xl bg-white shadow-[0_12px_30px_rgba(15,31,28,0.15)] ring-1 ring-[#156253]/15"
                            >
                              <div className="p-1">
                                {existingCategories
                                  .filter(c => c.toLowerCase().includes(formData.category.toLowerCase()))
                                  .map(cat => (
                                    <div 
                                      key={cat} 
                                      onClick={() => setFormData({...formData, category: cat})} 
                                      className="cursor-pointer px-4 py-2.5 rounded-lg text-[14px] font-semibold text-[#0F1F1C] hover:bg-[#F6FAF8] hover:text-[#156253] transition-colors"
                                    >
                                      {cat}
                                    </div>
                                ))}
                                
                                {/* CREATE NEW OPTION */}
                                {!existingCategories.some(c => c.toLowerCase() === formData.category.trim().toLowerCase()) && formData.category.trim() && (
                                  <div 
                                    onClick={() => setFormData({...formData, category: formData.category.trim()})}
                                    className="cursor-pointer mt-1 border-t border-[#156253]/10 pt-1 px-4 py-2.5 rounded-lg text-[14px] font-bold text-[#156253] hover:bg-[#F6FAF8] transition-colors flex items-center gap-2"
                                  >
                              <Plus className="w-4 h-4 shrink-0" /> Create &quot;{formData.category.trim()}&quot;
                                  </div>
                                )}
                                
                                {/* EMPTY STATE */}
                                {existingCategories.length === 0 && !formData.category.trim() && (
                                  <div className="px-4 py-3 text-xs text-[#60756D] text-center">
                                    Type to create your first category
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold tracking-wide text-[#52675F]">Price (₹) <span className="text-red-500">*</span></label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-[15px] font-semibold text-[#60756D]">₹</span>
                        <input 
                          required 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          aria-label="Price in rupees" value={formData.price} 
                          onChange={e => setFormData({...formData, price: e.target.value})} 
                          className="h-12 w-full rounded-xl bg-[#F6FAF8] pl-8 pr-4 text-[15px] font-bold text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all placeholder:text-[#0F1F1C]/30 hover:ring-[#156253]/20 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#156253]" 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    
                    {/* Status Switches */}
                    <div className="flex flex-col justify-center gap-4 sm:pt-6">
                      <ToggleSwitch checked={formData.isActive} onChange={c => setFormData({...formData, isActive: c})} label="Visible on Store" />
                      <ToggleSwitch checked={formData.inStock} onChange={c => setFormData({...formData, inStock: c})} label="In Stock" />
                    </div>
                  </div>

                  {/* Image Upload Area */}
                  <div className="space-y-2">
                    <label className="flex items-baseline gap-2 text-[13px] font-bold tracking-wide text-[#52675F]">
                      Product Image <span className="text-[11px] font-medium normal-case text-[#60756D]">(Optional)</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl bg-[#F6FAF8] p-4 ring-1 ring-inset ring-[#156253]/10">
                      
                      {/* Image Preview Box */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] bg-[#FFFFFF] shadow-sm ring-1 ring-inset ring-[#156253]/10">
                        {formData.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#156253]/20">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        
                        {/* Loading Overlay */}
                        <AnimatePresence>
                          {isUploading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFFFF]/90 backdrop-blur-[2px]">
                              <Loader2 className="mb-1 h-5 w-5 animate-spin text-[#156253]" />
                              <span className="text-[11px] font-bold text-[#156253]">{uploadProgress}%</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Inputs */}
                      <div className="flex w-full flex-col gap-3 sm:flex-1">
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            aria-label="Product image URL" value={formData.imageUrl} 
                            onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                            disabled={isUploading}
                            className="h-10 w-full rounded-xl bg-[#FFFFFF] px-3.5 text-[14px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all placeholder:text-[#0F1F1C]/30 hover:ring-[#156253]/20 focus:outline-none focus:ring-2 focus:ring-[#156253]" 
                            placeholder="Paste image URL..." 
                          />
                          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isUploading} 
                            aria-label="Upload product image" className="h-10 shrink-0 rounded-xl px-4"
                          >
                            <UploadCloud className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Upload</span>
                          </Button>
                        </div>
                        <p className="text-[12px] font-medium text-[#60756D]">Upload a JPG, PNG, WEBP (Max 25MB) or paste a web URL.</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="flex items-baseline gap-2 text-[13px] font-bold tracking-wide text-[#52675F]">
                      Description <span className="text-[11px] font-medium normal-case text-[#60756D]">(Optional)</span>
                    </label>
                    <textarea 
                      rows={3} 
                      aria-label="Description" value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      className="w-full resize-none rounded-xl bg-[#F6FAF8] p-4 text-[15px] font-medium text-[#0F1F1C] shadow-sm ring-1 ring-inset ring-[#156253]/10 transition-all placeholder:text-[#0F1F1C]/30 hover:ring-[#156253]/20 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#156253]" 
                      placeholder="Enter a brief product description..." 
                    />
                  </div>
                </div>
              </form>

              {/* Sticky Footer */}
              <div className="shrink-0 border-t border-[#156253]/10 bg-[#FFFFFF] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                  <Button variant="secondary" size="lg" onClick={closeModal} className="w-full sm:w-auto">Cancel</Button>
                  <Button type="submit" form="product-form" size="lg" loading={saving} disabled={isUploading} className="w-full sm:w-auto shadow-[0_2px_12px_rgba(21,98,83,0.25)]">
                    {editingId ? 'Save Changes' : 'Add Product'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProductsView() {
  return (
    <MotionConfig reducedMotion="user"><ToastProvider>
      <ProductsViewInner />
    </ToastProvider></MotionConfig>
  );
}