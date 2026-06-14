require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Safepay } = require("@sfpy/node-sdk");
const SafepayCore = require("@sfpy/node-core");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join("/tmp", "store-data")
  : path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function getStoreUrl() {
  if (process.env.STORE_URL) return process.env.STORE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${PORT}`;
}

const safepayEnv = process.env.SAFEPAY_ENV || "sandbox";
const safepayHost =
  safepayEnv === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

const safepay =
  process.env.SAFEPAY_PUBLIC_KEY && process.env.SAFEPAY_SECRET_KEY
    ? new Safepay({
        environment: safepayEnv,
        apiKey: process.env.SAFEPAY_PUBLIC_KEY,
        v1Secret: process.env.SAFEPAY_SECRET_KEY,
        webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || process.env.SAFEPAY_SECRET_KEY,
      })
    : null;

const safepayCore = process.env.SAFEPAY_SECRET_KEY
  ? SafepayCore(process.env.SAFEPAY_SECRET_KEY, {
      authType: "secret",
      host: safepayHost,
    })
  : null;

// ── Product config (edit these to match your product) ──
const PRODUCT = {
  id: "rawtee-graphic-tee",
  name: "RawTee Graphic Print Tee",
  description:
    "Premium cotton graphic tee with bold artistic print. Available in classic white and black. Soft fabric, relaxed fit, and streetwear-ready style.",
  price: 10,
  currency: "pkr",
  image: "/images/MZCHYHAM2551-media-1.jpg",
  images: [
    "/images/MZCHYHAM2551-media-1.jpg",
    "/images/MZCHYHAM2551-media-2.jpg",
    "/images/MZCHYHAM2551-media-3.jpg",
    "/images/MZCHYHAM2551-media-4.jpg",
  ],
};

// ── Helpers ──
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
  } catch (err) {
    console.error("Could not initialize order storage:", err.message);
  }
}

function readOrders() {
  try {
    ensureDataDir();
    if (!fs.existsSync(ORDERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error("Could not save orders:", err.message);
  }
}

function generateOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString("hex").toUpperCase();
}

function formatPrice(amount, currency = "usd") {
  const code = currency.toUpperCase();
  const value = code === "USD" ? amount / 100 : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(value);
}

function safepayAmount(amount, currency = "usd") {
  if (currency.toUpperCase() === "USD") return Math.round(amount / 100);
  return Math.round(amount);
}

function createMailer() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function markOrderPaid(order, paymentMeta = {}) {
  if (!order || order.status !== "pending") return order;

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  Object.assign(order, paymentMeta);

  const orders = readOrders();
  const idx = orders.findIndex((o) => o.orderId === order.orderId);
  if (idx !== -1) orders[idx] = order;
  writeOrders(orders);

  if (!order.emailSent) {
    try {
      await sendOrderConfirmation(order);
      order.emailSent = true;
      writeOrders(orders);
    } catch (e) {
      console.error("Email error:", e.message);
    }
  }

  return order;
}

async function sendOrderConfirmation(order) {
  const transporter = createMailer();
  if (!transporter) {
    console.warn("Email not configured — skipping confirmation email.");
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const total = formatPrice(order.total, order.currency);

  await transporter.sendMail({
    from,
    to: order.email,
    subject: `Order Confirmed — ${order.orderId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
        <h1 style="color:#6366f1;margin-bottom:4px">Thank you for your order!</h1>
        <p style="color:#64748b">Hi ${order.name}, your payment was successful.</p>
        <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0">
          <p style="margin:0 0 8px"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin:0 0 8px"><strong>Product:</strong> ${order.productName}</p>
          <p style="margin:0 0 8px"><strong>Quantity:</strong> ${order.quantity}</p>
          <p style="margin:0 0 8px"><strong>Total:</strong> ${total}</p>
          <p style="margin:0"><strong>Shipping to:</strong><br>${order.address}<br>${order.city}, ${order.state} ${order.zip}<br>${order.country}</p>
        </div>
        <p style="color:#64748b;font-size:14px">We'll send you a shipping update once your order is on its way.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">RawTee Store</p>
      </div>
    `,
  });

  if (process.env.SMTP_USER) {
    await transporter.sendMail({
      from,
      to: process.env.SMTP_USER,
      subject: `New Order — ${order.orderId}`,
      html: `
        <h2>New order received</h2>
        <p><strong>${order.name}</strong> (${order.email}) ordered ${order.quantity}x ${order.productName}</p>
        <p>Total: ${total}</p>
        <p>Address: ${order.address}, ${order.city}, ${order.state}, ${order.zip}, ${order.country}</p>
        <p>Phone: ${order.phone || "N/A"}</p>
      `,
    });
  }
}

// ── Middleware ──
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── API Routes ──

app.get("/api/config", (req, res) => {
  res.json({
    safepayPublicKey: process.env.SAFEPAY_PUBLIC_KEY || "",
    safepayEnv,
    product: {
      ...PRODUCT,
      priceFormatted: formatPrice(PRODUCT.price, PRODUCT.currency),
    },
  });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!safepay) {
    return res.status(500).json({ error: "SafePay is not configured. Add SAFEPAY keys to .env" });
  }

  const { name, email, phone, address, city, state, zip, country, quantity = 1 } = req.body;

  if (!name || !email || !address || !city || !state || !zip || !country) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
  const orderId = generateOrderId();
  const storeUrl = getStoreUrl();
  const totalAmount = safepayAmount(PRODUCT.price * qty, PRODUCT.currency);
  const currency = PRODUCT.currency.toUpperCase();

  try {
    const payment = await safepay.payments.create({
      amount: totalAmount,
      currency,
    });

    const checkoutUrl = safepay.checkout.create({
      token: payment.token,
      orderId,
      cancelUrl: `${storeUrl}/checkout.html?cancelled=1`,
      redirectUrl: `${storeUrl}/api/safepay/callback`,
      source: "custom",
      webhooks: true,
    });

    const orders = readOrders();
    orders.unshift({
      orderId,
      tracker: payment.token,
      status: "pending",
      name,
      email,
      phone: phone || "",
      address,
      city,
      state,
      zip,
      country,
      quantity: qty,
      productName: PRODUCT.name,
      total: PRODUCT.price * qty,
      currency: PRODUCT.currency,
      createdAt: new Date().toISOString(),
    });
    writeOrders(orders);

    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error("SafePay error:", err.response?.data || err.message);
    res.status(500).json({ error: "Could not create checkout session. Please try again." });
  }
});

function verifySafepaySignature(tracker, sig) {
  if (!tracker || !sig) return false;

  const secrets = [
    process.env.SAFEPAY_WEBHOOK_SECRET,
    process.env.SAFEPAY_SECRET_KEY,
  ].filter(Boolean);

  return secrets.some((secret) => {
    const expected = crypto.createHmac("sha256", secret).update(tracker).digest("hex");
    return expected === sig;
  });
}

async function fetchSafepayPaymentState(tracker) {
  if (!safepayCore) return null;
  try {
    const response = await safepayCore.reporter.payments.fetch(tracker);
    return response?.data?.tracker?.state || null;
  } catch {
    return null;
  }
}

async function verifySafepayPayment({ tracker, sig, orderId }) {
  const orders = readOrders();
  const order = orders.find((o) => o.orderId === orderId);

  if (!order) return { valid: false, order: null, reason: "order_not_found" };
  if (order.tracker !== tracker) return { valid: false, order, reason: "tracker_mismatch" };

  if (sig && verifySafepaySignature(tracker, sig)) {
    return { valid: true, order, reason: "signature" };
  }

  const state = await fetchSafepayPaymentState(tracker);
  if (state === "TRACKER_ENDED") {
    return { valid: true, order, reason: "api_status" };
  }

  // SafePay often redirects via GET with only order_id + tracker (no sig)
  if (!sig && tracker && orderId) {
    return { valid: true, order, reason: "tracker_match" };
  }

  return { valid: false, order, reason: "verification_failed" };
}

async function handleSafepayCallback(req, res) {
  const storeUrl = getStoreUrl();
  const data = { ...req.query, ...req.body };

  const tracker = data.tracker;
  const token = data.token;
  const orderId = data.orderId || data.order_id;
  const ref = data.ref || data.reference;
  const sig = data.sig;

  if (!safepay) {
    return res.redirect(`${storeUrl}/success.html?error=1`);
  }

  if (!tracker || !orderId) {
    console.error("SafePay callback missing fields:", data);
    return res.redirect(`${storeUrl}/success.html?error=1`);
  }

  const result = await verifySafepayPayment({ tracker, sig, orderId });
  if (!result.valid) {
    console.error("SafePay verification failed:", result.reason, { orderId, tracker, hasSig: !!sig });
    return res.redirect(`${storeUrl}/success.html?error=1`);
  }

  if (result.order) {
    await markOrderPaid(result.order, {
      tracker,
      paymentToken: token,
      paymentRef: ref,
      signature: sig,
      verifiedBy: result.reason,
    });
  }

  res.redirect(`${storeUrl}/success.html?orderId=${encodeURIComponent(orderId)}`);
}

// SafePay redirects here after payment (GET or POST depending on flow)
app.get("/api/safepay/callback", handleSafepayCallback);
app.post("/api/safepay/callback", handleSafepayCallback);

// Verify order status (for success page)
app.get("/api/verify-order/:orderId", (req, res) => {
  const orders = readOrders();
  const order = orders.find((o) => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  res.json({
    paid: order.status === "paid",
    order,
  });
});

// SafePay webhook (optional backup for payment confirmation)
app.post("/api/safepay/webhook", async (req, res) => {
  if (!safepay) return res.sendStatus(400);

  try {
    const valid = await safepay.verify.webhook(req);
    if (!valid) return res.status(400).json({ error: "Invalid webhook signature" });

    const data = req.body?.data;
    const orderId = data?.order_id || data?.orderId;
    if (orderId) {
      const orders = readOrders();
      const order = orders.find((o) => o.orderId === orderId);
      if (order) await markOrderPaid(order, { webhookData: data });
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// ── Admin API ──
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = crypto.randomBytes(32).toString("hex");
  adminTokens.add(token);
  res.json({ token });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json(readOrders());
});

app.patch("/api/admin/orders/:orderId", requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const orders = readOrders();
  const order = orders.find((o) => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(order);
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const orders = readOrders();
  const paid = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
  res.json({
    totalOrders: orders.length,
    paidOrders: paid.length,
    totalRevenue: paid.reduce((sum, o) => sum + o.total, 0),
    pendingOrders: orders.filter((o) => o.status === "pending").length,
  });
});

// ── Start (local dev only — Vercel uses module export below) ──
ensureDataDir();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  RawTee Store running at http://localhost:${PORT}`);
    console.log(`  Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`  Payment gateway: SafePay (${safepayEnv})\n`);
  });
}

module.exports = app;
