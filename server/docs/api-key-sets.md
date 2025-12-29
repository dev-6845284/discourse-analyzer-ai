# API Key Sets — Server API Documentation

This document describes the server-side API endpoints for managing API key sets and the per-user reserved keyset (alias = `USERS_KEYSET`). These endpoints are server-only, require authentication, and are intended for administrative usage and per-user keyset management.

Environment variables
- `API_KEYS_SECRET` — AES-GCM secret used to encrypt API keys at rest. If not set, keys are stored plaintext (warning printed on server startup/tests). Set this in production.
- `USERS_KEYSET_ALIAS` — alias name reserved for per-user keysets. Default: `USERS_KEYSET`.

Collections / Models
- `api_key_sets` (model: `ApiKeySet`) — stores named sets of keys (fields: `alias`, `GEMINI_API_KEY`, `GROK_API_KEY`, `CHATGPT_API_KEY`, `createdBy`, `updatedBy`, timestamps). Keys are encrypted before save and decrypted when returned by services.
- `user_api_key_sets` (model: `UserApiKeySet`) — assignment mapping between users and keysets.

Indexing / Uniqueness
- A compound unique index is enforced on `{ alias, createdBy }` so the same alias may exist for different creators (used to allow per-user `USERS_KEYSET`), while preventing duplicates for the same creator.

Security model
- Only authenticated requests are permitted. Admin endpoints require admin privileges.
- The per-user reserved alias `USERS_KEYSET` is special: admins cannot create global keysets with that alias (reserved for user-owned sets). Each user can have at most one `USERS_KEYSET` (uniqueness via `{ alias, createdBy }`).
- Keys are encrypted with `API_KEYS_SECRET` at rest by the service layer. Endpoints will return decrypted key values to authorized callers (so avoid logging/printing responses in untrusted contexts).

Admin endpoints (require admin)

- Purpose: Create/manage global or tenant key sets and assign/unassign them to users.

- GET /api/admin/api-key-sets
  - Purpose: List all keysets.
  - Auth: admin
  - Parameters: none
  - Response: 200 OK — array of keyset objects. Each object contains `_id`, `alias`, `GEMINI_API_KEY`, `GROK_API_KEY`, `CHATGPT_API_KEY`, `createdBy` (ObjectId or null for global), `updatedBy`, `createdAt`, `updatedAt`.
  - Notes: Service decrypts keys before returning.

- GET /api/admin/api-key-sets/available
  - Purpose: List keysets excluding the reserved per-user alias (`USERS_KEYSET`). Useful for UIs that should not show the per-user reserved sets.
  - Auth: admin
  - Parameters: none
  - Response: 200 OK — array of keyset objects (same shape as above) with alias != `USERS_KEYSET`.

- POST /api/admin/api-key-sets
  - Purpose: Create a new keyset.
  - Auth: admin
  - Body (JSON):
    - `alias` (string, required) — friendly name for the set. Must NOT equal `USERS_KEYSET` (reserved).
    - `GEMINI_API_KEY` (string|null)
    - `GROK_API_KEY` (string|null)
    - `CHATGPT_API_KEY` (string|null)
    - `createdBy` (string|null) — ObjectId of creating user or omitted/null for global
  - Response: 201 Created — created keyset object (decrypted keys returned by service).
  - Restrictions: Creating a keyset with alias equal to `USERS_KEYSET` is rejected for admin-created sets. The uniqueness constraint `{ alias, createdBy }` applies.

- GET /api/admin/api-key-sets/:id
  - Purpose: Retrieve a single keyset by id.
  - Auth: admin
  - Path params: `id` — keyset id
  - Response: 200 OK — keyset object or 404 if not found.

- PUT /api/admin/api-key-sets/:id
  - Purpose: Update an existing keyset (alias or keys).
  - Auth: admin
  - Path params: `id`
  - Body (JSON): any of `alias`, `GEMINI_API_KEY`, `GROK_API_KEY`, `CHATGPT_API_KEY`, `updatedBy`.
  - Response: 200 OK — updated keyset object; 404 if not found; 400 if uniqueness violation.
  - Notes: Avoid changing an existing keyset to the reserved `USERS_KEYSET` alias. The service will apply encryption to any provided key fields.

