import { Settings, SETTINGS_SINGLETON_ID } from '../models/Settings.js';

/** Always reads from MongoDB: delivery charge and offer settings are authoritative server-side. */
export async function getSettings() {
  return Settings.findOneAndUpdate(
    { singletonId: SETTINGS_SINGLETON_ID },
    { $setOnInsert: { singletonId: SETTINGS_SINGLETON_ID } },
    { upsert: true, new: true, setDefaultsOnInsert: true, lean: true },
  );
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
  return { ...toPublicSettings(settings), updatedAt: settings.updatedAt };
}
