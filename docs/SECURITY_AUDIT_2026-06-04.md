# Dependency Security Audit — 2026-06-04

Captured via `npm audit` and `npm outdated` in the frontend (repo root) and
backend (`server/`). Run with `SSLKEYLOGFILE` cleared (see `GEMINI.md`).

## Summary

| Scope | Vulnerabilities | Critical | High | Moderate | Low |
|---|---|---|---|---|---|
| Frontend (root) | 12 | 1 | 6 | 5 | 0 |
| Backend (`server/`) | 13 | 1 | 4 | 7 | 1 |

Nearly all are fixable with a plain `npm audit fix` (no breaking changes).
The only `--force` case is frontend `uuid` (would jump to v14, breaking).

---

## Frontend — `npm audit` (12: 1 critical, 6 high, 5 moderate)

| Package | Severity | Issue | Fix |
|---|---|---|---|
| handlebars 4.0.0–4.7.8 | **critical** | JS injection / prototype pollution / DoS (multiple CVEs) | `npm audit fix` |
| axios 1.0.0–1.15.2 | high | SSRF, prototype pollution, CRLF/header injection, DoS (many CVEs) | `npm audit fix` |
| vite ≤6.4.1 | high | Path traversal + arbitrary file read via dev server WS | `npm audit fix` |
| rollup 4.0.0–4.58.0 | high | Arbitrary file write via path traversal | `npm audit fix` |
| minimatch ≤3.1.3 / 9.0.0–9.0.6 | high | ReDoS | `npm audit fix` |
| picomatch ≤2.3.1 / 4.0.0–4.0.3 | high | Method injection + ReDoS | `npm audit fix` |
| @babel/plugin-transform-modules-systemjs 7.12.0–7.29.0 | high | Arbitrary code generation | `npm audit fix` |
| brace-expansion | moderate | DoS (zero-step sequence) | `npm audit fix` |
| follow-redirects ≤1.15.11 | moderate | Auth header leak on cross-domain redirect | `npm audit fix` |
| postcss <8.5.10 | moderate | XSS via unescaped `</style>` | `npm audit fix` |
| uuid <11.1.1 | moderate | Missing buffer bounds check (v3/v5/v6) | `npm audit fix --force` (→ uuid@14, breaking) |
| ws 8.0.0–8.20.0 | moderate | Uninitialized memory disclosure | `npm audit fix` |

## Backend (`server/`) — `npm audit` (13: 1 critical, 4 high, 7 moderate, 1 low)

| Package | Severity | Issue | Fix |
|---|---|---|---|
| handlebars 4.0.0–4.7.8 | **critical** | JS injection / prototype pollution / DoS | `npm audit fix` |
| mongoose 8.0.0–8.22.0 | high | NoSQL injection via `$nor` in `sanitizeFilter` | `npm audit fix` |
| path-to-regexp 8.0.0–8.3.0 | high | ReDoS (optional groups / multiple wildcards) | `npm audit fix` |
| minimatch ≤3.1.3 / 9.0.0–9.0.6 | high | ReDoS | `npm audit fix` |
| picomatch ≤2.3.1 / 4.0.0–4.0.3 | high | Method injection + ReDoS | `npm audit fix` |
| bn.js <4.12.3 | moderate | Infinite loop | `npm audit fix` |
| brace-expansion | moderate | DoS (zero-step sequence) | `npm audit fix` |
| follow-redirects ≤1.15.11 | moderate | Auth header leak on cross-domain redirect | `npm audit fix` |
| qs 6.7.0–6.15.1 | moderate | DoS (arrayLimit bypass / stringify crash) | `npm audit fix` |
| uuid <11.1.1 | moderate | Missing buffer bounds check | `npm audit fix` |
| ws 8.0.0–8.20.0 | moderate | Uninitialized memory disclosure | `npm audit fix` |
| yauzl 3.2.0 | moderate | Off-by-one error | `npm audit fix` |
| diff 4.0.0–4.0.3 | low | DoS in parsePatch/applyPatch | `npm audit fix` |

---

## Frontend — `npm outdated`

Current → Wanted → Latest. **Bold Latest = major (breaking) jump.**

