# GEMINI.md — Terminal / Shell Guide

This file is auto-loaded by the Gemini CLI. It explains how to run terminal
commands in this repo on this Windows + PowerShell machine without crashing.

## The problem you keep hitting

A global environment variable `SSLKEYLOGFILE` is set to an invalid path
(`\\?\Volume{...}`). Both **conda's PowerShell startup hook** and **Node.js**
read this variable. When they try to open that path for TLS key logging they
throw a `PermissionError`, which is why your shell startup and `npm` commands
crash before they even begin.

You do **not** need conda to run `npm`, `node`, `tsc`, `vite`, or `git`.

## Fix it once (recommended)

Remove the bad variable so every new shell is clean:

```powershell
[Environment]::SetEnvironmentVariable('SSLKEYLOGFILE', $null, 'User')
# Machine scope needs an elevated (admin) PowerShell:
[Environment]::SetEnvironmentVariable('SSLKEYLOGFILE', $null, 'Machine')
```

Then open a **new** terminal. Confirm it is gone:

```powershell
$env:SSLKEYLOGFILE        # should print nothing
[Environment]::GetEnvironmentVariable('SSLKEYLOGFILE','User')      # nothing
[Environment]::GetEnvironmentVariable('SSLKEYLOGFILE','Machine')   # nothing
```

## Fix it per-session (if you can't change the global var)

Prepend this to any command. It clears the variable for the current process only:

```powershell
$env:SSLKEYLOGFILE=$null; npm install
```

## Running commands in this repo

- **Frontend** lives at the repo root: `c:\dev\apps\discourse-analyzer-ai`
- **Backend** lives at: `c:\dev\apps\discourse-analyzer-ai\server`

```powershell
# Frontend
$env:SSLKEYLOGFILE=$null; Set-Location 'c:\dev\apps\discourse-analyzer-ai'; npm run dev

# Backend
$env:SSLKEYLOGFILE=$null; Set-Location 'c:\dev\apps\discourse-analyzer-ai\server'; npm run dev
```

## Gotchas

- `npm audit` and `npm outdated` **exit with a non-zero code when they find
  something**. That is normal output, not a failure. If a tool treats non-zero
  as an error (e.g. when chaining commands in parallel), append `; exit 0`:

  ```powershell
  $env:SSLKEYLOGFILE=$null; npm outdated; exit 0
  ```

- PowerShell syntax, not bash: use `$env:VAR` (not `$VAR`), `$null` (not
  `/dev/null`), and backtick `` ` `` for line continuation.
- Quote any path containing spaces with double quotes.
- Do **not** `conda activate` just to run npm/node — it is unnecessary here and
  is the thing that crashes.
