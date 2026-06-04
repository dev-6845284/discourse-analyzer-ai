# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Frontend dev server (port 3000, proxies /api → :3001)
npm run dev

# Backend dev server (port 3001)
cd server && npm run start
```

### Testing
```bash
# Frontend tests only
npm run test:frontend

# Backend tests only
npm run test:server

# Run a single frontend test file
npx jest --config=jest.config.frontend.js src/hooks/__tests__/useAppController.test.tsx

# Run a single backend test file
cd server && npx jest src/services/__tests__/quoteService.test.ts
```

### Build & Migrations
```bash
# Build (runs DB migrations first, then Vite)
npm run build

# Run DB migrations standalone
npm run migrate:deploy

# Create a new migration
cd server && npm run migrate:create -- <migration-name>
```

## Architecture

This is a full-stack TypeScript app: a React/Vite frontend (port 3000) and an Express backend (port 3001). Vite proxies all `/api` requests to the backend in development.

### Frontend: Hook-based architecture

All application logic lives in `src/hooks/`. Components are thin wrappers that call hooks and render UI.

**Central orchestration hook:** `src/hooks/useAppController.ts` — composes all other hooks and exposes the full app state to `App.tsx`. This is the first file to read when tracing any feature end-to-end.

**Key hooks:**
- `useAuth.ts` — Google Sign-In + JWT session management
- `useQuoteActions.ts` — analyze, improve, save, delete a quote
- `useQuoteExtraction.ts` — extract quotes from URL/text
- `useTranscriptAnalysis.ts` — multi-stage transcript analysis orchestration
- `useTranscriptViewer.ts` — transcript viewer UI state
- `useUIState.ts` — modal and panel open/close state

**API layer:** All HTTP calls go through `src/utils/api.ts`. Add new calls there, not inline in hooks.

**State flow:** User action → hook handler → `api.ts` → Express route → service → MongoDB/LLM. Return data flows back through hook state into components.

### Backend: Service-oriented Express

Routes in `server/routes/` are thin — they validate auth/role, call a service, and return the result. Business logic belongs in `server/services/`.

**LLM abstraction:** `server/llm_services/` contains one service file per provider (Gemini, ChatGPT/OpenAI, Grok, Agentic). Prompts are organized by task under `server/llm_services/prompts/<task>/`. When adding or modifying LLM behavior, edit the prompt files — not the service files unless the calling contract changes.

**API keys:** Stored in MongoDB (not env vars) and fetched per-request via `server/services/apiKeyService.ts`. The `GEMINI_API_KEY` env var is a fallback for local dev only.

**RBAC:** Every route checks `req.user.role` against permissions stored in MongoDB. New endpoints must be registered in the DB on startup (see `server/index.ts` startup logic) and assigned a minimum role.

### Internationalization

Custom React Context in `src/i18n/`. Two languages: English (`en.ts`) and Lithuanian (`lt.ts`, default). Use the `useI18n()` hook and its `t()` function everywhere user-visible strings appear. Never hardcode UI strings directly in components. When adding new strings, add the key to both `en.ts` and `lt.ts` simultaneously.

### Types

All shared TypeScript types are in `src/types.ts`. The codebase has a legacy/new type split:
- **Legacy** (`AnalysisCategory`, `AnalysisResult`, `AnalysisDetail`) — kept for DB migration compatibility, marked `@deprecated`
- **Current** (`AuditCategory`, `AuditResult`, `StrictAuditResult`, `FlawsResult`) — use these for new code

`Quote.person` can be either a string ID or a full `Person` object depending on whether it was populated by the backend. Always handle both shapes.

### Component organization

`src/components/` is organized by feature domain: `admin/`, `quotes/`, `transcript/`, `public/`, `modals/`, `ui/`. The `ui/` folder is for truly reusable primitives. Feature-specific sub-components live in a subdirectory named after the parent component (e.g., `transcript/TranscriptViewer/`).

`QuoteCard` sub-components live in `src/components/quotes/QuoteCardParts/` (not the old `QuoteCard/` subdirectory which has been removed).

### Data persistence boundary

- **MongoDB** — quotes, persons, users, sessions, API keys, RBAC permissions, logs
- **Redis** — rate limiting, session cache, public quotes cache
- **localStorage** — UI preferences, language selection, draft transcript/analysis state
- `src/utils/analysisStorage.ts` and `src/utils/transcriptStorage.ts` own the localStorage keys for analysis data

### Auth flow

1. Login: Google Sign-In → `POST /api/auth/google` → JWT issued as httpOnly cookie
2. Every subsequent request: JWT verified by Express middleware → `req.user` populated
3. Frontend: `useAuth.ts` reads the user from `/api/auth/me` on mount; Google GSI is only initialized when `user` is null
