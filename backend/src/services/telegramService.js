// src/services/telegramService.js
import { Queue, Worker } from 'bullmq';
import { escapeHtml } from '../utils/text.js';
import { formatIndianMobile } from '../utils/phone.js';
import { Order } from '../models/Order.js'; 
import { redisQueueClient, createWorkerConnection } from '../config/redis.js';

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

  if (order.medicines && order.medicines.length > 0) {
    lines.push('💊 Medicines:');
    order.medicines.forEach((item, index) => {
      lines.push(`${index + 1}. ${escapeHtml(item.name)} — ${escapeHtml(item.quantity)}`);
    });
  }

  if (order.products && order.products.length > 0) {
    if (order.medicines && order.medicines.length > 0) lines.push(''); 
    lines.push('🛍️ Other Products:');
    order.products.forEach((item, index) => {
      lines.push(`${index + 1}. ${escapeHtml(item.name)} — Qty: ${escapeHtml(String(item.quantity))}`);
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

export function buildCancelMessage(order) {
  return `❌ <b>ORDER CANCELLED: ${escapeHtml(order.orderId)}</b>\n\n👤 ${escapeHtml(order.customerName)}\n📞 ${escapeHtml(formatIndianMobile(order.mobileNumber))}\n\n🛑 <b>Reason:</b> ${escapeHtml(order.cancelReason)}`;
}

export function createTelegramQueue(env, logger = console) {
  const configured = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID);
  
  const telegramQueue = new Queue('telegramQueue', { connection: redisQueueClient });

  return { 
    isConfigured: configured,
    async notifyNewOrder(order, settings) {
      if (!configured) return false;
      await telegramQueue.add('telegram-new-order', { action: 'new_order', payload: { order, settings } }, {
        jobId: `notify_order_${order.orderId}`, 
        attempts: 5, 
        backoff: { type: 'exponential', delay: 5000 } // Delay increased to 5 seconds for safety
      });
      return true;
    },
    async notifyOrderCancelled(order) {
      if (!configured) return false;
      await telegramQueue.add('telegram-cancel-order', { action: 'cancel_order', payload: { order } }, {
        jobId: `cancel_order_${order.orderId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 }
      });
      return true;
    },
    async close() {
      await telegramQueue.close();
    }
  };
}

export function createTelegramWorker(env, fetchImpl = globalThis.fetch, timeoutMs = 30000, logger = console) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_ADMIN_CHAT_ID;
  const configured = Boolean(botToken && chatId);
  
  const workerConnection = createWorkerConnection();

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

  // BullMQ Limiter added here
  const telegramWorker = new Worker('telegramQueue', async (job) => {
    if (!configured) return;
    const { action, payload } = job.data;

    if (action === 'new_order') {
      const { order, settings } = payload;
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
            logger.warn(`[telegram] sendPhoto failed for ${order.orderId}, sending text fallback`);
            await sendText(`${message}\n\n🖼 <a href="${escapeHtml(order.prescriptionUrl)}">View prescription</a>`);
          }
        } else {
          await sendText(message);
        }
        
        await Order.updateOne({ _id: order._id }, { $set: { telegramNotificationSent: true } });
      } catch (error) {
        throw new Error(`Failed to send telegram notification for ${order.orderId}: ${error.message}`);
      }
    } 
    else if (action === 'cancel_order') {
      await sendText(buildCancelMessage(payload.order));
    }
  }, { 
    connection: workerConnection,
    limiter: {
      max: 20,         // Maximum 20 messages...
      duration: 60000  // ...per 60 seconds (1 minute) -> Telegram's strict group limit
    }
  });

  telegramWorker.on('failed', (job, err) => {
    logger.error(`[telegram-worker] Job ${job.id} failed: ${err.message}`);
  });

  return {
    async close() {
      await telegramWorker.close();
      await workerConnection.quit();
    }
  };
}