- DELETE /api/admin/api-key-sets/:id
  - Purpose: Delete a keyset and remove any assignments.
  - Auth: admin
  - Path params: `id`
  - Response: 200 OK — delete result (or 404 if missing). Deleting removes related `UserApiKeySet` assignment documents.

- POST /api/admin/api-key-sets/:id/assign
  - Purpose: Assign a keyset to a user (creates a `UserApiKeySet` mapping).
  - Auth: admin
  - Path params: `id` — keyset id
  - Body (JSON):
    - `userId` (string, required)
    - `assignedBy` (string, optional) — admin performing assignment
    - `role` (string, optional) — metadata/role for the assignment
  - Response: 200 OK — assignment object.
  - Restrictions: Duplicate assignments for the same (userId, apiKeySetId) are prevented by a unique index.

- POST /api/admin/api-key-sets/:id/unassign
  - Purpose: Remove an assignment for a user.
  - Auth: admin
  - Body (JSON): `userId` (string)
  - Response: 200 OK — delete result.

User endpoints (self or admin)

- Purpose: Allow each user to create and manage their own reserved keyset (alias `USERS_KEYSET`). Admins may read/update other users' reserved keysets.

- GET /api/users/:id/keyset
  - Purpose: Fetch the user's personal keyset (alias = `USERS_KEYSET`) if present.
  - Auth: authenticated (either the user themself or an admin)
  - Path params: `id` — user id
  - Response: 200 OK — keyset object (decrypted keys) or `null` if no per-user keyset exists.
  - Restrictions: Only the user themself or an admin can call this endpoint.

- PUT /api/users/:id/keyset
  - Purpose: Create or update the user's personal keyset (alias = `USERS_KEYSET`). This is an upsert: if a per-user `USERS_KEYSET` exists it will be updated; otherwise created.
  - Auth: authenticated (user themself or admin)
  - Path params: `id` — user id (target user)
  - Body (JSON): any of `GEMINI_API_KEY`, `GROK_API_KEY`, `CHATGPT_API_KEY` (strings or null)
  - Response: 200 OK — the created/updated keyset object (decrypted keys).
  - Behavior & Restrictions:
    - The service enforces a single `USERS_KEYSET` per user via the compound unique index `{ alias, createdBy }` where `alias === USERS_KEYSET` and `createdBy === userId`.
    - Only the user themself or an admin may create/update. Admins cannot create a global (createdBy=null) keyset with alias `USERS_KEYSET`.

Examples

Create a new admin keyset (admin):

POST /api/admin/api-key-sets
Body:
{
  "alias": "global-gemini",
  "GEMINI_API_KEY": "sk-xxxxx",
  "GROK_API_KEY": null,
  "CHATGPT_API_KEY": null
}

Response 201:
{
  "_id": "64123...",
  "alias": "global-gemini",
  "GEMINI_API_KEY": "sk-xxxxx",
  "GROK_API_KEY": null,
  "CHATGPT_API_KEY": null,
  "createdBy": null,
  "createdAt": "2025-12-29T...",
  "updatedAt": "2025-12-29T..."
}

User upsert of personal keyset:

PUT /api/users/507f1f77bcf86cd799439011/keyset
Body:
{
  "GEMINI_API_KEY": "sk-user-...",
  "GROK_API_KEY": "",
  "CHATGPT_API_KEY": null
}

Response 200:
{
  "_id": "641ab...",
  "alias": "USERS_KEYSET",
  "GEMINI_API_KEY": "sk-user-...",
  "GROK_API_KEY": "",
  "CHATGPT_API_KEY": null,
  "createdBy": "507f1f77bcf86cd799439011",
  "createdAt": "2025-12-29T...",
  "updatedAt": "2025-12-29T..."
}

Operational notes for implementers
- Ensure `API_KEYS_SECRET` is provisioned in production to avoid storing plain keys.
- For UI: avoid rendering API key plaintext unless strictly necessary; treat returned key values as sensitive and restrict UX and logs accordingly.
- Consider adding audit logging for create/update/delete/assign operations involving key material.
- Tests: service-level tests should cover `upsertUserKeyset` behavior and uniqueness enforcement, and route-level tests should validate auth restrictions (these tests were added in `server/routes/__tests__/usersKeyset.test.ts`).

If you want, I can also add a short OpenAPI/Swagger spec for these endpoints or add example cURL commands for each endpoint.
