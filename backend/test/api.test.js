import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { createTelegramNotifier } from '../src/services/telegramService.js';
import { ADMIN_PASSWORD, CLOUD_NAME, FRONTEND_URL, buildApp, connect, manualOrder, resetDatabase, silentLogger } from './helpers.js';

before(connect);
beforeEach(resetDatabase);
after(() => mongoose.disconnect());

async function adminAgent(app) {
  const agent = request.agent(app);
  const res = await agent.post('/api/admin/login').set('Origin', FRONTEND_URL).send({ username: 'admin', password: ADMIN_PASSWORD });
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /HttpOnly/);
  assert.match(res.headers['set-cookie'][0], /SameSite=Strict/);
  return {
    get: (url) => agent.get(url),
    patch: (url, body) => agent.patch(url).set('Origin', FRONTEND_URL).send(body),
  };
}

async function placeOrder(app, overrides) {
  const res = await request(app).post('/api/orders/create').send(manualOrder(overrides));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

async function orderDbId(orderId) {
  return String((await Order.findOne({ orderId }))._id);
}

describe('POST /api/orders/create', () => {
  it('saves the order, normalizes the mobile number and reports Telegram success', async () => {
    const body = await placeOrder(buildApp());
    assert.match(body.orderId, /^GMED-[A-Z2-9]{6}$/);
    assert.deepEqual({ ...body, orderId: undefined }, { success: true, orderId: undefined, status: 'Pending', telegramNotificationSent: true });

    const order = await Order.findOne({ orderId: body.orderId }).lean();
    assert.equal(order.mobileNumber, '9820018771');
    assert.equal(order.firstOrderAtCreation, true);
    assert.equal(order.telegramNotificationSent, true);
    const user = await User.findOne({ mobileNumber: '9820018771' }).lean();
    assert.equal(user.totalOrders, 1);
  });

  it('still succeeds when Telegram is down, after saving to MongoDB', async () => {
    const notifier = createTelegramNotifier({
      botToken: 't', chatId: '1', logger: silentLogger,
      fetchImpl: async () => { throw new TypeError('fetch failed'); },
    });
    const body = await placeOrder(buildApp(notifier));
    assert.equal(body.success, true);
    assert.equal(body.status, 'Pending');
    assert.equal(body.telegramNotificationSent, false);
    const saved = await Order.findOne({ orderId: body.orderId }).lean();
    assert.ok(saved, 'order must be persisted even though Telegram failed');
    assert.equal(saved.telegramNotificationSent, false);
  });

  it('checks MongoDB before Telegram: the order exists when the notifier runs', async () => {
    let foundDuringNotify = null;
    const app = buildApp({
      notifyNewOrder: async (order) => {
        foundDuringNotify = await Order.exists({ orderId: order.orderId });
        throw new Error('notifier exploded');
      },
    });
    const res = await request(app).post('/api/orders/create').send(manualOrder());
    assert.ok(foundDuringNotify);
    // Even a notifier that breaks its never-throw contract cannot fail a saved order.
    assert.equal(res.status, 201);
    assert.equal(res.body.telegramNotificationSent, false);
  });

  it('returns the same order for a repeated clientRequestId (double submit)', async () => {
    const app = buildApp();
    const payload = manualOrder();
    const [first, second] = await Promise.all([
      request(app).post('/api/orders/create').send(payload),
      request(app).post('/api/orders/create').send(payload),
    ]);
    assert.equal(first.body.orderId, second.body.orderId);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal((await User.findOne().lean()).totalOrders, 1);
  });

  it('ignores pricing and eligibility fields sent by the browser', async () => {
    const body = await placeOrder(buildApp(), { deliveryCharge: -100, finalAmount: 99999, offerEligible: true, offerApplied: true, status: 'Delivered' });
    const order = await Order.findOne({ orderId: body.orderId }).lean();
    assert.equal(order.deliveryCharge, 0);
    assert.equal(order.finalAmount, 0);
    assert.equal(order.offerEligible, false);
    assert.equal(order.offerApplied, false);
    assert.equal(order.status, 'Pending');
  });

  it('rejects prescription URLs that are not from our Cloudinary folder', async () => {
    const res = await request(buildApp()).post('/api/orders/create').send(
      manualOrder({ orderType: 'prescription_image', medicines: [], prescriptionUrl: 'https://evil.example.com/p.jpg' }),
    );
    assert.equal(res.status, 400);
    const ok = await request(buildApp()).post('/api/orders/create').send(
      manualOrder({
        orderType: 'prescription_image',
        medicines: [],
        prescriptionUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v1700000000/goregaonmeds/prescriptions/abc.jpg`,
      }),
    );
    assert.equal(ok.status, 201);
  });

  it('validates input', async () => {
    const res = await request(buildApp()).post('/api/orders/create').send(manualOrder({ mobileNumber: '12345', medicines: [] }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('POST /api/orders/track', () => {
  it('returns minimal status for the right last 4 digits and 404 otherwise', async () => {
    const app = buildApp();
    const { orderId } = await placeOrder(app);
    const ok = await request(app).post('/api/orders/track').send({ orderId: orderId.toLowerCase(), mobileLast4: '8771' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.order.statusLabel, 'Order Received & Processing');
    assert.equal(ok.body.order.address, undefined);
    assert.equal(ok.body.order.mobileNumber, undefined);
    assert.equal(ok.body.order.customerName, undefined);

    const wrong = await request(app).post('/api/orders/track').send({ orderId, mobileLast4: '0000' });
    assert.equal(wrong.status, 404);
  });
});

describe('admin billing enforces the medicine-only threshold', () => {
  async function setup(deliveryCharge = 30) {
    const app = buildApp();
    const admin = await adminAgent(app);
    assert.equal((await admin.patch('/api/admin/settings', { deliveryCharge })).status, 200);
    const { orderId } = await placeOrder(app);
    return { app, admin, id: await orderDbId(orderId), orderId };
  }

  it('₹420 medicines + ₹150 other + ₹30 delivery = ₹600 is NOT eligible', async () => {
    const { admin, id } = await setup();
    const res = await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 420, nonMedicineSubtotal: 150 });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.deliveryCharge, 30);
    assert.equal(res.body.order.finalAmount, 600);
    assert.equal(res.body.order.offerEligible, false);
    assert.equal(res.body.order.offer.checks.meetsMedicineThreshold, false);

    const forced = await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 420, nonMedicineSubtotal: 150, offerApplied: true });
    assert.equal(forced.status, 422);
    assert.equal(forced.body.error.code, 'OFFER_NOT_ELIGIBLE');
  });

  it('₹520 medicines + ₹100 other + ₹30 delivery = ₹650 IS eligible', async () => {
    const { admin, id } = await setup();
    const res = await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 520, nonMedicineSubtotal: 100 });
    assert.equal(res.body.order.finalAmount, 650);
    assert.equal(res.body.order.offerEligible, true);
  });

  it('rejects a browser-supplied delivery charge or final amount', async () => {
    const { admin, id } = await setup();
    const res = await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 100, nonMedicineSubtotal: 0, deliveryCharge: 0, finalAmount: 1000 });
    assert.equal(res.status, 400);
  });

  it('a repeat customer is never eligible, whatever the amount', async () => {
    const { app, admin } = await setup();
    const { orderId } = await placeOrder(app);
    const res = await admin.patch(`/api/admin/orders/${await orderDbId(orderId)}/billing`, { medicineSubtotal: 5000, nonMedicineSubtotal: 0 });
    assert.equal(res.body.order.firstOrderAtCreation, false);
    assert.equal(res.body.order.offerEligible, false);
  });

  it('no eligibility when the offer is disabled', async () => {
    const { admin, id } = await setup();
    await admin.patch('/api/admin/settings', { firstOrderOfferEnabled: false });
    const res = await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 900, nonMedicineSubtotal: 0 });
    assert.equal(res.body.order.offerEligible, false);
  });

  it('delivering with the gift claims it exactly once', async () => {
    const { app, admin, id, orderId } = await setup();
    assert.equal((await admin.patch(`/api/admin/orders/${id}/deliver`)).body.error.code, 'BILL_REQUIRED');

    await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 520, nonMedicineSubtotal: 100, offerApplied: true });
    const delivered = await admin.patch(`/api/admin/orders/${id}/deliver`);
    assert.equal(delivered.status, 200);
    assert.equal(delivered.body.order.status, 'Delivered');

    const user = await User.findOne().lean();
    assert.equal(user.offerClaimed, true);
    assert.equal(user.offerClaimedOrderId, orderId);
    assert.equal(user.deliveredOrders, 1);

    assert.equal((await admin.patch(`/api/admin/orders/${id}/deliver`)).status, 409);
    assert.equal((await admin.patch(`/api/admin/orders/${id}/billing`, { medicineSubtotal: 1, nonMedicineSubtotal: 0 })).status, 409);

    const track = await request(app).post('/api/orders/track').send({ orderId, mobileLast4: '8771' });
    assert.equal(track.body.order.status, 'Delivered');
    assert.equal(track.body.order.finalAmount, 650);
  });

  it('lists orders and customers', async () => {
    const { admin } = await setup();
    const pending = await admin.get('/api/admin/orders?status=Pending');
    assert.equal(pending.body.orders.length, 1);
    assert.equal(pending.body.orders[0].previousOrders, 0);
    const customers = await admin.get('/api/admin/customers?q=8771');
    assert.equal(customers.body.customers.length, 1);
  });
});

describe('admin security', () => {
  it('requires a session and a trusted origin', async () => {
    const app = buildApp();
    assert.equal((await request(app).get('/api/admin/orders')).status, 401);
    assert.equal((await request(app).get('/api/admin/session')).status, 401);
    const badOrigin = await request(app).post('/api/admin/login').set('Origin', 'https://evil.example.com').send({ username: 'admin', password: ADMIN_PASSWORD });
    assert.equal(badOrigin.status, 403);
    const wrong = await request(app).post('/api/admin/login').set('Origin', FRONTEND_URL).send({ username: 'admin', password: 'nope' });
    assert.equal(wrong.status, 401);
    const forged = await request(app).get('/api/admin/orders').set('Cookie', 'gm_admin=eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYWRtaW4ifQ.');
    assert.equal(forged.status, 401);
  });
});
