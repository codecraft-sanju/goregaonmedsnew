//src/controllers/publicController.js
import { createOrder, trackOrder, fetchOrderHistory, recoverOrderIds } from '../services/orderService.js';
import { getSettings, toPublicSettings } from '../services/settingsService.js';
import { createUploadSignature, isTrustedPrescriptionUrl } from '../services/cloudinaryService.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { Product } from '../models/Product.js'; // NEW: Imported Product model

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

    async fetchHistory(req, res) {
      const orders = await fetchOrderHistory(req.body.orderIds);
      res.json({ success: true, orders });
    },

    async recoverHistory(req, res) {
      const orderIds = await recoverOrderIds(req.body);
      if (!orderIds) {
        throw notFound('No matching order found for this mobile number and Order ID combination.');
      }
      res.json({ success: true, orderIds });
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

  
    async getPublicProducts(_req, res) {
   
      const products = await Product.find({ isActive: true })
        .sort({ category: 1, name: 1 }) 
        .lean();
      
     
      res.set('Cache-Control', 'public, max-age=60'); 
      res.json({ success: true, products });
    }
  };
}