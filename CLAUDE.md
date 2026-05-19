# Oseka Card — Claude Code Reference

## Project Overview

A Next.js + Payload CMS monorepo that lets users register as clients and receive a
public profile page plus auto-generated digital wallet passes (Apple Wallet `.pkpass`
and Google Wallet JWT deep-link). A QR code on each pass links to the public profile.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| CMS / Backend | Payload CMS 3.x (embedded in Next.js) |
| Database | PostgreSQL via **Neon** (serverless) |
| DB Adapter | `@payloadcms/db-postgres` |
| Apple Wallet | `passkit-generator` v3 |
| Google Wallet | `jsonwebtoken` — RS256 signed JWT |
| QR Codes | `qrcode` |
| Language | TypeScript (strict) |
| Package Manager | pnpm |

---

## Directory Structure

```
src/
├── app/
│   ├── (frontend)/
│   │   ├── profile/[id]/page.tsx   ← public profile page (SSR, no auth)
│   │   └── dashboard/page.tsx      ← protected client dashboard
│   ├── (payload)/
│   │   └── admin/…                 ← Payload admin UI (auto-generated)
│   └── api/
│       └── wallet/
│           ├── apple/[id]/route.ts ← serves .pkpass download
│           └── google/[id]/route.ts← redirects to Google Wallet save URL
├── collections/
│   ├── Users.ts                    ← Payload auth collection (admin login)
│   ├── Profiles.ts                 ← main client profile collection
│   └── Media.ts                    ← file uploads
├── hooks/
│   └── afterCreateProfile.ts       ← fires on profile create; generates wallet passes
├── lib/
│   ├── qr.ts                       ← QR buffer helper
│   └── wallet/
│       ├── apple.ts                ← PKPass assembler
│       └── google.ts               ← Google Wallet JWT builder
├── components/
│   └── WalletButtons.tsx           ← client component with Apple/Google buttons
└── payload.config.ts               ← Payload root config

wallet-assets/
├── certificates/                   ← gitignored; see README.md for cert setup
│   └── README.md
└── pass-template/                  ← icon.png, icon@2x.png, logo.png, logo@2x.png
```

---

## Collections

### `Users` (`src/collections/Users.ts`)
- Payload's built-in auth collection. Grants access to the admin panel.
- Do not add extra fields here — client profile data lives in `Profiles`.

### `Profiles` (`src/collections/Profiles.ts`)
- Core collection. One record per client.
- Public read access (`read: () => true`) so `/profile/[id]` works without auth.
- `afterChange` hook → `afterCreateProfile` runs **on create only**.

**Shared fields (all roles):**
- `uniqueQrToken` — UUID, auto-generated, used for QR tracking
- `walletPassUrl` — relative path to `.pkpass` in `/public/passes/`
- `googleWalletUrl` — Google Wallet save URL (JWT-based)
- `fullName`, `email`, `phone`, `avatar`

**Role selector:**
```
role: 'admin' | 'client_type_a' | 'client_type_b'
```

**Conditional field groups** (use `admin.condition` to gate by role):
- `individualProfile` — shown when `role === 'client_type_a'` (jobTitle, bio, skills, links)
- `businessProfile` — shown when `role === 'client_type_b'` (companyName, address, taxId, …)

**To add a new role:**
1. Add the value to the `role` select options array.
2. Add a new group field with `admin: { condition: (data) => data?.role === 'your_new_role' }`.
No migration is needed for existing roles.

### `Media` (`src/collections/Media.ts`)
- Standard upload collection. Referenced by `Profiles.avatar`.

---

## Wallet Generation Flow

```
POST /api/profiles (Payload REST) or admin panel create
        │
        └─► afterCreateProfile hook (afterChange, operation === 'create')
                │
                ├─► generateApplePass()        → writes public/passes/<id>.pkpass
                │     returns null if certs missing (graceful stub)
                │
                ├─► generateGoogleWalletUrl()  → builds Google Wallet save URL
                │     returns null if env vars missing (graceful stub)
                │
                └─► payload.update() writes walletPassUrl + googleWalletUrl back to record
```

### Apple Wallet (`src/lib/wallet/apple.ts`)
- Uses `passkit-generator` v3 (`new PKPass(files, certs, overrides)`).
- Reads certs from `wallet-assets/certificates/` (signerCert.pem, signerKey.pem, wwdr.pem).
- **Returns `null`** if any cert file is missing — profile creation still succeeds.
- Pass type: `generic`. Contains name, role, and a QR barcode pointing to the profile URL.

### Google Wallet (`src/lib/wallet/google.ts`)
- Signs a Google Wallet Generic Object as an RS256 JWT.
- **Returns `null`** if `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  or `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are absent.
- The private key value may have `\n` escaped — the helper normalises it automatically.

### QR Codes (`src/lib/qr.ts`)
- `generateQrBuffer(url)` — returns a PNG Buffer (300×300, error-correction H).
- Called by the hook; also embedded in the Apple pass barcode as a URL string.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/wallet/apple/[id]` | Serves the `.pkpass` file for profile `id` |
| `GET` | `/api/wallet/google/[id]` | Redirects to the Google Wallet save URL |

Both return clear JSON error messages when credentials are not yet configured.

---

## Frontend Pages

| Route | File | Auth required |
|---|---|---|
| `/profile/[id]` | `src/app/(frontend)/profile/[id]/page.tsx` | No (public SSR) |
| `/dashboard` | `src/app/(frontend)/dashboard/page.tsx` | Yes (Payload session) |

`WalletButtons` (`src/components/WalletButtons.tsx`) is a `'use client'` component
that renders enabled/disabled states based on `hasApplePass` and `hasGoogleWallet` props.

---

## Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Neon / PostgreSQL
DATABASE_URL=postgresql://<user>:<pass>@<endpoint>.neon.tech/<db>?sslmode=require

# Payload
PAYLOAD_SECRET=<long-random-string>

# Apple Wallet (optional until real passes needed)
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourcompany.osekacard
APPLE_TEAM_IDENTIFIER=YOUR10CHARTEAMID
APPLE_KEY_PASSPHRASE=

# Google Wallet (optional until real passes needed)
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

**Neon note:** use the pooled URL (hostname contains `-pooler`) for Vercel/serverless
deployments. Use the direct URL for local dev. SSL is auto-enabled when the URL
contains `neon.tech`.

---

## Common Commands

```bash
pnpm dev                    # start dev server
pnpm build                  # production build
pnpm payload generate:types # regenerate payload-types.ts after schema changes
pnpm payload migrate:create # create a new DB migration
pnpm payload migrate        # run pending migrations
```

**Always run `pnpm payload generate:types` after modifying any Payload collection.**

---

## Key Constraints & Gotchas

- **afterChange infinite-loop prevention:** the hook checks `operation !== 'create'`
  so the back-write `payload.update()` (which fires with `operation === 'update'`)
  does not re-trigger wallet generation.
- **File storage:** `.pkpass` files are written to `public/passes/`. For production
  swap this for S3/R2 and store signed URLs.
- **Payload types:** `src/payload-types.ts` is auto-generated. Never edit it by hand.
- **ESM project:** `"type": "module"` in package.json. Use `import`, not `require`.
- **pnpm engine:** the project requires `^9 || ^10 || ^11` (patched from original `^9 || ^10`).
