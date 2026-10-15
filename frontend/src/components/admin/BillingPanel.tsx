// //src/components/admin/BillingPanel.tsx
// 'use client';

// import {
//   forwardRef,
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
//   type ButtonHTMLAttributes,
//   type ReactNode,
// } from 'react';
// import { createPortal } from 'react-dom';
// import { AnimatePresence, motion } from 'framer-motion';
// import {
//   CheckCircle2,
//   Gift,
//   PackageCheck,
//   Save,
//   XCircle,
//   Plus,
//   Trash2,
//   ShoppingBag,
//   Loader2,
//   AlertTriangle,
//   Info,
//   X,
// } from 'lucide-react';


// export type OrderType = 'manual_text' | 'prescription_image';
// export type OrderStatus = 'Pending' | 'Delivered' | 'Cancelled';

// export interface MedicineItem {
//   _id?: string;
//   name: string;
//   quantity: string;
//   price?: number;
//   isAvailable?: boolean;
// }

// export interface OrderProduct {
//   _id?: string;
//   productId?: string;
//   name: string;
//   price: number;
//   quantity: number;
// }

// export interface Address {
//   flat: string;
//   area: string;
//   landmark: string;
// }

// export interface OfferEvaluation {
//   eligible: boolean;
//   checks: {
//     offerEnabled: boolean;
//     firstOrder: boolean;
//     meetsMedicineThreshold: boolean;
//     giftNotPreviouslyClaimed: boolean;
//   };
//   requiredMedicineAmount: number;
//   eligibleMedicineSubtotal: number;
// }

// export interface CustomerSummary {
//   fullName: string;
//   mobileNumber: string;
//   totalOrders: number;
//   deliveredOrders: number;
//   offerClaimed: boolean;
//   offerClaimedOrderId: string | null;
//   isFirstTimeCustomer?: boolean;
// }

// export interface AdminOrder {
//   id: string;
//   orderId: string;
//   customerName: string;
//   mobileNumber: string;
//   orderType: OrderType;
//   medicines: MedicineItem[];
//   products?: OrderProduct[]; 
//   prescriptionUrl: string | null;
//   address: Address;
//   paymentMethod: string;
//   medicineSubtotal: number;
//   nonMedicineSubtotal: number;
//   deliveryCharge: number;
//   discount?: number;
//   finalAmount: number;
//   billedAt: string | null;
//   offerOptIn: boolean;
//   firstOrderAtCreation: boolean;
//   previousOrders: number;
//   offerEligible: boolean;
//   offerApplied: boolean;
//   offer: OfferEvaluation;
//   status: OrderStatus;
//   telegramNotificationSent: boolean;
//   createdAt: string;
//   deliveredAt: string | null;
//   customer: CustomerSummary | null;
//   cancelReason: string | null;
// }

// // ==========================================
// // CONSTANTS & UTILS
// // ==========================================
// export const GIFT = {
//   name: 'Dr. Morepen GlucoOne BG-03',
//   shortName: 'GlucoOne BG-03',
//   mrp: 650,
//   image: '/glucoone-bg03.png',
// } as const;

// export function cn(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(' ');
// }

// const rupees = new Intl.NumberFormat('en-IN', {
//   style: 'currency',
//   currency: 'INR',
//   maximumFractionDigits: 2,
//   minimumFractionDigits: 0,
// });
// export const formatRupees = (amount: number) => rupees.format(amount);

// // ==========================================
// // API CLIENT
// // ==========================================
// export interface FieldIssue {
//   path: string;
//   message: string;
// }

// export class ApiError extends Error {
//   constructor(
//     message: string,
//     readonly status: number,
//     readonly code: string,
//     readonly fields: FieldIssue[] = [],
//   ) {
//     super(message);
//     this.name = 'ApiError';
//   }
// }

// interface RequestOptions {
//   method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
//   body?: unknown;
//   signal?: AbortSignal;
// }

// const NETWORK_MESSAGE = 'Could not reach GoregaonMeds. Check your connection and try again.';

