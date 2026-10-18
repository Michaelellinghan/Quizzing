import QRCode from 'qrcode';

export interface QrOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQrDataUrl(text: string, options: QrOptions = {}): Promise<string> {
  const {
    width = 480,
    margin = 1,
    darkColor = '#090d16',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'H' // High error correction for robust smartphone camera scanning
  } = options;

  try {
    return await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}
