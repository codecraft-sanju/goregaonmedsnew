// src/services/offerLineService.js

function lineTotalPaise(line) {
  const price = Number(line.price);
  const quantity = Number(line.quantity);
  
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error('Invalid line-item price or quantity');
  }
  
  const paise = Math.round((price + Number.EPSILON) * 100);
  
  if (!Number.isSafeInteger(paise) || Math.abs(paise / 100 - price) > 0.000001) {
    throw new Error('Price must be a safe monetary amount with at most 2 decimals');
  }
  
  const total = paise * quantity;
  
  if (!Number.isSafeInteger(total)) throw new Error('Line total exceeds safe integer range');
  return total;
}
export function calculateCategorizedSubtotals({ medicines = [], products = [], nonMedicineSubtotal = 0 }) {
  let medicinePaise = 0;
  let nonMedicinePaise = 0;
  if (nonMedicineSubtotal > 0) {
      nonMedicinePaise = Math.round((Number(nonMedicineSubtotal) + Number.EPSILON) * 100);
  }

  for (const med of medicines) {
    if (med.isAvailable !== false) medicinePaise += lineTotalPaise(med);
  }

  for (const item of products) {
    if (!['medicine', 'non_medicine'].includes(item.kind)) {
      throw new Error('Product kind not assigned; classify this catalog item before billing');
    }
    const total = lineTotalPaise(item);
    if (item.kind === 'medicine') medicinePaise += total;
    else nonMedicinePaise += total;
  }
  
  if (!Number.isSafeInteger(medicinePaise + nonMedicinePaise)) {
    throw new Error('Order total exceeds safe integer range');
  }
  
  return {
    medicineSubtotal: medicinePaise / 100,
    nonMedicineSubtotal: nonMedicinePaise / 100, 
  };
}