// export async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
//   let response: Response;
//   try {
//     response = await fetch(`/api${path}`, {
//       method,
//       signal,
//       credentials: 'same-origin',
//       cache: 'no-store',
//       headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
//       body: body === undefined ? undefined : JSON.stringify(body),
//     });
//   } catch (error) {
//     if ((error as Error).name === 'AbortError') throw error;
//     throw new ApiError(NETWORK_MESSAGE, 0, 'NETWORK_ERROR');
//   }

//   const data = await response.json().catch(() => null);
//   if (!response.ok) {
//     const error = data?.error;
//     throw new ApiError(
//       typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.',
//       response.status,
//       typeof error?.code === 'string' ? error.code : 'UNKNOWN',
//       Array.isArray(error?.fields) ? error.fields : [],
//     );
//   }
//   return data as T;
// }

// type AdminOptions = Parameters<typeof apiRequest>[1];

// export async function adminRequest<T>(path: string, options?: AdminOptions): Promise<T> {
//   try {
//     return await apiRequest<T>(`/admin${path}`, options);
//   } catch (error) {
//     if (error instanceof ApiError && error.status === 401 && typeof window !== 'undefined') {
//       const next = encodeURIComponent(window.location.pathname + window.location.search);
//       window.location.assign(`/admin/login?next=${next}`);
//     }
//     throw error;
//   }
// }

// // ==========================================
// // UI COMPONENTS (Button, Toast)
// // ==========================================
// type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
// type Size = 'sm' | 'md' | 'lg';

// const variants: Record<Variant, string> = {
//   primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
//   secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
//   ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
//   gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
//   danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
// };

// const sizes: Record<Size, string> = {
//   sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
//   md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
//   lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
// };

// export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
//   variant?: Variant;
//   size?: Size;
//   loading?: boolean;
//   icon?: ReactNode;
// }

// export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
//   { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
//   ref,
// ) {
//   return (
//     <button
//       ref={ref}
//       type={type}
//       disabled={disabled || loading}
//       aria-busy={loading || undefined}
//       className={cn(
//         'inline-flex select-none items-center justify-center font-semibold transition-[background-color,transform,box-shadow] duration-150',
//         'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
//         'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
//         variants[variant],
//         sizes[size],
//         className,
//       )}
//       {...props}
//     >
//       {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
//       {children}
//     </button>
//   );
// });

// type ToastTone = 'success' | 'error' | 'info';

// interface Toast {
//   id: number;
//   tone: ToastTone;
//   message: string;
// }

// interface ToastApi {
//   success: (message: string) => void;
//   error: (message: string) => void;
//   info: (message: string) => void;
// }

// const ToastContext = createContext<ToastApi | null>(null);

// const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
// const tones = {
//   success: 'text-brand-700',
//   error: 'text-red-600',
//   info: 'text-ink-muted',
// };

// export function ToastProvider({ children }: { children: ReactNode }) {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const nextId = useRef(0);

//   const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

//   const push = useCallback(
//     (tone: ToastTone, message: string) => {
//       const id = ++nextId.current;
//       setToasts((current) => [...current.slice(-2), { id, tone, message }]);
//       setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
//     },
//     [dismiss],
//   );

//   const api = useMemo<ToastApi>(
//     () => ({
//       success: (message) => push('success', message),
//       error: (message) => push('error', message),
//       info: (message) => push('info', message),
//     }),
//     [push],
//   );

//   return (
//     <ToastContext.Provider value={api}>
//       {children}
//       <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
//         <AnimatePresence initial={false}>
//           {toasts.map((toast) => {
//             const Icon = icons[toast.tone];
//             return (
//               <motion.div
//                 key={toast.id}
//                 layout
//                 initial={{ opacity: 0, y: 16, scale: 0.96 }}
//                 animate={{ opacity: 1, y: 0, scale: 1 }}
//                 exit={{ opacity: 0, y: 8, scale: 0.96 }}
//                 transition={{ type: 'spring', stiffness: 420, damping: 32 }}
//                 role={toast.tone === 'error' ? 'alert' : 'status'}
//                 className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-brand-100"
//               >
//                 <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tones[toast.tone])} aria-hidden />
//                 <p className="flex-1 text-sm text-ink">{toast.message}</p>
//                 <button type="button" onClick={() => dismiss(toast.id)} className="text-ink-soft hover:text-ink" aria-label="Dismiss">
//                   <X className="h-4 w-4" />
//                 </button>
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </div>
//     </ToastContext.Provider>
//   );
// }

