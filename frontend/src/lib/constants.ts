// constant.ts

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
    shortName: 'Apple Pharmacy',
    area: 'Aarey Road',
    address: 'Shop No. 9, Sheetal Krupa Building, Ground Floor, Aarey Road, Goregaon East, Mumbai',
    tone: 'apple',
    open24x7: false,
  },
  {
    name: 'Lotus Pharmacy',
    shortName: 'Lotus Pharmacy',
    area: 'Jay Prakash Nagar',
    address: "Shop No. 10, Shreyas Bhavan, Jay Prakash Nagar Road No. 1, Opp. Domino's Pizza, Goregaon East, Mumbai",
    tone: 'lotus',
    open24x7: false,
  },
  {
    name: 'Healthzone & Cosmetic',
    shortName: 'Healthzone',
    area: 'Aarey Road',
    address: 'Pednekar Chawl, Shop No. 3, Ground Floor, S.V. Aarey Road, Goregaon East, Mumbai',
    tone: 'health',
    open24x7: true,
  },
] as const;

export const TONE_STYLES: Record<(typeof BRANCHES)[number]['tone'], { art: string; sign: string }> = {
  apple: { art: 'bg-[#e8eede]', sign: 'bg-[#315242]' },
  lotus: { art: 'bg-[#ece8dc]', sign: 'bg-[#78674d]' },
  health: { art: 'bg-[#e1ebe7]', sign: 'bg-[#4e7271]' },
};

export const ORDER_ID_PATTERN = /^GMED-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;