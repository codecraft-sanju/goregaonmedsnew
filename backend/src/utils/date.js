//src/utils/date.js
import { loadEnv } from '../config/env.js';
const env = loadEnv();
export function formatLocalDateOnly(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(env.APP_LOCALE, {
    timeZone: env.APP_TIMEZONE
  });
}

export function getLocalStartOfDay(dateString) {
  return new Date(`${dateString}T00:00:00.000${env.APP_TIMEZONE_OFFSET}`);
}

export function getLocalEndOfDay(dateString) {
  return new Date(`${dateString}T23:59:59.999${env.APP_TIMEZONE_OFFSET}`);
}