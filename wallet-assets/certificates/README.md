# Apple Wallet Certificates

Place your real certificates here **after** enrolling in the Apple Developer Program.
These files are gitignored — never commit real certificates.

## Required Files

| File | Description |
|------|-------------|
| `signerCert.pem` | Your Pass Type ID certificate (PEM format) |
| `signerKey.pem`  | Private key for the certificate (PEM format) |
| `wwdr.pem`       | Apple WWDR G4 intermediate certificate |

## Extraction Steps

### 1. Create a Pass Type ID
- Log in to [developer.apple.com](https://developer.apple.com)
- Certificates, Identifiers & Profiles → Identifiers → Pass Type IDs
- Register a new Pass Type ID: `pass.com.yourcompany.osekacard`

### 2. Generate & Download the Certificate
- In the portal, select your Pass Type ID → Edit → Create Certificate
- Follow the CSR steps, download `pass.cer`

### 3. Extract PEM files

```bash
# Convert the .cer to a combined .p12 first (Keychain → Export as .p12)
# Then extract:
openssl pkcs12 -in YourPassCert.p12 -clcerts -nokeys -out signerCert.pem
openssl pkcs12 -in YourPassCert.p12 -nocerts -out signerKey.pem
# Remove passphrase from key (or set APPLE_KEY_PASSPHRASE env var):
openssl rsa -in signerKey.pem -out signerKey.pem
```

### 4. Download the WWDR G4 Certificate
```bash
curl -o wwdr.pem https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
# If downloaded as .cer (DER format), convert:
openssl x509 -inform der -in wwdr.pem -out wwdr.pem
```

### 5. Set Environment Variables
```bash
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourcompany.osekacard
APPLE_TEAM_IDENTIFIER=YOUR10CHARTEAMID
APPLE_KEY_PASSPHRASE=   # leave empty if you stripped the passphrase
```
