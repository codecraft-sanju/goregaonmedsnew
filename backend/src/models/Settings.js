// src/models/Settings.js
import mongoose from 'mongoose';

export const SETTINGS_SINGLETON_ID = 'config';

const settingsSchema = new mongoose.Schema(
  {
    singletonId: { type: String, default: SETTINGS_SINGLETON_ID, unique: true },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    firstOrderOfferEnabled: { type: Boolean, default: true },
    firstOrderMinimumMedicineAmount: { type: Number, default: 500, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    trendingProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    trendingLimit: { type: Number, default: 4, min: 1, max: 20 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Settings = mongoose.models.Settings ?? mongoose.model('Settings', settingsSchema);