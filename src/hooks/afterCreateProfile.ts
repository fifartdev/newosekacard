import type { CollectionAfterChangeHook } from 'payload'
import fs from 'fs'
import path from 'path'

import { generateQrBuffer } from '@/lib/qr'
import { generateApplePass } from '@/lib/wallet/apple'
import { generateGoogleWalletUrl } from '@/lib/wallet/google'

const PASSES_DIR = path.join(process.cwd(), 'public/passes')

/**
 * Runs once on profile creation. Generates an Apple .pkpass and a Google Wallet
 * save URL, then writes both back to the record.
 *
 * The update call uses `disableTransaction: true` so it does not inherit the
 * parent transaction and does NOT re-trigger this hook (operation === 'update').
 */
export const afterCreateProfile: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const profileUrl = `${appUrl}/profile/${doc.id}`

  const updates: Record<string, string | null> = {}

  try {
    // Apple Wallet — skipped gracefully when certs are not yet present
    await generateQrBuffer(profileUrl) // ensure QR generation works
    const passBuffer = await generateApplePass({
      profileId: String(doc.id),
      fullName: doc.fullName as string,
      role: doc.role as string,
      qrUrl: profileUrl,
    })

    if (passBuffer) {
      if (!fs.existsSync(PASSES_DIR)) fs.mkdirSync(PASSES_DIR, { recursive: true })
      const passFilename = `${doc.id}.pkpass`
      fs.writeFileSync(path.join(PASSES_DIR, passFilename), passBuffer)
      updates.walletPassUrl = `/passes/${passFilename}`
    }
  } catch (err) {
    req.payload.logger.error({ err, profileId: doc.id }, 'Apple Wallet pass generation failed')
  }

  try {
    // Google Wallet — skipped gracefully when env vars are not configured
    const googleUrl = generateGoogleWalletUrl({
      profileId: String(doc.id),
      fullName: doc.fullName as string,
      role: doc.role as string,
      profileUrl,
      expiresAt: doc.passExpiresAt as string | null ?? null,
    })
    if (googleUrl) updates.googleWalletUrl = googleUrl
  } catch (err) {
    req.payload.logger.error({ err, profileId: doc.id }, 'Google Wallet URL generation failed')
  }

  if (Object.keys(updates).length === 0) return doc

  await req.payload.update({
    collection: 'profiles',
    id: doc.id,
    data: updates,
    req,
  })

  return { ...doc, ...updates }
}
