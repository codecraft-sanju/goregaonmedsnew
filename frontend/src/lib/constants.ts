export const SUPPORT_PHONE_DISPLAY = '+91 84338 18771';
export const SUPPORT_PHONE_TEL = 'tel:+918433818771';
export const SERVICE_AREA = 'Goregaon East, Mumbai';
export const PAYMENT_LABEL = 'Pay when it arrives · Cash or UPI / QR at delivery';

export const GIFT = {
  name: 'Dr. Morepen GlucoOne BG-03',
  shortName: 'GlucoOne BG-03',
  mrp: 650,
} as const;

export const DEFAULT_PUBLIC_SETTINGS = {
  deliveryCharge: 0,
  firstOrderOfferEnabled: true,
  firstOrderMinimumMedicineAmount: 500,
} as const;

export const BRANCHES = [
  {
    name: 'Apple Pharmacy',
    address: 'Shop No. 9, Sheetal Krupa Building, Ground Floor, Aarey Road, Goregaon East, Mumbai',
    open24x7: false,
  },
  {
    name: 'Lotus Pharmacy',
    address: "Shop No. 10, Shreyas Bhavan, Jay Prakash Nagar Road No. 1, Opp. Domino's Pizza, Goregaon East, Mumbai",
    open24x7: false,
  },
  {
    name: 'Healthzone & Cosmetic',
    address: 'Pednekar Chawl, Shop No. 3, Ground Floor, S.V. Aarey Road, Goregaon East, Mumbai',
    open24x7: true,
  },
] as const;

export const ORDER_ID_PATTERN = /^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
