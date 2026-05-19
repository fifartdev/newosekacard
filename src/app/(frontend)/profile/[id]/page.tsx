import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Profile } from '@/payload-types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const profile = await payload.findByID({ collection: 'profiles', id, depth: 0 })
    return {
      title: `${(profile as Profile).fullName} | Oseka Card`,
      description: `Digital card for ${(profile as Profile).fullName}`,
    }
  } catch {
    return { title: 'Profile | Oseka Card' }
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params
  const payload = await getPayload({ config })

  let profile: Profile
  try {
    profile = (await payload.findByID({ collection: 'profiles', id, depth: 1 })) as Profile
  } catch {
    notFound()
  }

  const avatarUrl =
    profile.avatar && typeof profile.avatar === 'object' && 'url' in profile.avatar
      ? (profile.avatar.url as string)
      : null

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero card */}
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '3rem 1.5rem 1.5rem',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
            borderRadius: 20,
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={profile.fullName}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
            />
          )}

          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{profile.fullName}</h1>

          {profile.role === 'client_type_a' && profile.individualProfile?.jobTitle && (
            <p style={{ color: '#aaa', marginTop: 4, marginBottom: 0 }}>
              {profile.individualProfile.jobTitle}
            </p>
          )}
          {profile.role === 'client_type_b' && profile.businessProfile?.companyName && (
            <p style={{ color: '#aaa', marginTop: 4, marginBottom: 0 }}>
              {profile.businessProfile.companyName}
            </p>
          )}

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.25rem 0' }} />

          <ContactRow icon="✉" value={profile.email} href={`mailto:${profile.email}`} />
          {profile.phone && <ContactRow icon="📞" value={profile.phone} href={`tel:${profile.phone}`} />}
        </div>

        {/* Role-specific detail section */}
        {profile.role === 'client_type_a' && profile.individualProfile && (
          <IndividualSection data={profile.individualProfile} />
        )}

        {profile.role === 'client_type_b' && profile.businessProfile && (
          <BusinessSection data={profile.businessProfile} />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContactRow({ icon, value, href }: { icon: string; value: string; href?: string }) {
  const inner = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ccc', fontSize: 14 }}>
      <span>{icon}</span>
      <span>{value}</span>
    </span>
  )
  return (
    <div style={{ marginTop: 8 }}>
      {href ? (
        <a href={href} style={{ textDecoration: 'none' }}>
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: '1.25rem',
        background: '#1a1a1a',
        borderRadius: 16,
        padding: '1.5rem',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function IndividualSection({
  data,
}: {
  data: NonNullable<Profile['individualProfile']>
}) {
  return (
    <SectionCard>
      {data.bio && <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>{data.bio}</p>}

      {data.skills && data.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '0.75rem' }}>
          {data.skills.map((s, i) => (
            <span
              key={i}
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 12,
                color: '#ddd',
              }}
            >
              {s.skill}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {data.linkedinUrl && (
          <a href={data.linkedinUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            LinkedIn ↗
          </a>
        )}
        {data.portfolioUrl && (
          <a href={data.portfolioUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Portfolio ↗
          </a>
        )}
      </div>
    </SectionCard>
  )
}

function BusinessSection({
  data,
}: {
  data: NonNullable<Profile['businessProfile']>
}) {
  return (
    <SectionCard>
      {data.industry && (
        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 0.5rem' }}>
          Industry: {data.industry}
        </p>
      )}
      {data.employeeCount && (
        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 0.5rem' }}>
          Size: {data.employeeCount} employees
        </p>
      )}
      {data.address?.city && (
        <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 0.5rem' }}>
          {[data.address.street, data.address.city, data.address.country].filter(Boolean).join(', ')}
        </p>
      )}
      {data.websiteUrl && (
        <a href={data.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, marginTop: '0.75rem', display: 'inline-block' }}>
          {data.websiteUrl} ↗
        </a>
      )}
    </SectionCard>
  )
}

const linkStyle: React.CSSProperties = {
  color: '#60a5fa',
  textDecoration: 'none',
  fontSize: 13,
}
