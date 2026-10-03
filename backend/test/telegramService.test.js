import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderMessage, createTelegramNotifier } from '../src/services/telegramService.js';
import { silentLogger } from './helpers.js';

const settings = { firstOrderOfferEnabled: true, firstOrderMinimumMedicineAmount: 500 };
const order = {
  orderId: 'GMED-X8P2K7',
  customerName: '<script>alert(1)</script>',
  mobileNumber: '8433818771',
  orderType: 'manual_text',
  medicines: [{ name: 'Dolo 650', quantity: '2 strips' }],
  address: { flat: 'A-1', area: 'Goregaon East', landmark: '' },
  paymentMethod: 'Pay at Delivery (Cash/UPI)',
  firstOrderAtCreation: true,
  offerOptIn: true,
};

describe('Telegram message', () => {
  it('escapes customer input and never claims the gift is eligible before billing', () => {
    const message = buildOrderMessage(order, settings);
    assert.ok(message.includes('&lt;script&gt;'));
    assert.ok(!message.includes('<script>'));
    assert.ok(message.includes('Gift: Pending Billing Check'));
    assert.ok(message.includes('Minimum medicine subtotal: ₹500'));
    assert.ok(!/\beligible\b/i.test(message));
  });

  it('omits gift lines for repeat customers', () => {
    const message = buildOrderMessage({ ...order, firstOrderAtCreation: false }, settings);
    assert.ok(message.includes('First Order: NO'));
    assert.ok(!message.includes('Pending Billing Check'));
  });
});

describe('Telegram notifier fail-safe', () => {
  const ok = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

  it('returns false (never throws) when Telegram is unreachable', async () => {
    const notifier = createTelegramNotifier({
      botToken: 't', chatId: '1', logger: silentLogger,
      fetchImpl: async () => { throw new TypeError('fetch failed'); },
    });
    assert.equal(await notifier.notifyNewOrder(order, settings), false);
  });

  it('returns false when Telegram hangs past the timeout', async () => {
    const notifier = createTelegramNotifier({
      botToken: 't', chatId: '1', timeoutMs: 50, logger: silentLogger,
      fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    });
    // AbortSignal.timeout uses an unref'd timer; keep the test process alive until it fires.
    const keepAlive = setTimeout(() => {}, 1000);
    assert.equal(await notifier.notifyNewOrder(order, settings), false);
    clearTimeout(keepAlive);
  });

  it('returns false when not configured', async () => {
    const notifier = createTelegramNotifier({ botToken: '', chatId: '', logger: silentLogger, fetchImpl: ok });
    assert.equal(await notifier.notifyNewOrder(order, settings), false);
  });

  it('uses sendPhoto for prescriptions and falls back to a text link if the photo fails', async () => {
    const calls = [];
    const notifier = createTelegramNotifier({
      botToken: 't', chatId: '1', logger: silentLogger,
      fetchImpl: async (url, init) => {
        calls.push({ method: url.split('/').pop(), body: JSON.parse(init.body) });
        if (url.endsWith('/sendPhoto')) return new Response(JSON.stringify({ ok: false, description: 'bad image' }), { status: 400 });
        return ok();
      },
    });
    const sent = await notifier.notifyNewOrder(
      { ...order, orderType: 'prescription_image', medicines: [], prescriptionUrl: 'https://res.cloudinary.com/x/image/upload/v1/p.jpg' },
      settings,
    );
    assert.equal(sent, true);
    assert.deepEqual(calls.map((call) => call.method), ['sendPhoto', 'sendMessage']);
    assert.ok(calls[1].body.text.includes('View prescription'));
  });
});
