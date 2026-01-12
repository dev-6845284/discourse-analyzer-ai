# Bug Fix: Google Sign-In Client ID Not Found

## Issues Identified
- **Redundant GSI Initialization**: The application tries to initialize Google Sign-In even when the user is already logged in, because a `googleButtonRef` exists in the `Header`.
- **Missing Environment Variable**: The error `The given client ID is not found` is triggered because `GOOGLE_CLIENT_ID` defaults to `'missing-client-id'` when `VITE_GOOGLE_CLIENT_ID` is not provided in `.env`.
- **Logic Flaw in `useAuth`**: The initialization effect does not check if the user is already authenticated.

## Proposed Changes
1. **`src/hooks/useAuth.ts`**: 
    - Add a check for `'missing-client-id'` before initializing Google.
    - Only attempt initialization if `user` is `null`.
    - Log a warning if the client ID is missing instead of letting Google's library throw an error.
2. **`src/components/layout/Header.tsx`**:
    - Remove the unused `googleButtonRef` div. A logged-in user does not need a Google login button in their dashboard header.
3. **`src/config/app.config.ts`**: (Optional but good)
    - Clarify the fallback logic.

## Verification Plan
- Check console for `[GSI_LOGGER]` errors.
- Verify that Google Login still works on the Login screen (assuming a valid ID is eventually provided).
- Verify that no Google initialization occurs once logged in.
