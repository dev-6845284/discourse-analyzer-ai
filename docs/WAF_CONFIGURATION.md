# 🛡️ Edge Protection & WAF Configuration Guide

Since your application is hosted on Vercel/Cloudflare, "Edge Protection" involves configuring the firewall rules in your provider's dashboard to block attacks *before* they reach your Node.js server.

## 1. Cloudflare WAF (Recommended)
If you are proxying your domain through Cloudflare:

1.  **Go to Security > WAF > Custom Rules**.
    *   *Note: The **Free Plan** includes 5 active custom rules, which is enough for basic protection.*
2.  **Create a Rule: "Block High Risk Bots"**.
    *   **Field:** `Threat Score` (or `Verified Bot` status if available on your plan)
    *   **Action:** `Managed Challenge`
    *   *Alternative for Free Plan:* Go to **Security > Bots** and enable **"Bot Fight Mode"**. This is a one-click free protection.
3.  **Create a Rule: "Block Bad Countries"** (Optional).
    *   If you only expect traffic from specific regions, Challenge or Block others.

## 2. Vercel Firewall (If using Vercel Security)
1.  **Go to Project Settings > Security > Attack Mode**.
    *   Enable **"Attack Mode"** (Under Maintenance) if you are currently under heavy attack.
2.  **Firewall Rules** (Enterprise/Pro only):
    *   Block specific IP ranges or User Agents.

## 3. Rate Limiting at Edge
*   **Cloudflare:** Go to **Security > WAF > Rate Limiting**.
    *   Rule: If > 100 requests per 1 minute from same IP -> **Block** for 1 hour.
    *   *Note: This is cheaper/faster than doing it in Redis.*

## 4. Environment Variables Checklist
Ensure these are set in your Vercel/Cloudflare environment:
*   `TURNSTILE_SECRET_KEY`: For the CAPTCHA implementation we just added.
*   `VITE_TURNSTILE_SITE_KEY`: Public key for the frontend.
