# Security Implementation Roadmap: Edge Protection & Smart CAPTCHA

This document outlines the steps to implement **Edge Protection (WAF)** and **Smart CAPTCHA (Cloudflare Turnstile)** for the Discourse Analyzer AI application.

## 1. Edge Protection (Cloudflare WAF)

**Goal:** Filter out malicious traffic, botnets, and DDoS attacks at the network edge before they reach your Vercel server.

### 1.1. Prerequisite: Cloudflare Setup
Since the application is hosted on Vercel, putting Cloudflare in front requires a specific DNS configuration (Vercel supports this via "CNAME flattening" or standard proxying).

1.  **Create Cloudflare Account:** (If not already done).
2.  **Add Site:** Add your domain (e.g., `pasitikrink.org`) to Cloudflare.
3.  **Update Nameservers:** Change your domain registrar's nameservers to the ones provided by Cloudflare.
4.  **DNS Configuration:**
    *   Ensure the `A` or `CNAME` records pointing to Vercel are set to **Proxied** (Orange Cloud icon).
    *   *Note:* Ensure your SSL/TLS encryption mode in Cloudflare is set to **Full (Strict)** to avoid redirect loops with Vercel's SSL.

### 1.2. Configure WAF Rules
Once proxied, configure the Web Application Firewall (WAF) to block threats.

*   **Bot Fight Mode (Free/Pro):**
    *   Go to **Security > Bots**.
    *   Enable **Bot Fight Mode**. This automatically challenges requests matching known bot patterns.

*   **Custom WAF Rules (Security > WAF > Custom Rules):**
    *   **Rule 1: Block High Risk Countries** (Optional, if your userbase is localized).
        *   *Expression:* `(ip.geoip.country in {"RU" "CN" "KP" ...})`
        *   *Action:* Block or Managed Challenge.
    *   **Rule 2: Protect Login Endpoints**
        *   *Expression:* `(http.request.uri.path contains "/api/login") and (cf.threat_score > 10)`
        *   *Action:* Managed Challenge.
        *   *Why:* Adds an extra verification layer for any suspicious traffic attempting authentication.
    *   **Rule 3: Rate Limiting (WAF)**
        *   If available (Pro plan), set a rate limit on `/api/*` to block IPs exceeding X requests per minute globally.

---

## 2. Smart CAPTCHA (Cloudflare Turnstile)

**Goal:** Prevent automated credential stuffing and bot signups on your application endpoints.

### 2.1. Cloudflare Setup
1.  Go to **Turnstile** in the Cloudflare Dashboard.
2.  **Add Site:**
    *   **Site Name:** Discourse Analyzer AI
    *   **Domain:** Your domain (plus `localhost` for development).
    *   **Widget Mode:** `Managed` (Recommended - invisible for most users, shows challenge if suspicious).
3.  **Get Keys:** Copy the **Site Key** (Public) and **Secret Key** (Private).

### 2.2. Frontend Implementation (React)
Integrate the widget into your login forms (`Login.tsx` or similar).

1.  **Install Wrapper:**
    ```bash
    npm install @marsidev/react-turnstile
    ```
2.  **Update Login Page:**
    *   Add the recommended verification component.
    *   Store the generated `token` in state.
    *   Pass this `token` to your login function.

**Mockup:**
```tsx
import { Turnstile } from '@marsidev/react-turnstile';

const Login = () => {
  const [captchaToken, setCaptchaToken] = useState('');

  const handleLogin = async () => {
    if (!captchaToken) return alert('Please complete the check');
    await api.login({ email, password, captchaToken });
  };

  return (
    <form>
       {/* inputs... */}
       <Turnstile 
          siteKey="YOUR_SITE_KEY" 
          onSuccess={(token) => setCaptchaToken(token)} 
       />
       <button onClick={handleLogin}>Login</button>
    </form>
  );
};
```

### 2.3. Backend Implementation (Express)
Verify the token before processing the login request in `server/index.ts`.

1.  **Add Environment Variable:**
    *   Add `TURNSTILE_SECRET_KEY` to your `.env` and Vercel Environment Variables.
2.  **Create Verification Utility:**
    *   Calls `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
3.  **Update Login Endpoints:**
    *   Modify `/api/login` and `/api/login/password`.
    *   Check for `req.body.captchaToken`.
    *   If missing or invalid -> fast fail (400 Bad Request).

**Code Snippet (Backend):**
```typescript
async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = await result.json();
  return data.success; // true/false
}
```

---

## 3. Deployment Checklist

- [ ] **DNS:** Switch nameservers to Cloudflare.
- [ ] **Env Vars:** Set `VITE_TURNSTILE_SITE_KEY` (frontend) and `TURNSTILE_SECRET_KEY` (backend).
- [ ] **Dev Test:** Verify Turnstile works on `localhost` (ensure `localhost` is in allowed domains in Cloudflare).
- [ ] **Prod Test:** Verify login flows flow smoothly without challenges for legitimate users.
- [ ] **Monitor:** Watch Cloudflare Security Dashboard for blocked threats.
