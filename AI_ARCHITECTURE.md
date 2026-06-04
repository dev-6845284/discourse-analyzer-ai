# AI Development Architecture Guide

## Project Overview
**Discourse Analyzer AI** is a full-stack TypeScript application composed of a React/Vite frontend and an Express/Node.js backend. The application relies heavily on MongoDB for state persistence, including user sessions, permissions, and app content. The core function of the app is analyzing and extracting quotes and transcripts using various LLM providers.

---

## High-Level Architecture
- **Frontend**: React 19, Vite, TailwindCSS (v4), custom hook-based state management.
- **Backend**: Express 5, Node.js, MongoDB (via Mongoose), Redis (for caching and rate limiting).
- **Authentication**: Google Sign-In with JWT, persisted sessions in MongoDB using `connect-mongo`.
- **LLM Integrations**: Gemini, OpenAI/ChatGPT, Grok, and a unified Agentic Service.

---

## Frontend Architecture (`src/`)

### 1. State Management & Hooks
The frontend follows a strictly modular hook-based architecture.
- **Orchestration**: `useAppController.ts` acts as the primary brain, composing other hooks and exposing state to `App.tsx`.
- **Domain Hooks**: Logic is broken down into specific hooks like `useAuth.ts`, `useQuoteActions.ts`, `useTranscriptAnalysis.ts`, `useQuoteExtraction.ts`.
- **API Layer**: All external network requests are centralized in `src/utils/api.ts`. No inline fetch/axios calls in components or hooks.

### 2. UI Components
Organized functionally under `src/components/`:
- `admin/`: Admin panels and settings.
- `quotes/`: Displaying and interacting with quotes (e.g., `QuoteCardParts`).
- `transcript/`: Transcript viewers and analysis results.
- `ui/`: Reusable, generic UI primitives (buttons, modals, form inputs).

### 3. Internationalization (i18n)
- A custom React context manages translations.
- Core languages: English (`en.ts`) and Lithuanian (`lt.ts` - Default).
- String usage: Never hardcode UI text. Always use the `t()` function from `useI18n()`.

---

## Backend Architecture (`server/`)

### 1. Express & Routing (`server/routes/`)
Routes are "thin" controllers. Their responsibility is strictly:
- Route matching and parameter extraction.
- Checking Authentication and Role-Based Access Control (RBAC).
- Delegating work to `server/services/`.

### 2. Business Logic & Services (`server/services/`)
- Contains all non-LLM business logic (e.g., DB querying, user management, API key management).
- `apiKeyService.ts` fetches API keys dynamically from MongoDB per request, rather than relying on environment variables (except in local fallback dev).

### 3. LLM Abstraction (`server/llm_services/`)
Central to the application's AI capabilities:
- **Providers**: `geminiService.ts`, `chatGptService.ts`, `grokService.ts`, `agenticService.ts`.
- **Prompts**: Managed as separate files under `server/llm_services/prompts/<task>/`. **Rule:** Modify prompt files to change AI behavior, avoid touching the service code unless API contracts change.

### 4. Data Models (`server/models/`)
Mongoose schemas define the MongoDB collections:
- `Quote.ts`, `Person.ts`, `ContentAnalysis.ts`: Core application data.
- `User.ts`, `AnalysisSession.ts`, `ApiKeySet.ts`, `ApiPermission.ts`: Authentication, configuration, and state.

---

## Data & Persistence Boundaries

1. **MongoDB**: Primary database. Holds users, quotes, permissions, sessions (via `connect-mongo`), logs, and API keys.
2. **Redis**: Ephemeral store used for:
   - Rate limiting endpoints.
   - API caching (e.g., public quotes cache).
3. **localStorage**: Used purely on the client for UI preferences, language selections, and saving unsaved text drafts (via `transcriptStorage.ts` and `analysisStorage.ts`).

---

## AI Agent Development Guidelines

When building or modifying features as an AI agent, adhere to the following rules:

### Modifying the Frontend
- **Do not bloated `App.tsx`**: Add new global state or logic into domain-specific hooks and compose them in `useAppController.ts`.
- **No inline API calls**: Add new endpoints to `src/utils/api.ts`.
- **Localization**: Add new strings to both `src/i18n/en.ts` and `src/i18n/lt.ts`. Do not skip the Lithuanian translation.
- **Component Placement**: Put business-specific components in their respective domain folder. Put fully generic components in `src/components/ui/`.

### Modifying the Backend
- **Keep Routes Thin**: Routes should only handle HTTP req/res mapping and auth checks. Put logic in `server/services/`.
- **Prompt Engineering**: Do not put long string literals for prompts inside service files. Store them in `server/llm_services/prompts/`.
- **Testing**:
  - Run frontend tests: `npm run test:frontend`
  - Run backend tests: `npm run test:server`
- **Database Schema Changes**: If you modify a mongoose model, determine if a database migration script is necessary (located in `server/migrations/`) and create it via `npm run migrate:create -- <name>`.

### Authentication & Permissions
- All incoming requests contain a JWT cookie which populates `req.user`.
- Ensure new endpoints have appropriate RBAC permission checks at the route level. New endpoints must be registered and assigned a minimum role.
