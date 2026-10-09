import QRCode from 'qrcode';

export interface QRGenerationOptions {
  text: string;
  fgColor?: string;
  bgColor?: string;
  width?: number;
}

export async function generateQrPngDataUrl(options: QRGenerationOptions): Promise<string> {
  const { text, fgColor = '#1e1b4b', bgColor = '#ffffff', width = 360 } = options;
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });
}

export async function generateQrSvgString(options: QRGenerationOptions): Promise<string> {
  const { text, fgColor = '#1e1b4b', bgColor = '#ffffff', width = 360 } = options;
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    width,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSvg(svgString: string, filename: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
