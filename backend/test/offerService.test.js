import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBill, evaluateOfferEligibility, meetsOfferAmount } from '../src/services/offerService.js';

const settings = { firstOrderOfferEnabled: true, firstOrderMinimumMedicineAmount: 500, deliveryCharge: 30 };
const firstOrder = { settings, firstOrderAtCreation: true, userOfferClaimed: false };

describe('offer eligibility uses the medicine subtotal only', () => {
  it('blueprint example: ₹420 medicines + ₹150 cosmetics + ₹30 delivery = ₹600 is NOT eligible', () => {
    const bill = calculateBill({ medicineSubtotal: 420, nonMedicineSubtotal: 150, deliveryCharge: 30 });
    assert.equal(bill.finalAmount, 600);
    const result = evaluateOfferEligibility({ ...firstOrder, medicineSubtotal: bill.medicineSubtotal });
    assert.equal(result.eligible, false);
    assert.equal(result.checks.meetsMedicineThreshold, false);
    assert.equal(result.eligibleMedicineSubtotal, 420);
  });

  it('blueprint example: ₹520 medicines + ₹100 cosmetics + ₹30 delivery IS eligible', () => {
    const bill = calculateBill({ medicineSubtotal: 520, nonMedicineSubtotal: 100, deliveryCharge: 30 });
    assert.equal(bill.finalAmount, 650);
    assert.equal(evaluateOfferEligibility({ ...firstOrder, medicineSubtotal: bill.medicineSubtotal }).eligible, true);
  });

  it('a huge non-medicine bill never lifts a ₹499.99 medicine subtotal over the threshold', () => {
    assert.equal(meetsOfferAmount(499.99, settings), false);
    assert.equal(evaluateOfferEligibility({ ...firstOrder, medicineSubtotal: 499.99 }).eligible, false);
  });

  it('exactly the threshold qualifies', () => {
    assert.equal(meetsOfferAmount(500, settings), true);
  });

  it('every other condition must also hold', () => {
    assert.equal(evaluateOfferEligibility({ ...firstOrder, firstOrderAtCreation: false, medicineSubtotal: 900 }).eligible, false);
    assert.equal(evaluateOfferEligibility({ ...firstOrder, userOfferClaimed: true, medicineSubtotal: 900 }).eligible, false);
    assert.equal(
      evaluateOfferEligibility({ ...firstOrder, settings: { ...settings, firstOrderOfferEnabled: false }, medicineSubtotal: 900 }).eligible,
      false,
    );
  });

  it('respects a custom threshold from settings', () => {
    const custom = { ...settings, firstOrderMinimumMedicineAmount: 750 };
    assert.equal(evaluateOfferEligibility({ ...firstOrder, settings: custom, medicineSubtotal: 700 }).eligible, false);
    assert.equal(evaluateOfferEligibility({ ...firstOrder, settings: custom, medicineSubtotal: 750 }).eligible, true);
  });

  it('rounds money to paise', () => {
    assert.equal(calculateBill({ medicineSubtotal: 0.1, nonMedicineSubtotal: 0.2, deliveryCharge: 0 }).finalAmount, 0.3);
  });
});