// export function useToast() {
//   const context = useContext(ToastContext);
//   if (!context) throw new Error('useToast must be used inside ToastProvider');
//   return context;
// }

// // ==========================================
// // BILLING PANEL COMPONENT
// // ==========================================
// const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

// const parseAmount = (value: string) => (AMOUNT_PATTERN.test(value.trim()) ? Number(value) : null);
// const toInput = (amount: number, billed: boolean) => (billed ? String(amount) : '');

// const CHECK_LABELS: Record<keyof AdminOrder['offer']['checks'], string> = {
//   offerEnabled: 'Offer enabled',
//   firstOrder: 'First order',
//   meetsMedicineThreshold: 'Medicine subtotal eligible',
//   giftNotPreviouslyClaimed: 'Gift not previously claimed',
// };

// interface Props {
//   order: AdminOrder;
//   deliveryCharge: number;
//   onUpdated: (order: AdminOrder) => void;
//   onDelivered: (order: AdminOrder) => void;
//   actionsTarget?: HTMLElement | null;
// }

// interface MedicineInput {
//   _id?: string;
//   name: string;
//   quantity: string;
//   price: string;
//   isAvailable: boolean;
// }

// interface ProductInput {
//   _id?: string;
//   productId?: string;
//   name: string;
//   quantity: string;
//   price: string;
// }

// export function BillingPanel({ order, deliveryCharge, onUpdated, onDelivered, actionsTarget }: Props) {
//   const toast = useToast();
//   const billed = Boolean(order.billedAt);
  
//   const [medicinesData, setMedicinesData] = useState<MedicineInput[]>(() => 
//     order.medicines.map((m) => ({
//       _id: m._id,
//       name: m.name,
//       quantity: m.quantity,
//       price: toInput(m.price ?? 0, billed),
//       isAvailable: m.isAvailable ?? true
//     }))
//   );

//   const [productsData, setProductsData] = useState<ProductInput[]>(() => 
//     (order.products || []).map((p) => ({
//       _id: p._id,
//       productId: p.productId,
//       name: p.name,
//       quantity: String(p.quantity ?? 1),
//       price: toInput(p.price ?? 0, billed),
//     }))
//   );

//   const [other, setOther] = useState(toInput(order.nonMedicineSubtotal, billed));
//   const [discount, setDiscount] = useState(toInput(order.discount ?? 0, billed));
//   const [giftIncluded, setGiftIncluded] = useState(order.offerApplied);
//   const [saving, setSaving] = useState(false);
//   const [confirmDelivery, setConfirmDelivery] = useState(false);
//   const [delivering, setDelivering] = useState(false);

//   const medicineValue = useMemo(() => {
//     return medicinesData.reduce((total, item) => {
//       if (item.isAvailable) {
//         const val = parseAmount(item.price);
//         return total + (val ?? 0);
//       }
//       return total;
//     }, 0);
//   }, [medicinesData]);

//   const productValue = useMemo(() => {
//     return productsData.reduce((total, item) => {
//       const val = parseAmount(item.price);
//       return total + (val ?? 0);
//     }, 0);
//   }, [productsData]);

//   const otherValue = other.trim() === '' ? 0 : parseAmount(other);
//   const discountValue = discount.trim() === '' ? 0 : parseAmount(discount);
  
//   const combinedNonMedicineSubtotal = (otherValue ?? 0) + productValue;
  
//   const medicinesValid = medicinesData.every(m => 
//     (!m.isAvailable || (m.price.trim() !== '' && parseAmount(m.price) !== null)) && 
//     m.name.trim() !== '' && 
//     m.quantity.trim() !== ''
//   );
  
//   const productsValid = productsData.every(p => 
//     p.price.trim() !== '' && parseAmount(p.price) !== null && 
//     p.name.trim() !== '' && 
//     p.quantity.trim() !== '' && parseInt(p.quantity) > 0
//   );

