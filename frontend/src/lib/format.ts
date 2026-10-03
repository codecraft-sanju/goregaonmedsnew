const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export const formatRupees = (amount: number) => rupees.format(amount);
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// Safe formatMobile with null/undefined check
export const formatMobile = (mobile?: string | null) => {
  if (!mobile || typeof mobile !== 'string') return 'N/A';
  return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
};

/** Mirrors the backend normalization for instant feedback; the backend re-validates. */
export function normalizeMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Inserts a Cloudinary transformation for lightweight previews. */
export function cloudinaryThumb(url: string, width = 640) {
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
}

export function isLateNightInMumbai(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(date));
  return hour >= 22 || hour < 6;
}