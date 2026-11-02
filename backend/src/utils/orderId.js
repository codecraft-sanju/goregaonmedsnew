// src/utils/orderId.js
import { Counter } from '../models/Counter.js';


const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';


export const ORDER_ID_PATTERN = new RegExp(`^GMED-[${CHARS}]{4,}$`);

function encodeBase31(num) {
  if (num === 0) return CHARS[0];
  let encoded = '';
  let n = num;
  while (n > 0) {
    encoded = CHARS[n % 31] + encoded;
    n = Math.floor(n / 31);
  }
 
  return encoded.padStart(4, CHARS[0]); 
}

export async function generateOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { id: 'global_order_id' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const uniqueCode = encodeBase31(counter.seq);
  return `GMED-${uniqueCode}`;
}