//   const valid = medicinesValid && productsValid && otherValue !== null && discountValue !== null;

//   const preview = useMemo(() => {
//     const checks = {
//       ...order.offer.checks,
//       meetsMedicineThreshold: medicineValue !== null && medicineValue >= order.offer.requiredMedicineAmount,
//     };
    
//     const gross = (medicineValue ?? 0) + combinedNonMedicineSubtotal + deliveryCharge;
//     const safeDiscount = (discountValue ?? 0) > gross ? gross : (discountValue ?? 0);
    
//     return {
//       checks,
//       eligible: Object.values(checks).every(Boolean),
//       finalAmount: valid ? Math.round((gross - safeDiscount) * 100) / 100 : null,
//       appliedDiscount: safeDiscount
//     };
//   }, [order.offer, medicineValue, combinedNonMedicineSubtotal, discountValue, valid, deliveryCharge]);

//   const dirty =
//     !billed ||
//     medicineValue !== order.medicineSubtotal ||
//     (otherValue ?? -1) !== order.nonMedicineSubtotal ||
//     (discountValue ?? -1) !== (order.discount ?? 0) ||
//     giftIncluded !== order.offerApplied ||
//     deliveryCharge !== order.deliveryCharge ||
//     medicinesData.length !== order.medicines.length ||
//     productsData.length !== (order.products?.length || 0) ||
//     medicinesData.some((m, i) => 
//       m.isAvailable !== (order.medicines[i]?.isAvailable ?? true) || 
//       m.name !== order.medicines[i]?.name ||
//       m.quantity !== order.medicines[i]?.quantity
//     ) ||
//     productsData.some((p, i) => 
//       p.name !== order.products?.[i]?.name ||
//       p.price !== String(order.products?.[i]?.price || '')
//     );

//   useEffect(() => {
//     if (!preview.eligible) setGiftIncluded(false);
//   }, [preview.eligible]);

//   const updateMedicine = <K extends keyof MedicineInput>(index: number, field: K, value: MedicineInput[K]) => {
//     setMedicinesData(prev => {
//       const copy = [...prev];
//       copy[index] = { ...copy[index], [field]: value } as MedicineInput;
//       return copy;
//     });
//   };

//   const updateProduct = <K extends keyof ProductInput>(index: number, field: K, value: ProductInput[K]) => {
//     setProductsData(prev => {
//       const copy = [...prev];
//       copy[index] = { ...copy[index], [field]: value } as ProductInput;
//       return copy;
//     });
//   };

//   const addMedicine = () => {
//     setMedicinesData(prev => [...prev, { name: '', quantity: '1', price: '', isAvailable: true }]);
//   };

//   const removeMedicine = (index: number) => {
//     setMedicinesData(prev => prev.filter((_, i) => i !== index));
//   };

//   const addProduct = () => {
//     setProductsData(prev => [...prev, { name: '', quantity: '1', price: '' }]);
//   };

//   const removeProduct = (index: number) => {
//     setProductsData(prev => prev.filter((_, i) => i !== index));
//   };

//   const saveBill = async () => {
//     if (!valid) {
//       toast.error('Enter valid amounts, names, and quantities for all items.');
//       return;
//     }
//     setSaving(true);
//     try {
//       const payload = {
//         medicines: medicinesData.map(m => ({
//           _id: m._id,
//           name: m.name.trim(), 
//           quantity: m.quantity.trim(),
//           price: parseAmount(m.price) ?? 0,
//           isAvailable: m.isAvailable
//         })),
//         products: productsData.map(p => ({
//           _id: p._id,
//           productId: p.productId,
//           name: p.name.trim(),
//           quantity: parseInt(p.quantity) || 1,
//           price: parseAmount(p.price) ?? 0,
//         })),
//         nonMedicineSubtotal: combinedNonMedicineSubtotal,
//         discount: discountValue,
//         offerApplied: giftIncluded
//       };

