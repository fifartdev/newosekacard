import QRCode from 'qrcode'

export async function generateQrBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
  })
}
