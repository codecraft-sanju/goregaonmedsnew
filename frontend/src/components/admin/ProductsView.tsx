// src/components/admin/ProductsView.tsx
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
import { motion, AnimatePresence } from 'framer-motion';
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

// --- Button ---
type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonVariants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const buttonSizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
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
  success: 'text-brand-700',
  error: 'text-red-600',
  info: 'text-ink-muted',
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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-brand-100"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toastTones[toast.tone])} aria-hidden />
                <p className="flex-1 text-sm text-ink">{toast.message}</p>
                <button type="button" onClick={() => dismiss(toast.id)} className="text-ink-soft hover:text-ink" aria-label="Dismiss">
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProductsViewInner() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
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
    try {
      const res = await adminRequest<{ products: Product[] }>('/products');
      setProducts(res.products);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
      setProducts(products.filter(p => p._id !== id));
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
      // Compress the image before uploading
      const compressed = await compressPrescription(file);
      const url = await uploadPrescription(compressed, (progress) => {
        setUploadProgress(progress);
      });
      // Set the Cloudinary URL to formData
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.price) {
      toast.error('Name, category, and price are required.');
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      price: Number(formData.price),
    };

    try {
      if (editingId) {
        const res = await adminRequest<{ product: Product }>(`/products/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
        setProducts(products.map(p => p._id === editingId ? res.product : p));
        toast.success('Product updated successfully');
      } else {
        const res = await adminRequest<{ product: Product }>('/products', {
          method: 'POST',
          body: payload,
        });
        setProducts([res.product, ...products]);
        toast.success('Product added successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Products Inventory</h1>
          <p className="text-sm font-medium text-ink-muted mt-1">Manage cosmetics, OTC, and other cross-sell items.</p>
        </div>
        <Button onClick={openAddModal} icon={<Plus className="w-5 h-5" />} className="w-full sm:w-auto rounded-2xl h-12 shadow-sm">
          Add Product
        </Button>
      </div>

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-50 mb-6">
            <PackageSearch className="h-10 w-10 text-[#156253]" />
          </div>
          <h3 className="font-display text-xl font-bold text-ink">No products found</h3>
          <p className="mt-2 text-sm font-medium text-ink-muted max-w-sm">Add your first cosmetic or OTC product to display during checkout.</p>
          <Button onClick={openAddModal} className="mt-8 rounded-2xl h-12" variant="secondary">Add your first product</Button>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product._id} className="group flex flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
              <div className="relative h-44 bg-[#f8fbfb]">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover mix-blend-multiply" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute right-3 top-3 flex flex-col gap-1.5">
                  {!product.isActive && <span className="rounded-full bg-gray-900/90 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm backdrop-blur">HIDDEN</span>}
                  {!product.inStock && <span className="rounded-full bg-red-600/90 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm backdrop-blur">OUT OF STOCK</span>}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#156253]">{product.category}</span>
                <h3 className="mt-1 text-base font-bold text-ink line-clamp-1">{product.name}</h3>
                <p className="mt-1.5 text-sm font-medium text-ink-muted line-clamp-2 leading-relaxed">{product.description || 'No description provided.'}</p>
                <div className="mt-auto pt-5 flex items-center justify-between border-t border-gray-50">
                  <span className="font-display text-xl font-extrabold text-ink">{formatRupees(product.price)}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEditModal(product)} className="grid h-9 w-9 place-items-center rounded-xl bg-gray-50 text-gray-500 hover:bg-brand-50 hover:text-[#156253] transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(product._id)} className="grid h-9 w-9 place-items-center rounded-xl bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal - FIXED POSITIONING */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-lg flex flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 bg-white shrink-0">
                <h2 className="font-display text-xl font-bold text-ink">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Form Body */}
              <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                
                {/* Row 1 */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Product Name <span className="text-red-500">*</span></label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[15px] font-medium text-ink focus:border-[#156253] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#156253]/10 transition-all" placeholder="e.g. Nivea Face Wash" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Category <span className="text-red-500">*</span></label>
                    <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-[15px] font-medium text-ink focus:border-[#156253] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#156253]/10 transition-all" placeholder="e.g. Cosmetics" />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Price (₹) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                      <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-8 pr-4 text-[15px] font-bold text-ink focus:border-[#156253] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#156253]/10 transition-all" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:pt-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-5 w-5 rounded border-gray-300 text-[#156253] accent-[#156253] transition-transform active:scale-90" />
                      <span className="text-[15px] font-bold text-ink group-hover:text-[#156253] transition-colors">Active</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} className="h-5 w-5 rounded border-gray-300 text-[#156253] accent-[#156253] transition-transform active:scale-90" />
                      <span className="text-[15px] font-bold text-ink group-hover:text-[#156253] transition-colors">In Stock</span>
                    </label>
                  </div>
                </div>

                {/* Image Upload Area */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Product Image <span className="text-[10px] font-medium normal-case text-gray-400">(Optional)</span></label>
                  <div className="flex items-center gap-4">
                    
                    {/* Image Preview Box */}
                    <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 relative">
                      {formData.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover mix-blend-multiply" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-gray-300">
                          <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                        </div>
                      )}
                      
                      {/* Loading Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-[#156253] mb-1" />
                          <span className="text-[10px] font-bold text-[#156253]">{uploadProgress}%</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Inputs */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          value={formData.imageUrl} 
                          onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                          disabled={isUploading}
                          className="h-10 sm:h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 sm:px-4 text-[13px] sm:text-[15px] font-medium text-ink focus:border-[#156253] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#156253]/10 transition-all" 
                          placeholder="Paste URL here..." 
                        />
                        
                        {/* Hidden file input */}
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        
                        {/* Upload Button */}
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isUploading} 
                          className="h-10 sm:h-12 rounded-2xl px-3 sm:px-4 whitespace-nowrap bg-white border-gray-200"
                        >
                          <UploadCloud className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Upload</span>
                        </Button>
                      </div>
                      <p className="text-[10px] sm:text-xs font-medium text-gray-400">Upload directly from device or paste web URL.</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 pb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Description <span className="text-[10px] font-medium normal-case text-gray-400">(Optional)</span></label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-[15px] font-medium text-ink focus:border-[#156253] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#156253]/10 transition-all resize-none" placeholder="Short product description..." />
                </div>
              </form>

              {/* Footer Actions */}
              <div className="border-t border-gray-100 p-6 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-white shrink-0">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto h-12 rounded-2xl border-gray-200 bg-white">Cancel</Button>
                <Button type="submit" form="product-form" loading={saving} className="w-full sm:w-auto h-12 rounded-2xl shadow-md shadow-[#156253]/20">{editingId ? 'Save Changes' : 'Add Product'}</Button>
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
    <ToastProvider>
      <ProductsViewInner />
    </ToastProvider>
  );
}