import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Profile } from '@/payload-types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const payload = await getPayload({ config })

  let profile: Profile
  try {
    profile = (await payload.findByID({ collection: 'profiles', id, depth: 0 })) as Profile
  } catch {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const googleUrl = profile?.googleWalletUrl
  if (!googleUrl) {
    return NextResponse.json(
      {
        error:
          'Google Wallet URL not yet generated. Configure GOOGLE_WALLET_ISSUER_ID, ' +
          'GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
      },
      { status: 404 },
    )
  }

  return NextResponse.redirect(googleUrl)
}
