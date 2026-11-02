// src/services/checkoutPreferencesService.js
import { createHash } from 'node:crypto';
import { User } from '../models/User.js';

const MAX_ADDRESSES = 10; 
const MAX_PHONES = 5;     

function cleanText(text) {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

function addressKey(address) {
  const canonical = [
    address.flat,
    address.area,
    address.landmark || ''
  ]
    .map(value => cleanText(value).toLowerCase())
    .join('\u001f'); // Use a non-printable separator

  return createHash('sha256')
    .update(canonical)
    .digest('hex');
}


export async function rememberCheckoutDetails(userId, { address, mobileNumber }, session) {
  const normalizedAddress = {
    flat: cleanText(address.flat),
    area: cleanText(address.area),
    landmark: cleanText(address.landmark || '')
  };

  const key = addressKey(normalizedAddress);
  await User.updateOne(
    {
      _id: userId,
      'savedAddresses.key': { $ne: key }
    },
    {
      $push: {
        savedAddresses: {
          $each: [{
            key,
            ...normalizedAddress
          }],
          $slice: -MAX_ADDRESSES //  latest 10 address rakhega
        }
      }
    },
    { session }
  );


  await User.updateOne(
    {
      _id: userId,
      savedPhones: { $ne: mobileNumber }
    },
    {
      $push: {
        savedPhones: {
          $each: [mobileNumber],
          $slice: -MAX_PHONES // Sirf latest 5 numbers rakhega
        }
      }
    },
    { session }
  );
}