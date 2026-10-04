//src/models/Settings.js
import mongoose from 'mongoose';

export const SETTINGS_SINGLETON_ID = 'config';

const settingsSchema = new mongoose.Schema(
  {
    singletonId: { type: String, default: SETTINGS_SINGLETON_ID, unique: true },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    firstOrderOfferEnabled: { type: Boolean, default: true },
    // Named explicitly: the threshold applies to the medicine subtotal only, never the final bill.
    firstOrderMinimumMedicineAmount: { type: Number, default: 500, min: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Settings = mongoose.models.Settings ?? mongoose.model('Settings', settingsSchema);
