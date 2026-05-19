import jwt from 'jsonwebtoken'

export interface GooglePassOptions {
  profileId: string
  fullName: string
  role: string
  profileUrl: string
}

/**
 * Builds a signed Google Wallet JWT and returns the save-to-wallet URL.
 * Returns null when service account credentials are not configured.
 *
 * Setup: create a Google Cloud service account, enable the Google Wallet API,
 * and set GOOGLE_WALLET_ISSUER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL,
 * and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your environment.
 */
export function generateGoogleWalletUrl(opts: GooglePassOptions): string | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!issuerId || !serviceAccountEmail || !privateKey) {
    return null
  }

  // Class ID is shared across all profiles of the same type.
  // Create this class once via the Google Wallet API or business console.
  const classId = `${issuerId}.osekacard_generic`
  const objectId = `${issuerId}.profile_${opts.profileId}`

  const genericObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    cardTitle: {
      defaultValue: { language: 'en-US', value: 'Oseka Card' },
    },
    subheader: {
      defaultValue: { language: 'en-US', value: opts.role },
    },
    header: {
      defaultValue: { language: 'en-US', value: opts.fullName },
    },
    barcode: {
      type: 'QR_CODE',
      value: opts.profileUrl,
      alternateText: 'Scan to view profile',
    },
    linksModuleData: {
      uris: [
        {
          uri: opts.profileUrl,
          description: 'View Public Profile',
          id: 'profile_link',
        },
      ],
    },
    hexBackgroundColor: '#161616',
    state: 'ACTIVE',
  }

  const jwtPayload = {
    iss: serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: { genericObjects: [genericObject] },
  }

  // privateKey may have escaped newlines from env parsing
  const normalizedKey = privateKey.replace(/\\n/g, '\n')

  const token = jwt.sign(jwtPayload, normalizedKey, { algorithm: 'RS256' })

  return `https://pay.google.com/gp/v/save/${token}`
}
