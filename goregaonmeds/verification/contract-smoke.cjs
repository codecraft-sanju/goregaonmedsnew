// Contract mocks are test fixtures only; the application never uses mock data.
const assert = require("node:assert/strict");
const { chromium: pw } = require("playwright");

const { spawn } = require("node:child_process");
const root = require("node:path").resolve(__dirname, "..");
(async () => {
  const server = spawn(
    "node",
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      "3007",
      "-H",
      "127.0.0.1",
    ],
    { cwd: root, stdio: "pipe" },
  );
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on("data", (b) => {
        if (b.toString().includes("Ready")) resolve();
      });
      server.on("exit", (code) => reject(new Error("server exited " + code)));
      setTimeout(() => reject(new Error("server timeout")), 15000).unref();
    });
    browser = await pw.launch({
      headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE_PATH
        ? {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          }
        : {}),
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const failures = [];
    page.on("pageerror", (e) => failures.push(e.message));
    const settings = {
      deliveryCharge: 0,
      firstOrderOfferEnabled: true,
      firstOrderMinimumMedicineAmount: 500,
    };
    const medicine = {
      _id: "medicine-1",
      name: "Dolo 650",
      quantity: "2 strips",
      isAvailable: true,
      price: 60,
    };
    const order = {
      id: "mongo-order-id",
      orderId: "GMED-X8P2K7",
      customerName: "Test Customer",
      mobileNumber: "9876543210",
      orderType: "manual_text",
      medicines: [medicine],
      prescriptionUrl: null,
      address: { flat: "Flat 101", area: "Goregaon East", landmark: "" },
      paymentMethod: "Pay at Delivery (Cash/UPI)",
      medicineSubtotal: 60,
      nonMedicineSubtotal: 0,
      deliveryCharge: 0,
      discount: 0,
      finalAmount: 60,
      billedAt: null,
      offerOptIn: false,
      firstOrderAtCreation: true,
      previousOrders: 0,
      offerEligible: false,
      offerApplied: false,
      offer: {
        eligible: false,
        checks: {
          offerEnabled: true,
          firstOrder: true,
          meetsMedicineThreshold: false,
          giftNotPreviouslyClaimed: true,
        },
        requiredMedicineAmount: 500,
        eligibleMedicineSubtotal: 60,
      },
      status: "Pending",
      cancelReason: null,
      telegramNotificationSent: true,
      createdAt: "2026-10-06T09:00:00Z",
      deliveredAt: null,
      customer: null,
    };
    const customer = {
      fullName: "Test Customer",
      mobileNumber: "9876543210",
      totalOrders: 1,
      deliveredOrders: 0,
      offerClaimed: false,
      offerClaimedOrderId: null,
      isFirstTimeCustomer: true,
    };
    const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
    const creates = [];
    const bills = [];
    let deliveries = 0;
    function publicOrder() {
      return {
        ...order,
        placedAt: order.createdAt,
        itemCount: 1,
        statusLabel:
          order.status === "Pending"
            ? "Order Received & Processing"
            : order.status,
        finalAmount: order.billedAt ? order.finalAmount : null,
      };
    }
    await page.route("**/api/**", async (r) => {
      const req = r.request();
      const path = new URL(req.url()).pathname;
      const body = req.postDataJSON();
      let d = { success: true };
      if (path === "/api/settings/public" || path === "/api/admin/settings") {
        if (req.method() === "PATCH") Object.assign(settings, body);
        d.settings = settings;
      } else if (path === "/api/orders/create") {
        creates.push(body);
        if (creates.length === 1) {
          await r.fulfill({
            status: 503,
            json: {
              success: false,
              error: { message: "Temporary service interruption" },
            },
          });
          return;
        }
        d.orderId = order.orderId;
        d.status = "Pending";
        d.telegramNotificationSent = false;
      } else if (path === "/api/orders/track") d.order = publicOrder();
      else if (path === "/api/orders/history") d.orders = [publicOrder()];
      else if (path === "/api/orders/recover") d.orderIds = [order.orderId];
      else if (path === "/api/admin/session") {
        d.authenticated = true;
        d.admin = { username: "admin" };
      } else if (path === "/api/admin/orders") {
        d.orders = [order];
        d.pagination = pagination;
      } else if (path === "/api/admin/orders/mongo-order-id") d.order = order;
      else if (path.endsWith("/billing")) {
        bills.push(body);
        assert.deepEqual(Object.keys(body).sort(), [
          "discount",
          "medicines",
          "nonMedicineSubtotal",
          "offerApplied",
        ]);
        assert.equal(body.medicines.length, 1);
        assert.equal(body.medicines[0]._id, "medicine-1");
        assert(!("name" in body.medicines[0]));
        order.medicines[0] = { ...order.medicines[0], ...body.medicines[0] };
        order.medicineSubtotal = body.medicines[0].price;
        order.finalAmount =
          body.medicines[0].price + body.nonMedicineSubtotal - body.discount;
        order.billedAt = "2026-10-06T10:00:00Z";
        d.order = order;
      } else if (path.endsWith("/deliver")) {
        deliveries++;
        order.status = "Delivered";
        order.deliveredAt = "2026-10-06T11:00:00Z";
        d.order = order;
      } else if (path === "/api/admin/customers") {
        d.customers = [customer];
        d.pagination = pagination;
      } else if (path === "/api/admin/analytics/overview") {
        d.totalSales = 120;
        d.totalOrders = 3;
        d.breakdown = { pending: 1, delivered: 1 };
      } else if (path === "/api/admin/login" || path === "/api/admin/logout") {
      } else throw new Error("Unmocked route " + path);
      await r.fulfill({ json: d });
    });
    await page.goto("http://127.0.0.1:3007/");
    await page.getByRole("link", { name: "Start an order" }).click();
    await page.getByLabel("Medicine name 1").fill("Dolo 650");
    await page.getByLabel("Quantity 1").fill("2 strips");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Test Customer");
    await page
      .getByLabel("Mobile number", { exact: true })
      .fill("+91 9876543210");
    await page.getByLabel("Flat / building").fill("Flat 101");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Place order" }).click();
    await page
      .getByText("Temporary service interruption", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Retry order safely" }).click();
    await page.waitForURL("**/order/success?*");
    assert.equal(creates.length, 2);
    assert.deepEqual(creates[0], creates[1]);
    assert.equal(creates[1].mobileNumber, "9876543210");
    await page.getByRole("link", { name: "Track order", exact: true }).click();
    await page.getByRole("button", { name: "Check status" }).click();
    await page
      .getByText("Your pharmacy will confirm availability and the final bill.")
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    console.log(
      "PASS mobile order, normalization, failed-request idempotency, success, unbilled tracking",
    );
    await page.goto("http://127.0.0.1:3007/profile");
    await page.getByRole("button").filter({ hasText: "GMED-X8P2K7" }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Recover orders", exact: true })
      .click();
    await page.getByLabel("Mobile number", { exact: true }).fill("9876543210");
    await page.getByLabel("Previous Order ID").fill("GMED-X8P2K7");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Recover orders", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    console.log(
      "PASS device history, detail sheet, keyboard dismissal, recovery",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://127.0.0.1:3007/admin");
    await page.getByRole("button").filter({ hasText: "GMED-X8P2K7" }).click();
    await page.getByRole("dialog").waitFor();
    assert(
      await page.getByRole("button", { name: "Mark delivered" }).isDisabled(),
    );
    await page.getByLabel("Line amount · Dolo 650").fill("120");
    await page.getByRole("button", { name: "Save complete bill" }).click();
    await page
      .getByText(
        "Bill saved. The confirmed total below is from the pharmacy server.",
      )
      .waitFor();
    assert.equal(bills[0].medicines[0].price, 120);
    await page.screenshot({
      path: root + "/verification/admin-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Mark delivered" }).click();
    await page
      .getByRole("button", { name: "Confirm delivered", exact: true })
      .click();
    await page.getByText("Order marked as delivered.").waitFor();
    assert.equal(deliveries, 1);
    assert.equal(
      await page.getByRole("button", { name: "Save complete bill" }).count(),
      0,
    );
    await page.keyboard.press("Escape");
    console.log(
      "PASS authenticated admin, exact full-line billing payload, saved server total, delivery confirmation, terminal lock",
    );
    await page.goto("http://127.0.0.1:3007/admin/customers");
    await page.getByRole("button").filter({ hasText: "Test Customer" }).click();
    await page.getByText("No first-order gift claimed.").waitFor();
    await page.keyboard.press("Escape");
    await page.goto("http://127.0.0.1:3007/admin/analytics");
    await page.getByText("Cancelled (calculated)").waitFor();
    await page.goto("http://127.0.0.1:3007/admin/settings");
    await page.getByLabel("Delivery charge (₹)").fill("40");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page
      .getByText("Settings saved. Your storefront has been refreshed.")
      .waitFor();
    assert.equal(settings.deliveryCharge, 40);
    assert.deepEqual(failures, []);
    console.log(
      "PASS customers, analytics, settings update; zero browser exceptions",
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
