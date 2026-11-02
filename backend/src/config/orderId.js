// src/utils/orderId.js
import { Counter } from '../models/Counter.js'; 

// Convert a number to an alphanumeric string (Base-31, ignoring confusing chars like O, 0, I, 1)
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

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