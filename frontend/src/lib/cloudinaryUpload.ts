//src/lib/cloudinaryUpload.ts
import { apiRequest } from './api';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  uploadUrl: string;
}

export class UploadError extends Error {}

/**
 * Uploads straight from the browser to Cloudinary using a short-lived signature from Express,
 * so image bytes never pass through our server. Returns Cloudinary's secure_url.
 */
export async function uploadPrescription(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<string> {
  const { upload } = await apiRequest<{ upload: UploadSignature }>('/uploads/signature', { signal });
  if (!upload.uploadUrl.startsWith('https://api.cloudinary.com/')) throw new UploadError('Upload could not be authorised.');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', upload.apiKey);
  form.append('timestamp', String(upload.timestamp));
  form.append('signature', upload.signature);
  form.append('folder', upload.folder);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', upload.uploadUrl);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const url = xhr.response?.secure_url;
      if (xhr.status >= 200 && xhr.status < 300 && typeof url === 'string' && url.startsWith('https://res.cloudinary.com/')) {
        onProgress(100);
        resolve(url);
      } else {
        reject(new UploadError('Upload failed. Please try again.'));
      }
    };
    xhr.onerror = () => reject(new UploadError('Upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
