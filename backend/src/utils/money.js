//src/utils/money.js
export const MAX_BILL_AMOUNT = 1_000_000;

/** Rounds to paise to avoid floating-point drift (0.1 + 0.2). */
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
