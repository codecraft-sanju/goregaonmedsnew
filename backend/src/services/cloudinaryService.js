// src/services/cloudinaryService.js
import { createHash } from 'node:crypto';
import { v2 as cloudinaryClient } from 'cloudinary'; 

export function createUploadSignature({ cloudName, apiKey, apiSecret, folder }, uploadId, now = Date.now()) {
  const timestamp = Math.floor(now / 1000);
  const client_allowed_formats = 'jpg,png,jpeg,webp'; 
  const max_file_size = 5242880; // 5 MB
  const type = 'authenticated'; 
  
  const secureFolder = `${folder}/${uploadId}`;

  // FIX: Cloudinary REST API signature sirf valid upload params accept karta hai
  const params = { 
    folder: secureFolder, 
    timestamp,
    type 
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
    
  const signature = createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
  
  return {
    cloudName,
    apiKey,
    folder: secureFolder,
    timestamp,
    client_allowed_formats,
    max_file_size,
    type,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
  };
}

export function isTrustedPrescriptionUrl(value, { cloudName, folder }) {
  let url;
  try { url = new URL(value); } catch { return false; }
  return (
    url.protocol === 'https:' &&
    url.hostname === 'res.cloudinary.com' &&
    !url.username && !url.password && !url.port &&
    (url.pathname.startsWith(`/${cloudName}/image/upload/`) || url.pathname.startsWith(`/${cloudName}/image/authenticated/`)) &&
    url.pathname.includes(`/${folder}/`) &&
    !url.pathname.includes('..')
  );
}

// Added function to actually verify if the file exists on Cloudinary servers
export async function verifyCloudinaryFileExists(url, { cloudName, apiKey, apiSecret }) {
  try {
    cloudinaryClient.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    
    const urlParts = url.split('/');
    const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));
    if (versionIndex === -1) return false;
    
    const publicIdWithExt = urlParts.slice(versionIndex + 1).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); 
    
    const result = await cloudinaryClient.api.resource(publicId, { type: 'authenticated' });
    return Boolean(result && result.asset_id);
  } catch (error) {
    console.error('[cloudinaryService] File verification failed:', error.message);
    return false;
  }
}

export function generateSignedDeliveryUrl(url, { cloudName, apiKey, apiSecret }) {
  if (!url) return null;
  cloudinaryClient.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  
  const urlParts = url.split('/');
  const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));
  if (versionIndex === -1) return url;

  const publicIdWithExt = urlParts.slice(versionIndex + 1).join('/');
  
  // URL valid for 1 hour (3600 seconds)
  return cloudinaryClient.utils.private_download_url(publicIdWithExt, '', {
    type: 'authenticated',
    resource_type: 'raw',
    expires_at: Math.floor(Date.now() / 1000) + 3600 
  });
}

export function uploadPDFBuffer(buffer, orderId, { cloudName, apiKey, apiSecret, folder }) {
  return new Promise((resolve, reject) => {
    cloudinaryClient.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const stream = cloudinaryClient.uploader.upload_stream(
      {
        folder: `${folder}/invoices`,
        public_id: `invoice-${orderId}`,
        resource_type: 'raw', 
        type: 'authenticated'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}