//       const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/billing`, {
//         method: 'PATCH',
//         body: payload,
//       });
//       onUpdated(res.order);
//       setGiftIncluded(res.order.offerApplied);
//       toast.success(res.order.offerEligible ? 'Bill saved · Eligible for the free gift' : 'Bill saved');
//     } catch (error) {
//       toast.error((error as Error).message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deliver = async () => {
//     setDelivering(true);
//     try {
//       const res = await adminRequest<{ order: AdminOrder }>(`/orders/${order.id}/deliver`, { method: 'PATCH' });
//       toast.success(`${order.orderId} marked as delivered`);
//       onDelivered(res.order);
//     } catch (error) {
//       toast.error((error as Error).message);
//       setDelivering(false);
//       setConfirmDelivery(false);
//     }
//   };

//   const status = billed && !dirty ? { eligible: order.offerEligible, checks: order.offer.checks, saved: true } : { ...preview, saved: false };

//   const actions = (
//     <div className="space-y-2">
//       <div className="grid gap-2 min-[400px]:grid-cols-2">
//         <Button variant="secondary" onClick={saveBill} loading={saving} disabled={!valid || delivering} icon={<Save className="h-4 w-4" />}>
//           Save Bill
//         </Button>
//         <AnimatePresence mode="wait" initial={false}>
//           {confirmDelivery ? (
//             <motion.div key="confirm" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
//               <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelivery(false)} disabled={delivering}>
//                 Back
//               </Button>
//               <Button className="flex-1" onClick={deliver} loading={delivering}>
//                 Confirm
//               </Button>
//             </motion.div>
//           ) : (
//             <motion.div key="deliver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//               <Button
//                 className="w-full"
//                 onClick={() => setConfirmDelivery(true)}
//                 disabled={!billed || dirty || saving}
//                 title={!billed || dirty ? 'Save the bill first' : undefined}
//                 icon={<PackageCheck className="h-4 w-4" />}
//               >
//                 Mark as Delivered
//               </Button>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//       {confirmDelivery && (
//         <p className="text-xs text-ink-muted">
//           Confirm payment was collected{order.offerApplied ? ` and the free ${GIFT.shortName} was handed over. The gift will be recorded as claimed.` : '.'}
//         </p>
//       )}
//       {(!billed || dirty) && !confirmDelivery && <p className="text-xs text-ink-soft">Save the bill before marking the order as delivered.</p>}
//     </div>
//   );

//   return (
//     <div className="space-y-4">
      
//       {/* MEDICINES SECTION */}
//       <div className="space-y-3">
//         <h4 className="text-xs font-semibold text-ink">Medicines ({medicinesData.length})</h4>
        
//         <AnimatePresence initial={false}>
//           {medicinesData.map((med, index) => (
//             <motion.div 
//               key={med._id || `new-med-${index}`} 
//               layout
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               className={cn("p-3 rounded-xl border transition-colors relative group", med.isAvailable ? "bg-white border-brand-100" : "bg-surface border-transparent opacity-80")}
//             >
//               {!med._id && (
//                 <button 
//                   onClick={() => removeMedicine(index)} 
//                   className="absolute -top-2.5 -right-2.5 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-transform scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 shadow-sm"
//                   title="Remove Medicine"
//                 >
//                   <Trash2 className="w-3.5 h-3.5" />
//                 </button>
//               )}

//               <div className="flex justify-between items-start gap-2">
//                 <div className="flex-1 min-w-0 space-y-1">
//                   <input
//                     value={med.name}
//                     onChange={(e) => updateMedicine(index, 'name', e.target.value)}
//                     placeholder="Medicine Name"
//                     className={cn(
//                       "w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50",
//                       !med.isAvailable && "line-through text-ink-muted"
//                     )}
//                   />
//                   <input
//                     value={med.quantity}
//                     onChange={(e) => updateMedicine(index, 'quantity', e.target.value)}
//                     placeholder="Quantity (e.g. 1 strip)"
//                     className="w-full bg-transparent text-xs text-ink-soft focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50"
//                   />
//                 </div>
//                 <label className="flex items-center gap-1.5 cursor-pointer shrink-0 mt-1">
//                   <input 
//                     type="checkbox" 
//                     className="w-4 h-4 accent-brand-600 rounded" 
//                     checked={med.isAvailable} 
//                     onChange={(e) => {
//                       updateMedicine(index, 'isAvailable', e.target.checked);
//                       if (!e.target.checked) updateMedicine(index, 'price', '0');
//                     }} 
//                   />
//                   <span className="text-xs font-medium text-ink-muted">In Stock</span>
//                 </label>
//               </div>
              
