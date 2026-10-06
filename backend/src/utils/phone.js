//src/utils/phone.js
/**
 * Normalizes an Indian mobile number to its 10-digit form (e.g. "+91 84338-18771" -> "8433818771").
 * Returns null when the input is not a valid Indian mobile number.
 */
export function normalizeIndianMobile(input) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function formatIndianMobile(mobileNumber) {
  return `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`;
}
