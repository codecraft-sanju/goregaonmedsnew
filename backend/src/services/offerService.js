//src/services/offerService.js
import { roundMoney } from '../utils/money.js';

/**
 * Single source of truth for the first-order gift (FREE Dr. Morepen GlucoOne BG-03).
 *
 * The monetary condition is MEDICINE SUBTOTAL ONLY. These functions deliberately do not
 * accept finalAmount, nonMedicineSubtotal or deliveryCharge, so none of them can leak
 * into the threshold check.
 */
export const OFFER_GIFT = Object.freeze({ name: 'Dr. Morepen GlucoOne BG-03', mrp: 650 });

export function meetsOfferAmount(medicineSubtotal, settings) {
  return roundMoney(medicineSubtotal) >= settings.firstOrderMinimumMedicineAmount;
}

export function evaluateOfferEligibility({ settings, firstOrderAtCreation, userOfferClaimed, medicineSubtotal }) {
  const checks = {
    offerEnabled: settings.firstOrderOfferEnabled === true,
    firstOrder: firstOrderAtCreation === true,
    meetsMedicineThreshold: meetsOfferAmount(medicineSubtotal, settings),
    giftNotPreviouslyClaimed: userOfferClaimed === false,
  };
  return {
    eligible: Object.values(checks).every(Boolean),
    checks,
    requiredMedicineAmount: settings.firstOrderMinimumMedicineAmount,
    eligibleMedicineSubtotal: roundMoney(medicineSubtotal),
  };
}

// UPDATE: Added discount parameter and safe calculation
export function calculateBill({ medicineSubtotal, nonMedicineSubtotal, deliveryCharge, discount = 0 }) {
  const medicine = roundMoney(medicineSubtotal);
  const nonMedicine = roundMoney(nonMedicineSubtotal);
  const delivery = roundMoney(deliveryCharge);
  const appliedDiscount = roundMoney(discount);

  const grossAmount = medicine + nonMedicine + delivery;
  
  // Validation: Discount cannot be more than the gross amount
  const safeDiscount = appliedDiscount > grossAmount ? grossAmount : appliedDiscount;

  return {
    medicineSubtotal: medicine,
    nonMedicineSubtotal: nonMedicine,
    deliveryCharge: delivery,
    discount: safeDiscount,
    finalAmount: roundMoney(grossAmount - safeDiscount),
  };
}