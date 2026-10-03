import { escapeHtml } from '../utils/text.js';
import { formatIndianMobile } from '../utils/phone.js';

const TELEGRAM_API = 'https://api.telegram.org';
const CAPTION_LIMIT = 1024;
const MESSAGE_LIMIT = 4096;

const ORDER_TYPE_LABELS = {
  manual_text: 'Medicine list',
  prescription_image: 'Prescription upload',
};

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Builds the admin notification. The gift is never shown as "eligible" here because the
 * medicine subtotal is unknown until the pharmacy bills the order.
 */
export function buildOrderMessage(order, settings) {
  const lines = [
    `🆕 <b>New Order ${escapeHtml(order.orderId)}</b>`,
    '',
    `👤 ${escapeHtml(order.customerName)}`,
    `📞 ${escapeHtml(formatIndianMobile(order.mobileNumber))}`,
    `📍 ${escapeHtml([order.address.flat, order.address.area, order.address.landmark].filter(Boolean).join(', '))}`,
    '',
    `🧾 Type: ${ORDER_TYPE_LABELS[order.orderType]}`,
  ];

  if (order.medicines.length > 0) {
    lines.push('💊 Medicines:');
    order.medicines.forEach((item, index) => {
      lines.push(`${index + 1}. ${escapeHtml(item.name)} — ${escapeHtml(item.quantity)}`);
    });
  }

  lines.push('', `💳 ${escapeHtml(order.paymentMethod)}`, '', `🎁 First Order: ${order.firstOrderAtCreation ? 'YES' : 'NO'}`);

  if (order.firstOrderAtCreation && settings.firstOrderOfferEnabled) {
    lines.push(
      '🎁 Gift: Pending Billing Check',
      `Minimum medicine subtotal: ${formatRupees(settings.firstOrderMinimumMedicineAmount)}`,
      '(medicines only — other items and delivery do not count)',
      `Customer asked for gift: ${order.offerOptIn ? 'YES' : 'NO'}`,
    );
  }

  return lines.join('\n');
}

export function createTelegramNotifier({ botToken, chatId, fetchImpl = globalThis.fetch, timeoutMs = 6000, logger = console }) {
  const configured = Boolean(botToken && chatId);

  async function call(method, payload) {
    const response = await fetchImpl(`${TELEGRAM_API}/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', ...payload }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) {
      throw new Error(`Telegram ${method} failed: HTTP ${response.status} ${body.description ?? ''}`.trim());
    }
  }

  async function sendText(text) {
    await call('sendMessage', { text: text.slice(0, MESSAGE_LIMIT), disable_web_page_preview: true });
  }

  /** Never throws: returns true only when Telegram confirmed delivery of the notification. */
  async function notifyNewOrder(order, settings) {
    if (!configured) {
      logger.warn(`[telegram] not configured; order ${order.orderId} saved without notification`);
      return false;
    }
    const message = buildOrderMessage(order, settings);
    try {
      if (order.orderType === 'prescription_image' && order.prescriptionUrl) {
        try {
          if (message.length <= CAPTION_LIMIT) {
            await call('sendPhoto', { photo: order.prescriptionUrl, caption: message });
          } else {
            await call('sendPhoto', { photo: order.prescriptionUrl, caption: `🆕 Prescription for ${escapeHtml(order.orderId)}` });
            await sendText(message);
          }
        } catch (photoError) {
          // Telegram could not fetch the image: still notify, with a link the admin can open.
          logger.warn(`[telegram] sendPhoto failed for ${order.orderId}: ${photoError.message}`);
          await sendText(`${message}\n\n🖼 <a href="${escapeHtml(order.prescriptionUrl)}">View prescription</a>`);
        }
      } else {
        await sendText(message);
      }
      return true;
    } catch (error) {
      logger.error(`[telegram] notification failed for ${order.orderId}: ${error.message}`);
      return false;
    }
  }

  return { notifyNewOrder, isConfigured: configured };
}
