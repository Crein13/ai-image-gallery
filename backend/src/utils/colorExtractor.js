/**
 * Convert RGB array to hex color string
 * @param {Array<number>} rgb - Array of [r, g, b] values (0-255)
 * @returns {string} Hex color string (e.g., "#FF5733")
 */
export function rgbToHex([r, g, b]) {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Extract dominant colors from an image buffer using node-vibrant
 * @param {Buffer} buffer - Image buffer
 * @param {number} colorCount - Number of colors to extract (default: 5)
 * @returns {Promise<Array<string>>} Array of hex color strings
 */
export async function extractDominantColors(buffer, colorCount = 5) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid buffer provided');
  }

  try {
    // Dynamic import for ESM compatibility with node-vibrant
    const { Vibrant } = await import('node-vibrant/node');

    // Extract palette using node-vibrant
    const palette = await Vibrant.from(buffer).getPalette();

    // Get all available swatches (Vibrant, Muted, DarkVibrant, LightVibrant, DarkMuted, LightMuted)
    const swatches = Object.values(palette).filter(swatch => swatch !== null);

    if (swatches.length === 0) {
      return [];
    }

    // Sort by population (how common the color is in the image)
    const sortedSwatches = swatches.sort((a, b) => b.population - a.population);

    // Take top N colors and convert to hex (uppercase)
    const colors = sortedSwatches
      .slice(0, colorCount)
      .map(swatch => swatch.hex.toUpperCase());

    return colors;
  } catch (error) {
    console.error('Color extraction error:', error);
    throw new Error(`Failed to extract colors: ${error.message}`);
  }
}