//               <AnimatePresence>
//                 {med.isAvailable && (
//                   <motion.div 
//                     initial={{ height: 0, opacity: 0 }} 
//                     animate={{ height: 'auto', opacity: 1 }} 
//                     exit={{ height: 0, opacity: 0 }} 
//                     className="mt-3 overflow-hidden"
//                   >
//                     <AmountInput 
//                       id={`price-${index}`} 
//                       label="" 
//                       hint="" 
//                       value={med.price} 
//                       onChange={(val) => updateMedicine(index, 'price', val)} 
//                     />
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </motion.div>
//           ))}
//         </AnimatePresence>

//         <Button 
//           variant="ghost" 
//           onClick={addMedicine} 
//           className="w-full border border-dashed border-brand-200 text-brand-700 bg-brand-50/30 hover:bg-brand-50 hover:border-brand-300 transition-colors" 
//           icon={<Plus className="w-4 h-4" />}
//         >
//           Add Medicine
//         </Button>
//       </div>

//       {/* NEW: PRODUCTS / COSMETICS SECTION */}
//       <div className="space-y-3 mt-6">
//         <h4 className="text-xs font-semibold text-ink">Other Products ({productsData.length})</h4>
        
//         <AnimatePresence initial={false}>
//           {productsData.map((prod, index) => (
//             <motion.div 
//               key={prod._id || `new-prod-${index}`} 
//               layout
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               className="p-3 rounded-xl border bg-white border-brand-100 transition-colors relative group"
//             >
//               <button 
//                 onClick={() => removeProduct(index)} 
//                 className="absolute -top-2.5 -right-2.5 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-transform scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 shadow-sm"
//                 title="Remove Product"
//               >
//                 <Trash2 className="w-3.5 h-3.5" />
//               </button>

//               <div className="flex justify-between items-start gap-2">
//                 <div className="flex-1 min-w-0 space-y-1">
//                   <input
//                     value={prod.name}
//                     onChange={(e) => updateProduct(index, 'name', e.target.value)}
//                     placeholder="Product Name"
//                     className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-ink-muted/50 transition-colors rounded px-1 -mx-1 focus:bg-brand-50/50"
//                   />
//                   <div className="flex items-center text-xs text-ink-soft mt-1">
//                     <span>Qty:</span>
//                     <input
//                       type="number"
//                       min="1"
//                       value={prod.quantity}
//                       onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
//                       className="ml-1 w-12 bg-transparent focus:outline-none focus:bg-brand-50/50 rounded px-1"
//                     />
//                   </div>
//                 </div>
//               </div>
              
//               <div className="mt-3">
//                 <AmountInput 
//                   id={`prod-price-${index}`} 
//                   label="" 
//                   hint="" 
//                   value={prod.price} 
//                   onChange={(val) => updateProduct(index, 'price', val)} 
//                 />
//               </div>
//             </motion.div>
//           ))}
//         </AnimatePresence>

//         <Button 
//           variant="ghost" 
//           onClick={addProduct} 
//           className="w-full border border-dashed border-brand-200 text-brand-700 bg-brand-50/30 hover:bg-brand-50 hover:border-brand-300 transition-colors" 
//           icon={<ShoppingBag className="w-4 h-4" />}
//         >
//           Add Product
//         </Button>
//       </div>

//       {/* OTHER CHARGES & DISCOUNTS */}
//       <div className="grid grid-cols-2 gap-3 pt-4 border-t border-brand-100 mt-6">
//         <AmountInput id={`${order.id}-other`} label="Misc Charges" hint="Extra non-product charges" value={other} onChange={setOther} />
//         <AmountInput id={`${order.id}-discount`} label="Discount" hint="Global order discount" value={discount} onChange={setDiscount} />
//       </div>

