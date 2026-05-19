import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Profile } from '@/payload-types'
import WalletButtons from '@/components/WalletButtons'

export const metadata = {
  title: 'My Card | Oseka Card',
}

export default async function DashboardPage() {
  const payload = await getPayload({ config })

  // Payload reads its own session cookie from the request headers
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/admin/login')

  const result = await payload.find({
    collection: 'profiles',
    where: { email: { equals: user.email } },
    depth: 1,
    limit: 1,
  })

  const profile = result.docs[0] as Profile | undefined
  if (!profile) {
    return (
      <NoProfileView email={user.email as string} />
    )
  }

  const roleLabel =
    profile.role === 'client_type_a'
      ? 'Individual'
      : profile.role === 'client_type_b'
        ? 'Business'
        : profile.role

  const subtitle =
    profile.role === 'client_type_a'
      ? profile.individualProfile?.jobTitle ?? ''
      : profile.role === 'client_type_b'
        ? profile.businessProfile?.companyName ?? ''
        : ''

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Your Digital Card</h1>
        <p style={{ color: '#777', marginTop: 0, marginBottom: '2rem' }}>Welcome back, {profile.fullName}</p>

        {/* Card preview */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1c1c1c 0%, #2c2c2c 100%)',
            borderRadius: 20,
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative ring */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.05)',
            }}
          />

          <div style={{ position: 'relative' }}>
            <span
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 11,
                color: '#aaa',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {roleLabel}
            </span>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 4px' }}>{profile.fullName}</h2>
            {subtitle && <p style={{ color: '#aaa', margin: 0, fontSize: 14 }}>{subtitle}</p>}

            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '1.25rem 0' }} />

            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              ↗{' '}
              <a
                href={`/profile/${profile.id}`}
                style={{ color: '#60a5fa', textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                /profile/{profile.id}
              </a>
            </p>
          </div>
        </div>

        {/* Wallet download buttons */}
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#ccc' }}>
          Add to Wallet
        </h2>
        <WalletButtons
          profileId={String(profile.id)}
          hasApplePass={Boolean(profile.walletPassUrl)}
          hasGoogleWallet={Boolean(profile.googleWalletUrl)}
        />

        {/* Status info */}
        {(!profile.walletPassUrl || !profile.googleWalletUrl) && (
          <p style={{ marginTop: '1rem', fontSize: 12, color: '#555' }}>
            {!profile.walletPassUrl && 'Apple Wallet pass is unavailable — add signing certificates to enable it. '}
            {!profile.googleWalletUrl && 'Google Wallet requires service account credentials to be configured.'}
          </p>
        )}

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a href="/admin" style={{ color: '#555', textDecoration: 'none', fontSize: 13 }}>
            ← Admin Panel
          </a>
        </div>
      </div>
    </div>
  )
}

function NoProfileView({ email }: { email: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>No Profile Found</h1>
        <p style={{ color: '#777' }}>No client profile is linked to {email}.</p>
        <a href="/admin/collections/profiles/create" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          Create a Profile →
        </a>
      </div>
    </div>
  )
}
