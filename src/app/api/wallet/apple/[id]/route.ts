import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
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

  const passUrl = profile?.walletPassUrl
  if (!passUrl) {
    return NextResponse.json(
      { error: 'Apple Wallet pass not yet generated for this profile.' },
      { status: 404 },
    )
  }

  const passPath = path.join(process.cwd(), 'public', passUrl)
  if (!fs.existsSync(passPath)) {
    return NextResponse.json({ error: 'Pass file missing on disk.' }, { status: 404 })
  }

  const buffer = fs.readFileSync(passPath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="${id}.pkpass"`,
      'Cache-Control': 'no-store',
    },
  })
}
