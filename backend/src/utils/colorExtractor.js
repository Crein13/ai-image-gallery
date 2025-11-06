/**
 * @param {Array<number>} rgb
 * @returns {string}
 */
export function rgbToHex([r, g, b]) {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

/**
 * @param {Buffer} buffer
 * @param {number} colorCount
 * @returns {Promise<Array<string>>}
 */
export async function extractDominantColors(buffer, colorCount = 5) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid buffer provided');
  }

  try {
    const { Vibrant } = await import('node-vibrant/node');
    const palette = await Vibrant.from(buffer).getPalette();
    const swatches = Object.values(palette).filter(swatch => swatch !== null);

    if (swatches.length === 0) {
      return [];
    }

    const sortedSwatches = swatches.sort((a, b) => b.population - a.population);
    const colors = sortedSwatches
      .slice(0, colorCount)
      .map(swatch => swatch.hex.toLowerCase());

    return colors;
  } catch (error) {
    throw new Error(`Failed to extract colors: ${error.message}`);
  }
}
