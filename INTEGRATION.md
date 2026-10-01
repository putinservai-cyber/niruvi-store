# Niruvi Store Integration Guide

This document explains the payment gateways, desktop protocol bridge, and database configuration for the Niruvi Linux Store.

---

## 1. Payments & Sponsorship Architecture

### A. Razorpay (India Standard Gateway)
- **Supported Methods:** UPI Instant, RuPay/Visa/Mastercard cards, NetBanking (50+ Indian banks), and Wallets.
- **Backend Endpoints:**
  - `POST /api/razorpay/create-order` - Generates an order ID on the server.
  - `POST /api/razorpay/verify-payment` - Cryptographically validates payment signature (HMAC-SHA256) & issues lifetime license keys, immediately upgrading the user account to Pro Developer.
  - `POST /api/license/activate` - Validates and binds a license key to the authenticated account.
  - `POST /api/razorpay/webhook` - Handles server-to-server asynchronous capture events with signature verification.
- **Environment Variables (Optional):**
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  *(If keys are omitted, the app operates in safe demonstration mode with instant fallback).*

### B. UPI Instant (0% Fees)
- Direct VPA: `putinservai@oksbi`
- Native support for Google Pay, PhonePe, Paytm, BHIM, CRED, and Navi via `upi://pay` deep links and QR codes.

### C. Ko-fi & International Sponsorship
- Direct Profile: `https://ko-fi.com/putinservai`
- Accepts cards, PayPal, Apple Pay, and Google Pay worldwide.

---

## 2. Linux Desktop Protocol (`niruvi://`)

Niruvi Store communicates with the native Linux desktop client using registered MIME protocol handlers.

### Protocol Command Structure:
```bash
niruvi://install/<app-id>?version=<version>&sha256=<checksum>&url=<download-url>
```

### Protocol Registration (`~/.local/share/applications/niruvi-handler.desktop`):
```ini
[Desktop Entry]
Name=Niruvi Protocol Handler
Exec=/usr/bin/niruvi --handle-uri=%u
Type=Application
Terminal=false
MimeType=x-scheme-handler/niruvi;
```

---

## 3. SHA-256 Checksum Verification

Every AppImage in the Niruvi catalog includes a SHA-256 cryptographic signature. Users can verify downloaded packages directly in the web UI via the **SHA-256 Verifier** tool or in the Linux terminal:

```bash
sha256sum <Downloaded-AppImage-File>.AppImage
```
