require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Safepay } = require("@sfpy/node-sdk");
const SafepayCore = require("@sfpy/node-core");
const nodemailer = require("nodemailer");
const {
  getOrders,
  getOrderByOrderId,
  createOrder,
  updateOrderByOrderId,
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

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
const PRICING = {
  printed: { price: 2000, compareAt: 3000 },
  plain: { price: 1900, compareAt: 2400 },
};

const SHIPPING_COST = 200;

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

const TROUSER_PRICE = 3700;

const GYM_WEAR_PRICE = 2200;
const GYM_SIZES = ["S", "M", "L", "XL"];

const GYM_WEAR = {
  id: "gym-wear",
  name: "Gym Wear",
  price: GYM_WEAR_PRICE,
  compareAt: GYM_WEAR_PRICE,
  description:
    "Exclusive Gym Wear collection. Performance-ready fabric built for training, lifting, and everyday gym sessions.",
  sizes: GYM_SIZES,
  variants: [
    {
      style: "Style 1",
      image: "/images/gym wear 1/MZ34900000266SATR-media-1.webp",
      description:
        "Exclusive Gym Wear — Style 1. Breathable performance fit for workouts and active days.",
    },
    {
      style: "Style 2",
      image: "/images/gym wear 2/MZ34900000265SATR-media-1.webp",
      description:
        "Exclusive Gym Wear — Style 2. Sleek gym-ready look with a comfortable athletic cut.",
    },
    {
      style: "Style 3",
      image: "/images/gym wear 3/MZ34900000267SATR-media-1.webp",
      description:
        "Exclusive Gym Wear — Style 3. Bold exclusive design — train hard, look sharp.",
    },
  ],
};

const TROUSERS = {
  id: "rawtee-trousers",
  name: "RawTee Composite Thickened Trousers",
  price: TROUSER_PRICE,
  compareAt: TROUSER_PRICE,
  description:
    "Premium composite thickened trousers. Durable fabric with a comfortable relaxed fit — built for everyday wear.",
  variants: [
    {
      color: "Dark gray",
      image: "/images/trousers/MZCHYHAM7591-media-1.jpg",
      sizes: ["M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
      description:
        "Composite thickened trousers in dark gray. Versatile everyday fit with premium durable fabric.",
    },
    {
      color: "Black",
      image: "/images/trousers/MZCHYHAM7591-media-2.jpg",
      sizes: ["M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
      description:
        "Composite thickened trousers in black. Classic go-to style — pairs with anything.",
    },
    {
      color: "Army color",
      image: "/images/trousers/MZCHYHAM7591-media-3.jpg",
      sizes: ["M", "L", "XL", "2XL"],
      description:
        "Composite thickened trousers in army color. Bold utility look with a comfortable fit.",
    },
  ],
};

function isTrouserProduct(productName) {
  return Boolean(productName && productName.toLowerCase().includes("trouser"));
}

function isGymWearProduct(productName) {
  return Boolean(productName && productName.toLowerCase().includes("gym wear"));
}

function getGymWearStyle(productName) {
  if (!productName) return GYM_WEAR.variants[0].style;
  const match = GYM_WEAR.variants.find((v) => productName.includes(v.style));
  return match ? match.style : GYM_WEAR.variants[0].style;
}

function getTrouserColor(productName) {
  if (!productName) return TROUSERS.variants[0].color;
  const match = TROUSERS.variants.find((v) => productName.includes(v.color));
  return match ? match.color : TROUSERS.variants[0].color;
}

function getValidSizes(productName) {
  if (isGymWearProduct(productName)) {
    return GYM_SIZES;
  }
  if (isTrouserProduct(productName)) {
    const variant = TROUSERS.variants.find((v) => v.color === getTrouserColor(productName));
    return variant ? variant.sizes : TROUSERS.variants[0].sizes;
  }
  return SIZES;
}

function isValidSize(size, productName) {
  return getValidSizes(productName).includes(size);
}

function getShirtType(shirtName) {
  if (!shirtName) return "printed";
  return shirtName.toLowerCase().includes("plain") ? "plain" : "printed";
}

function getShirtPricing(shirtName) {
  return PRICING[getShirtType(shirtName)];
}

function getOrderPricing(productName) {
  if (isGymWearProduct(productName)) {
    return { price: GYM_WEAR_PRICE, compareAt: GYM_WEAR_PRICE };
  }
  if (isTrouserProduct(productName)) {
    return { price: TROUSER_PRICE, compareAt: TROUSER_PRICE };
  }
  return getShirtPricing(productName);
}

const PRODUCT = {
  id: "rawtee-shirts",
  name: "RawTee Nike Print Shirt White",
  description:
    "White tee, loud Nike graphic, heavy cotton. Clean fit that hits different — wear it out, wear it daily, wear it proud.",
  price: PRICING.printed.price,
  compareAt: PRICING.printed.compareAt,
  currency: "pkr",
  image: "/images/MZCHYHAM2551-media-1.jpg",
  images: [
    {
      src: "/images/MZCHYHAM2551-media-1.jpg",
      name: "RawTee Nike Print Shirt White",
      type: "printed",
      price: 2000,
      compareAt: 3000,
      description:
        "White tee, loud Nike graphic, heavy cotton. Clean fit that hits different — wear it out, wear it daily, wear it proud.",
    },
    {
      src: "/images/MZCHYHAM2551-media-2.jpg",
      name: "RawTee Nike Print Shirt Black",
      type: "printed",
      price: 2000,
      compareAt: 3000,
      description:
        "All-black base with a fire Nike print that pops. Dark mode energy — built for nights out, link-ups, and looking sharp without trying.",
    },
    {
      src: "/images/MZCHYHAM2551-media-3.jpg",
      name: "RawTee Plain T Shirt White",
      type: "plain",
      price: 1900,
      compareAt: 2400,
      description:
        "Plain white tee, zero noise — just a solid fit. Layer it, gym it, chill in it. The essential every guy needs in rotation.",
    },
    {
      src: "/images/MZCHYHAM2551-media-4.jpg",
      name: "RawTee Plain T Shirt Black",
      type: "plain",
      price: 1900,
      compareAt: 2400,
      description:
        "Black plain tee — the ultimate go-to. Matches everything, feels premium, never misses. Lowkey flex, highkey comfortable.",
    },
  ],
};

// ── Helpers ──
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

  const patch = {
    status: "paid",
    paidAt: new Date().toISOString(),
    ...paymentMeta,
  };

  let updated = await updateOrderByOrderId(order.orderId, patch);
  if (!updated) return order;

  if (!updated.emailSent) {
    try {
      await sendOrderConfirmation(updated);
      updated = await updateOrderByOrderId(order.orderId, { emailSent: true });
    } catch (e) {
      console.error("Email error:", e.message);
    }
  }

  return updated;
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
          <p style="margin:0 0 8px"><strong>Size:</strong> ${order.size || "—"}</p>
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
        <p><strong>${order.name}</strong> (${order.email}) ordered ${order.quantity}x ${order.productName} — Size ${order.size || "—"}</p>
        <p>Total: ${total}</p>
        <p>Address: ${order.address}, ${order.city}, ${order.state}, ${order.zip}, ${order.country}</p>
        <p>Phone: ${order.phone || "N/A"}</p>
      `,
    });
  }
}

// ── Middleware ──
const ADMIN_PATH = process.env.ADMIN_PATH || "/rawtee-ops-x7k9m2";
const ADMIN_FILE = path.join(__dirname, "private", "admin.html");

app.get(ADMIN_PATH, (req, res) => {
  res.sendFile(ADMIN_FILE);
});

app.get("/admin.html", (_req, res) => {
  res.status(404).send("Not found");
});

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: process.env.VERCEL ? "7d" : 0,
    etag: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const adminTokens = new Set();

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function rateLimit({ max, windowMs }) {
  const hits = new Map();

  return (req, res, next) => {
    const ip = clientIp(req);
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
    }

    entry.count += 1;
    hits.set(ip, entry);

    if (entry.count > max) {
      return res.status(429).json({
        error: "Too many requests. Please wait a minute and try again.",
      });
    }

    next();
  };
}

const checkoutRateLimit = rateLimit({ max: 8, windowMs: 60 * 1000 });

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── API Routes ──

function buildStoreConfig() {
  const enrichImage = (img) => ({
    ...img,
    priceFormatted: formatPrice(img.price, PRODUCT.currency),
    compareAtFormatted: formatPrice(img.compareAt, PRODUCT.currency),
  });

  return {
    safepayPublicKey: process.env.SAFEPAY_PUBLIC_KEY || "",
    safepayEnv,
    product: {
      ...PRODUCT,
      priceFormatted: formatPrice(PRODUCT.price, PRODUCT.currency),
      compareAtFormatted: formatPrice(PRODUCT.compareAt, PRODUCT.currency),
      images: PRODUCT.images.map(enrichImage),
      pricing: PRICING,
      shipping: SHIPPING_COST,
      shippingFormatted: formatPrice(SHIPPING_COST, PRODUCT.currency),
      sizes: SIZES,
      trousers: {
        ...TROUSERS,
        priceFormatted: formatPrice(TROUSER_PRICE, PRODUCT.currency),
        variants: TROUSERS.variants.map((v) => ({
          ...v,
          name: `${TROUSERS.name} - ${v.color}`,
          price: TROUSER_PRICE,
          compareAt: TROUSER_PRICE,
          priceFormatted: formatPrice(TROUSER_PRICE, PRODUCT.currency),
        })),
      },
      gymWear: {
        ...GYM_WEAR,
        priceFormatted: formatPrice(GYM_WEAR_PRICE, PRODUCT.currency),
        variants: GYM_WEAR.variants.map((v) => ({
          ...v,
          name: `${GYM_WEAR.name} - ${v.style}`,
          price: GYM_WEAR_PRICE,
          compareAt: GYM_WEAR_PRICE,
          priceFormatted: formatPrice(GYM_WEAR_PRICE, PRODUCT.currency),
          sizes: GYM_SIZES,
        })),
      },
    },
  };
}

let cachedStoreConfig;

function getStoreConfig() {
  if (!cachedStoreConfig) {
    cachedStoreConfig = buildStoreConfig();
  }
  return cachedStoreConfig;
}

app.get("/api/config", (req, res) => {
  res.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.json(getStoreConfig());
});

app.post("/api/create-checkout-session", checkoutRateLimit, async (req, res) => {
  if (!safepay) {
    return res.status(500).json({ error: "SafePay is not configured. Add SAFEPAY keys to .env" });
  }

  const { name, email, phone, address, city, state, zip, country, quantity = 1, shirtName, size } = req.body;

  if (!name || !email || !address || !city || !state || !zip || !country) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  if (!size || !isValidSize(size, shirtName || PRODUCT.name)) {
    return res.status(400).json({ error: "Please select a valid size." });
  }

  const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
  const orderId = generateOrderId();
  const storeUrl = getStoreUrl();
  const itemPricing = getOrderPricing(shirtName || PRODUCT.name);
  const unitPrice = itemPricing.price;
  const subtotal = unitPrice * qty;
  const totalAmount = safepayAmount(subtotal + SHIPPING_COST, PRODUCT.currency);
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

    const order = {
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
      size,
      productName: shirtName || PRODUCT.name,
      unitPrice,
      compareAt: itemPricing.compareAt,
      shipping: SHIPPING_COST,
      subtotal,
      total: subtotal + SHIPPING_COST,
      currency: PRODUCT.currency,
      createdAt: new Date().toISOString(),
    };
    await createOrder(order);

    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err.response?.data || err.message);
    if (err.message?.includes("MONGODB_URI")) {
      return res.status(500).json({ error: "Order storage is not configured." });
    }
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
  const order = await getOrderByOrderId(orderId);

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
app.get("/api/verify-order/:orderId", async (req, res) => {
  try {
    const order = await getOrderByOrderId(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      paid: order.status === "paid",
      order,
    });
  } catch (err) {
    console.error("Verify order error:", err.message);
    res.status(500).json({ error: "Could not verify order" });
  }
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
      const order = await getOrderByOrderId(orderId);
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

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    res.json(await getOrders());
  } catch (err) {
    console.error("Admin orders error:", err.message);
    res.status(500).json({ error: "Could not load orders" });
  }
});

app.patch("/api/admin/orders/:orderId", requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const order = await updateOrderByOrderId(req.params.orderId, {
      status,
      updatedAt: new Date().toISOString(),
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    console.error("Admin update error:", err.message);
    res.status(500).json({ error: "Could not update order" });
  }
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const orders = await getOrders();
    const paid = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
    res.json({
      totalOrders: orders.length,
      paidOrders: paid.length,
      totalRevenue: paid.reduce((sum, o) => sum + o.total, 0),
      pendingOrders: orders.filter((o) => o.status === "pending").length,
    });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    res.status(500).json({ error: "Could not load stats" });
  }
});

// ── Start (local dev only — Vercel uses module export below) ──
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  RawTee Store running at http://localhost:${PORT}`);
    console.log(`  Admin panel: http://localhost:${PORT}${ADMIN_PATH}`);
    console.log(`  Payment gateway: SafePay (${safepayEnv})`);
    console.log(`  Database: MongoDB (${process.env.MONGODB_DB_NAME || "rawtee"})\n`);
  });
}

module.exports = app;