//       <dl className="space-y-2 rounded-xl bg-surface p-3.5 text-sm">
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Medicine subtotal</dt>
//           <dd className="font-medium tabular-nums">{medicineValue === null ? '—' : formatRupees(medicineValue)}</dd>
//         </div>
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Products & Other Items</dt>
//           <dd className="font-medium tabular-nums">{combinedNonMedicineSubtotal === null ? '—' : formatRupees(combinedNonMedicineSubtotal)}</dd>
//         </div>
//         <div className="flex justify-between gap-3">
//           <dt className="text-ink-muted">Delivery</dt>
//           <dd className="font-medium tabular-nums">{formatRupees(deliveryCharge)}</dd>
//         </div>
//         <div className="flex justify-between gap-3 text-brand-700">
//           <dt className="font-medium">Discount</dt>
//           <dd className="font-medium tabular-nums">-{preview.appliedDiscount === null ? '—' : formatRupees(preview.appliedDiscount)}</dd>
//         </div>
//         <div className="flex items-center justify-between gap-3 border-t border-brand-100 pt-3">
//           <dt className="text-sm font-semibold">Final Amount</dt>
//           <dd className="text-2xl font-bold tabular-nums text-brand-800">{preview.finalAmount === null ? '—' : formatRupees(preview.finalAmount)}</dd>
//         </div>
//       </dl>

//       <div className={cn('rounded-xl p-3.5 ring-1 transition-colors duration-300', status.eligible ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-brand-100')}>
//         <div className="flex items-start justify-between gap-2">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">First Order Gift Eligibility</p>
//             <p className="mt-0.5 text-sm font-semibold">{formatRupees(order.offer.requiredMedicineAmount)} Medicine Minimum</p>
//             <p className="mt-0.5 text-xs text-ink-soft">Medicine subtotal only. Delivery and other items never count.</p>
//           </div>
//           <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors', status.eligible ? 'bg-brand-700 text-white' : 'bg-red-50 text-red-700')}>
//             {status.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
//           </span>
//         </div>
//         <p className="mt-2 text-xs text-ink-soft">
//           Eligible medicine subtotal: <strong className="text-ink">{medicineValue === null ? '—' : formatRupees(medicineValue)}</strong>
//           {!status.saved && ' · preview, confirmed on save'}
//         </p>
//         <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
//           {(Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>).map((key) => (
//             <li key={key} className="flex items-center gap-1.5">
//               {status.checks[key] ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />}
//               <span className={status.checks[key] ? 'text-ink-muted' : 'text-ink'}>{CHECK_LABELS[key]}</span>
//             </li>
//           ))}
//         </ul>
//         <label
//           className={cn(
//             'mt-3 flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-brand-100 transition-opacity',
//             preview.eligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
//           )}
//         >
//           <input type="checkbox" className="h-5 w-5 accent-brand-700 rounded" checked={giftIncluded} disabled={!preview.eligible} onChange={(event) => setGiftIncluded(event.target.checked)} />
//           <Gift className="h-4 w-4 text-gift-500" aria-hidden /> FREE {GIFT.shortName} Included
//         </label>
//       </div>

//       {actionsTarget === undefined ? actions : actionsTarget ? createPortal(actions, actionsTarget) : null}
//     </div>
//   );
// }

// function AmountInput({ id, label, hint, value, onChange }: { id: string; label?: string; hint?: string; value: string; onChange: (value: string) => void }) {
//   const invalid = value.trim() !== '' && !AMOUNT_PATTERN.test(value.trim());
//   return (
//     <div>
//       {label && <label htmlFor={id} className="block text-xs font-semibold text-ink">{label}</label>}
//       <div className={cn('flex items-center rounded-xl bg-white ring-1 ring-inset focus-within:ring-2 transition-shadow', label && 'mt-1', invalid ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500')}>
//         <span className="pl-3 text-sm text-ink-muted">₹</span>
//         <input
//           id={id}
//           inputMode="decimal"
//           autoComplete="off"
//           value={value}
//           onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
//           placeholder="0"
//           aria-invalid={invalid || undefined}
//           className="h-11 w-full rounded-xl bg-transparent px-2 font-semibold tabular-nums focus:outline-none"
//         />
//       </div>
//       {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
//     </div>
//   );
// }