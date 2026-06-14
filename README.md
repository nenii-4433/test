# AuraSound — Single Product Ecommerce Store

A professional single-product ecommerce website built with HTML, CSS, and a lightweight Node.js backend. Includes SafePay payments, order confirmation emails, and an admin dashboard.

## Features

- **Product landing page** — hero, features, reviews, FAQ
- **Secure checkout** — SafePay payment gateway
- **Order confirmation emails** — sent to customer + store owner
- **Admin dashboard** — view all orders, update status, revenue stats
- **Order tracking** — statuses: pending → paid → processing → shipped → delivered

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
copy .env.example .env
```

| Variable | Description |
|---|---|
| `SAFEPAY_PUBLIC_KEY` | Public API key from [SafePay Dashboard](https://getsafepay.com/dashboard) |
| `SAFEPAY_SECRET_KEY` | Secret API key (never share publicly) |
| `SAFEPAY_ENV` | `sandbox` for testing, `production` for live |
| `SMTP_USER` / `SMTP_PASS` | Email credentials (Gmail: use an [App Password](https://myaccount.google.com/apppasswords)) |
| `ADMIN_PASSWORD` | Password for `/admin.html` |
| `STORE_URL` | Your site URL (default: `http://localhost:3000`) |

### 3. Start the server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

- **Store:** http://localhost:3000
- **Checkout:** http://localhost:3000/checkout.html
- **Admin:** http://localhost:3000/admin.html

### 4. Test a payment

Use your SafePay **sandbox** account and test card details from the SafePay dashboard.

## Customize Your Product

Edit the `PRODUCT` object at the top of `server.js`:

```js
const PRODUCT = {
  id: "your-product-id",
  name: "Your Product Name",
  description: "Your product description",
  price: 9999,        // smallest unit (9999 = $99.99 USD)
  currency: "usd",    // "usd" or "pkr"
  image: "/images/product.svg",
};
```

Replace `/public/images/product.svg` with your own product image (PNG/JPG also work).

Update the HTML content in `public/index.html` (features, reviews, FAQ) to match your product.

## Project Structure

```
├── server.js              # Backend API, SafePay, email, orders
├── public/
│   ├── index.html         # Product page
│   ├── checkout.html      # Checkout form
│   ├── success.html       # Order confirmation
│   ├── admin.html         # Admin dashboard
│   ├── css/style.css      # All styles
│   ├── js/                # Frontend scripts
│   └── images/            # Product images
├── data/orders.json       # Order storage (auto-created)
└── .env                   # Your secrets (not committed)
```

## Admin Dashboard

1. Go to `/admin.html`
2. Log in with your `ADMIN_PASSWORD`
3. View all orders, customer details, and revenue
4. Update order status (processing, shipped, delivered, etc.)

## Email Setup (Gmail)

1. Enable 2-Step Verification on your Google account
2. Create an App Password at https://myaccount.google.com/apppasswords
3. Set in `.env`:
   ```
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

## Going Live

1. Switch `SAFEPAY_ENV` from `sandbox` to `production`
2. Replace sandbox keys with production keys from SafePay dashboard
3. Set `STORE_URL` to your production domain
4. Deploy to a host that supports Node.js (Railway, Render, VPS, etc.)
5. Optional: set webhook URL in SafePay dashboard to `https://yourdomain.com/api/safepay/webhook`

## License

MIT
