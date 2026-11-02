// src/services/settingsService.js 
import { Settings, SETTINGS_SINGLETON_ID } from '../models/Settings.js';

export async function getSettings() {
  
  let settings = await Settings.findOne({ singletonId: SETTINGS_SINGLETON_ID }).lean();
  
  if (!settings) {
  
    settings = await Settings.findOneAndUpdate(
      { singletonId: SETTINGS_SINGLETON_ID },
      { $setOnInsert: { singletonId: SETTINGS_SINGLETON_ID } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true },
    );
  }
  return settings;
}

export async function updateSettings(changes) {
  await getSettings();
  return Settings.findOneAndUpdate(
    { singletonId: SETTINGS_SINGLETON_ID },
    { $set: changes },
    { new: true, runValidators: true, lean: true },
  );
}

export function toPublicSettings(settings) {
  return {
    deliveryCharge: settings.deliveryCharge,
    firstOrderOfferEnabled: settings.firstOrderOfferEnabled,
    firstOrderMinimumMedicineAmount: settings.firstOrderMinimumMedicineAmount,
  };
}

export function toAdminSettings(settings) {
return { ...toPublicSettings(settings), lowStockThreshold: settings.lowStockThreshold, updatedAt: settings.updatedAt };
}