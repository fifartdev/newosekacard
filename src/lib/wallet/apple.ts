import { PKPass } from 'passkit-generator'
import path from 'path'
import fs from 'fs'

const CERTS_DIR = path.join(process.cwd(), 'wallet-assets/certificates')
const ASSETS_DIR = path.join(process.cwd(), 'wallet-assets/pass-template')

export interface ApplePassOptions {
  profileId: string
  fullName: string
  role: string
  /** Profile URL encoded into the QR barcode */
  qrUrl: string
}

/**
 * Returns null when signing certificates are not yet present (stub mode).
 * Drop real PEM files into wallet-assets/certificates/ to enable real passes.
 */
export async function generateApplePass(opts: ApplePassOptions): Promise<Buffer | null> {
  const signerCertPath = path.join(CERTS_DIR, 'signerCert.pem')
  const signerKeyPath = path.join(CERTS_DIR, 'signerKey.pem')
  const wwdrPath = path.join(CERTS_DIR, 'wwdr.pem')

  if (!fs.existsSync(signerCertPath) || !fs.existsSync(signerKeyPath) || !fs.existsSync(wwdrPath)) {
    return null
  }

  const passJson = {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER!,
    teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER!,
    organizationName: 'Oseka Card',
    description: `${opts.fullName} — Digital Card`,
    serialNumber: opts.profileId,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(22, 22, 22)',
    labelColor: 'rgb(180, 180, 180)',
    generic: {
      primaryFields: [{ key: 'name', label: 'NAME', value: opts.fullName }],
      secondaryFields: [{ key: 'role', label: 'ROLE', value: opts.role }],
      auxiliaryFields: [],
      headerFields: [],
      backFields: [{ key: 'profileUrl', label: 'Profile URL', value: opts.qrUrl }],
    },
    barcodes: [
      {
        message: opts.qrUrl,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: 'Scan to view profile',
      },
    ],
    // Legacy barcode field for iOS < 9
    barcode: {
      message: opts.qrUrl,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
      altText: 'Scan to view profile',
    },
  }

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': fs.readFileSync(path.join(ASSETS_DIR, 'icon.png')),
      'icon@2x.png': fs.readFileSync(path.join(ASSETS_DIR, 'icon@2x.png')),
      'logo.png': fs.readFileSync(path.join(ASSETS_DIR, 'logo.png')),
      'logo@2x.png': fs.readFileSync(path.join(ASSETS_DIR, 'logo@2x.png')),
    },
    {
      wwdr: fs.readFileSync(wwdrPath),
      signerCert: fs.readFileSync(signerCertPath),
      signerKey: fs.readFileSync(signerKeyPath),
      signerKeyPassphrase: process.env.APPLE_KEY_PASSPHRASE ?? '',
    },
  )

  return pass.getAsBuffer()
}
