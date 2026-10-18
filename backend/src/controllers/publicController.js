//src/controllers/publicController.js
import { createOrder, trackOrder, fetchOrderHistory, recoverOrderIds } from '../services/orderService.js';
import { getSettings, toPublicSettings } from '../services/settingsService.js';
import { createUploadSignature, isTrustedPrescriptionUrl } from '../services/cloudinaryService.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { Product } from '../models/Product.js';

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

    async getCategories(_req, res) {
      const categories = await Product.distinct('category', { isActive: true, inStock: true });
      res.set('Cache-Control', 'public, max-age=300'); 
      res.json({ success: true, categories });
    },

    async getTrendingProducts(req, res) {
      const { category } = req.query;
      const matchQuery = { isActive: true, inStock: true };
      
      if (category && category !== 'All') {
        matchQuery.category = category;
      }

      const products = await Product.aggregate([
        { $match: matchQuery },
        { $sample: { size: 10 } }
      ]);

      res.set('Cache-Control', 'no-store'); 
      res.json({ success: true, products });
    },

  async getPublicProducts(req, res) {
      // 1. Get query parameters with defaults
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20)); // default 20, max 50
      const { category, q } = req.query;

      // 2. Build the MongoDB query
      const matchQuery = { isActive: true };

      if (category && category !== 'All') {
        matchQuery.category = category;
      }

      if (q && q.trim().length > 0) {
        // Case-insensitive search on product name
        matchQuery.name = { $regex: q.trim(), $options: 'i' }; 
      }

      // 3. Execute query with pagination
      const [products, total] = await Promise.all([
        Product.find(matchQuery)
          .sort({ category: 1, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(matchQuery)
      ]);

      const totalPages = Math.ceil(total / limit);

      // 4. Send response
      res.set('Cache-Control', 'public, max-age=60'); 
      res.json({ 
        success: true, 
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    }
  };
}