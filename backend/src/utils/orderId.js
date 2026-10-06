//src/utils/orderId.js
import { randomInt } from 'node:crypto';

// Excludes look-alike characters (0/O, 1/I/L) so IDs are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 6;
export const ORDER_ID_PATTERN = new RegExp(`^GMED-[${ALPHABET}]{${ID_LENGTH}}$`);

export function generateOrderId() {
  let suffix = '';
  for (let i = 0; i < ID_LENGTH; i += 1) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `GMED-${suffix}`;
}
