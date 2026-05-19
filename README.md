# Oseka Card

A digital business card platform built with **Next.js**, **Payload CMS**, and **Neon (PostgreSQL)**.
Each client gets a public profile page and an auto-generated digital wallet pass —
Apple Wallet (`.pkpass`) and Google Wallet — containing a QR code that links back to their profile.

---

## Tech Stack

- **Next.js 16** (App Router)
- **Payload CMS 3.x** (embedded, monorepo)
- **Neon** — serverless PostgreSQL
- **passkit-generator** — Apple Wallet `.pkpass` generation
- **Google Wallet API** — JWT-based pass deep links
- **TypeScript** · **pnpm**

---

## Prerequisites

- Node.js ≥ 20.9.0
- pnpm ≥ 9
- A [Neon](https://neon.tech) account (free tier is fine for dev)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd newosekacard
pnpm install
```

---

## 2. Configure Environment Variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Open `.env` and set:

```bash
# ── Required ──────────────────────────────────────────────────────────────────

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Get from Neon dashboard → your project → "Connection string" → Node.js
# For local dev use the direct URL; for Vercel use the pooled URL (-pooler hostname)
DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require

# Any long random string (openssl rand -hex 32)
PAYLOAD_SECRET=your-long-random-secret

# ── Apple Wallet (optional — passes are skipped gracefully until certs are added) ──

APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourcompany.osekacard
APPLE_TEAM_IDENTIFIER=YOUR10CHARTEAMID
APPLE_KEY_PASSPHRASE=    # leave blank if you stripped the passphrase

# ── Google Wallet (optional — URLs are skipped gracefully until configured) ────

GOOGLE_WALLET_ISSUER_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=   # full RSA key with \n escaped
```

### Getting your Neon connection string

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. In your project dashboard click **Connection string**, select the **Node.js** tab.
3. Copy the full URL — it looks like:
   ```
   postgresql://alex:AbC123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Paste it as `DATABASE_URL` in your `.env`.

> **Vercel deployments:** use the **pooled** connection string (the hostname contains `-pooler`).
> Keep the direct URL for local development.

---

## 3. Run the Dev Server

```bash
pnpm dev
```

Visit [http://localhost:3000/admin](http://localhost:3000/admin) to open the Payload admin panel.
Follow the on-screen prompt to create your first admin user.

---

## 4. Create Your First Profile

1. In the admin panel go to **Profiles → Create New**.
2. Fill in Full Name, Email, and select a Role.
3. Save — the `afterChange` hook fires immediately and:
   - Generates a QR code pointing to `/profile/<id>`
   - (If Apple certs exist) generates a `.pkpass` at `/public/passes/<id>.pkpass`
   - (If Google creds exist) generates a Google Wallet save URL
4. Visit `/profile/<id>` to see the public profile page.
5. Visit `/dashboard` (logged in) to see the card preview and wallet download buttons.

---

## 5. Enable Apple Wallet Passes

Apple Wallet requires a paid Apple Developer account.

### Step 1 — Create a Pass Type ID

1. Log in to [developer.apple.com](https://developer.apple.com).
2. Go to **Certificates, Identifiers & Profiles → Identifiers → Pass Type IDs**.
3. Register a new ID, e.g. `pass.com.yourcompany.osekacard`.
4. Set `APPLE_PASS_TYPE_IDENTIFIER` in your `.env`.

### Step 2 — Generate & export the certificate

1. In the portal, select your Pass Type ID → **Edit → Create Certificate**.
2. Follow the CSR wizard, download `pass.cer`.
3. Double-click to add it to Keychain, then **export as `.p12`** (set a passphrase or leave blank).

### Step 3 — Extract PEM files

```bash
# Place your .p12 file in wallet-assets/certificates/ then run:
cd wallet-assets/certificates

openssl pkcs12 -in YourPassCert.p12 -clcerts -nokeys -out signerCert.pem
openssl pkcs12 -in YourPassCert.p12 -nocerts -out signerKey.pem

# Optional: strip the passphrase so APPLE_KEY_PASSPHRASE can remain blank
openssl rsa -in signerKey.pem -out signerKey.pem
```

### Step 4 — Download the WWDR G4 intermediate cert

```bash
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
# Convert DER → PEM:
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

### Step 5 — Set env vars

```bash
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourcompany.osekacard
APPLE_TEAM_IDENTIFIER=AB12CD34EF   # 10-character Team ID from developer.apple.com
APPLE_KEY_PASSPHRASE=              # blank if you stripped it in Step 3
```

> Certificate files are gitignored. Never commit `.pem` or `.p12` files.

---

## 6. Enable Google Wallet Passes

### Step 1 — Google Cloud setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable the **Google Wallet API**.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**.
4. Download the JSON key file.

### Step 2 — Register as a Google Wallet issuer

1. Visit [pay.google.com/business/console](https://pay.google.com/business/console).
2. Register your business and note the **Issuer ID**.

### Step 3 — Set env vars

Extract from the service account JSON:

```bash
GOOGLE_WALLET_ISSUER_ID=3388000000XXXXXXXXX
GOOGLE_SERVICE_ACCOUNT_EMAIL=wallet@your-project.iam.gserviceaccount.com
# Copy the "private_key" value from the JSON (keep \n escaped):
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE..."
```

---

## 7. Useful Commands

```bash
pnpm dev                      # start dev server (http://localhost:3000)
pnpm build                    # production build
pnpm start                    # serve production build

# Payload CMS
pnpm payload generate:types   # regenerate src/payload-types.ts after schema changes
pnpm payload migrate:create   # create a new DB migration file
pnpm payload migrate          # run pending migrations against Neon
```

> **Always run `pnpm payload generate:types`** after modifying any collection schema.

---

## 8. Project Structure

```
src/
├── app/
│   ├── (frontend)/
│   │   ├── profile/[id]/page.tsx   ← public profile (no auth)
│   │   └── dashboard/page.tsx      ← protected client dashboard
│   └── api/wallet/
│       ├── apple/[id]/route.ts     ← .pkpass download
│       └── google/[id]/route.ts    ← Google Wallet redirect
├── collections/
│   ├── Profiles.ts                 ← role-based profile collection
│   ├── Users.ts                    ← Payload admin auth
│   └── Media.ts                    ← file uploads
├── hooks/
│   └── afterCreateProfile.ts       ← wallet pass generation trigger
├── lib/
│   ├── qr.ts
│   └── wallet/
│       ├── apple.ts
│       └── google.ts
├── components/
│   └── WalletButtons.tsx
└── payload.config.ts

wallet-assets/
├── certificates/                   ← Apple PEM files (gitignored)
└── pass-template/                  ← Pass icon/logo images
```

---

## 9. Production Checklist

- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Use the **pooled** Neon connection string for `DATABASE_URL`
- [ ] Move `.pkpass` storage from `/public/passes/` to **S3 / Cloudflare R2**
- [ ] Add rate limiting to `/api/wallet/*` routes
- [ ] Restrict write access on `walletPassUrl` and `googleWalletUrl` fields to server-only

---

## Questions & Support

- Payload CMS docs: [payloadcms.com/docs](https://payloadcms.com/docs)
- Neon docs: [neon.tech/docs](https://neon.tech/docs)
- passkit-generator: [github.com/alexandercerutti/passkit-generator](https://github.com/alexandercerutti/passkit-generator)
