//src/services/cloudinaryService.js
import { createHash } from 'node:crypto';

/** Signs a direct browser-to-Cloudinary upload so Express never handles image bytes. */
export function createUploadSignature({ cloudName, apiKey, apiSecret, folder }, now = Date.now()) {
  const timestamp = Math.floor(now / 1000);
  const params = { folder, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const signature = createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
  return {
    cloudName,
    apiKey,
    folder,
    timestamp,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
  };
}

/** Accepts only https image URLs from our own Cloudinary account and prescription folder. */
export function isTrustedPrescriptionUrl(value, { cloudName, folder }) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === 'res.cloudinary.com' &&
    !url.username &&
    !url.password &&
    !url.port &&
    url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
    url.pathname.includes(`/${folder}/`) &&
    !url.pathname.includes('..')
  );
}
