// src/utils/money.js
export const MAX_BILL_AMOUNT = 1_000_000;


export function toPaise(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100);
}


export function toRupees(paise) {
  return Number((paise / 100).toFixed(2));
}


export function roundMoney(value) {
  return toRupees(toPaise(value));
}