interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const BLACK: RgbColor = { r: 0, g: 0, b: 0 };

export function hexToRgb(hex: string): RgbColor {
  const cleanHex = hex.replace('#', '').toLowerCase();

  if (cleanHex.length !== 6 || !/^[0-9a-f]{6}$/.test(cleanHex)) {
    console.warn(`Invalid hex color: ${hex}, defaulting to black`);
    return BLACK;
  }

  return {
    r: parseInt(cleanHex.substring(0, 2), 16) / 255,
    g: parseInt(cleanHex.substring(2, 4), 16) / 255,
    b: parseInt(cleanHex.substring(4, 6), 16) / 255,
  };
}
