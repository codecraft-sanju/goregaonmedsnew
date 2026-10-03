import { createOrder, trackOrder } from '../services/orderService.js';
import { getSettings, toPublicSettings } from '../services/settingsService.js';
import { createUploadSignature, isTrustedPrescriptionUrl } from '../services/cloudinaryService.js';
import { badRequest, notFound } from '../utils/AppError.js';

export function createPublicController({ env, notifier, logger }) {
  const cloudinary = {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_UPLOAD_FOLDER,
  };

  return {
    async createOrder(req, res) {
      const input = req.body;
      if (input.orderType === 'prescription_image' && !isTrustedPrescriptionUrl(input.prescriptionUrl, cloudinary)) {
        throw badRequest('Prescription upload could not be verified. Please upload it again.');
      }
      const result = await createOrder(input, { notifier, logger });
      res.status(201).json(result);
    },

    async trackOrder(req, res) {
      const order = await trackOrder(req.body);
      if (!order) throw notFound('No order matches that Order ID and mobile number.');
      res.json({ success: true, order });
    },

    async publicSettings(_req, res) {
      res.set('Cache-Control', 'public, max-age=30');
      res.json({ success: true, settings: toPublicSettings(await getSettings()) });
    },

    uploadSignature(_req, res) {
      res.set('Cache-Control', 'no-store');
      const { cloudName, apiKey, folder, timestamp, signature, uploadUrl } = createUploadSignature(cloudinary);
      res.json({ success: true, upload: { cloudName, apiKey, folder, timestamp, signature, uploadUrl } });
    },
  };
}