| Package | Current | Wanted | Latest |
|---|---|---|---|
| @babel/core | 7.28.5 | 7.29.7 | 7.29.7 |
| @babel/preset-env | 7.28.5 | 7.29.7 | 7.29.7 |
| @google/genai | 1.29.0 | 1.52.0 | **2.8.0** |
| @tailwindcss/vite | 4.1.18 | 4.3.0 | 4.3.0 |
| @testing-library/react | 16.3.1 | 16.3.2 | 16.3.2 |
| @types/node | 22.19.0 | 22.19.19 | **25.9.1** |
| @types/react | 19.2.5 | 19.2.16 | 19.2.16 |
| @types/uuid | 8.3.4 | 8.3.4 | **10.0.0** |
| @vitejs/plugin-react | 5.1.0 | 5.2.0 | **6.0.2** |
| autoprefixer | 10.4.23 | 10.5.0 | 10.5.0 |
| axios | 1.13.2 | 1.17.0 | 1.17.0 |
| babel-jest | 30.2.0 | 30.4.1 | 30.4.1 |
| jest | 30.2.0 | 30.4.2 | 30.4.2 |
| jest-environment-jsdom | 30.2.0 | 30.4.1 | 30.4.1 |
| lucide-react | 0.554.0 | 0.554.0 | **1.17.0** |
| postcss | 8.5.6 | 8.5.15 | 8.5.15 |
| react | 19.2.0 | 19.2.7 | 19.2.7 |
| react-dom | 19.2.0 | 19.2.7 | 19.2.7 |
| react-turnstile | 1.1.4 | 1.1.5 | 1.1.5 |
| tailwindcss | 4.1.18 | 4.3.0 | 4.3.0 |
| ts-jest | 29.4.6 | 29.4.11 | 29.4.11 |
| typescript | 5.8.3 | 5.8.3 | **6.0.3** |
| uuid | 8.3.2 | 8.3.2 | **14.0.0** |
| vite | 6.4.1 | 6.4.3 | **8.0.16** |

## Backend (`server/`) — `npm outdated`

| Package | Current | Wanted | Latest |
|---|---|---|---|
| @types/express | 5.0.5 | 5.0.6 | 5.0.6 |
| @types/express-session | 1.18.2 | 1.19.0 | 1.19.0 |
| @types/jsdom | 27.0.0 | 27.0.0 | **28.0.3** |
| @types/node | 24.10.1 | 24.13.0 | **25.9.1** |
| @types/supertest | 6.0.3 | 6.0.3 | **7.2.0** |
| connect-redis | 7.1.1 | 7.1.1 | **9.0.0** |
| cors | 2.8.5 | 2.8.6 | 2.8.6 |
| dotenv | 17.2.3 | 17.4.2 | 17.4.2 |
| express | 5.1.0 | 5.2.1 | 5.2.1 |
| express-rate-limit | 7.5.1 | 7.5.1 | **8.5.2** |
| express-session | 1.18.2 | 1.19.0 | 1.19.0 |
| google-auth-library | 10.5.0 | 10.6.2 | 10.6.2 |
| groq-sdk | 0.35.0 | 0.35.0 | **1.2.1** |
| helmet | 8.1.0 | 8.2.0 | 8.2.0 |
| ioredis | 5.8.2 | 5.11.0 | 5.11.0 |
| jest | 30.2.0 | 30.4.2 | 30.4.2 |
| jsdom | 24.1.3 | 24.1.3 | **28.1.0** |
| migrate-mongo | 12.1.3 | 12.1.3 | **14.0.7** |
| mongodb-memory-server | 10.4.3 | 10.4.3 | **11.2.0** |
| mongoose | 8.20.0 | 8.24.0 | **9.6.3** |
| openai | 6.9.0 | 6.42.0 | 6.42.0 |
| rate-limit-redis | 4.3.1 | 4.3.1 | **5.0.0** |
| supertest | 7.1.4 | 7.2.2 | 7.2.2 |
| ts-jest | 29.4.5 | 29.4.11 | 29.4.11 |
| typescript | 5.9.3 | 5.9.3 | **6.0.3** |
| uuid | 11.0.5 | 11.1.1 | **14.0.0** |

---

## Suggested remediation order

1. **`npm audit fix`** in both root and `server/` — clears nearly every CVE
   above with no breaking changes. Re-run `npm audit` to confirm.
2. Apply the safe minor bumps (`npm update`) — axios, react/react-dom,
   tailwindcss, jest, postcss (frontend); express, openai, helmet, ioredis,
   dotenv (backend).
3. Stage major bumps in **separate PRs**, each tested independently:
   - Frontend: vite 8, uuid 14, typescript 6, @google/genai 2, @vitejs/plugin-react 6, lucide-react 1.
   - Backend: mongoose 9, groq-sdk 1, connect-redis 9, express-rate-limit 8, migrate-mongo 14, uuid 14, typescript 6.
