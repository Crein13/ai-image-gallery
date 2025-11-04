import { rgbToHex, extractDominantColors } from '../../utils/colorExtractor.js';

describe('colorExtractor', () => {
  describe('rgbToHex', () => {
    test('should convert RGB to hex color', () => {
      expect(rgbToHex([255, 0, 0])).toBe('#ff0000'); // Red
      expect(rgbToHex([0, 255, 0])).toBe('#00ff00'); // Green
      expect(rgbToHex([0, 0, 255])).toBe('#0000ff'); // Blue
    });

    test('should handle black and white', () => {
      expect(rgbToHex([0, 0, 0])).toBe('#000000'); // Black
      expect(rgbToHex([255, 255, 255])).toBe('#ffffff'); // White
    });

    test('should pad single digit hex values', () => {
      expect(rgbToHex([15, 15, 15])).toBe('#0f0f0f');
      expect(rgbToHex([1, 2, 3])).toBe('#010203');
    });

    test('should handle mid-range colors', () => {
      expect(rgbToHex([128, 128, 128])).toBe('#808080'); // Gray
      expect(rgbToHex([52, 152, 219])).toBe('#3498db'); // Blue
    });
  });

  describe('extractDominantColors', () => {
    test('should extract dominant colors from image buffer', async () => {
      const fakeImageBuffer = Buffer.from('fake-image-data');

      const colors = await extractDominantColors(fakeImageBuffer);

      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
      expect(colors.length).toBeLessThanOrEqual(5);

      // Each color should be a valid hex code
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
      });
    });

    test('should return up to 5 dominant colors', async () => {
      const fakeImageBuffer = Buffer.from('fake-image-with-many-colors');

      const colors = await extractDominantColors(fakeImageBuffer);

      expect(colors.length).toBeLessThanOrEqual(5);
    });

    test('should return dominant color as first element', async () => {
      const fakeImageBuffer = Buffer.from('fake-image-data');

      const colors = await extractDominantColors(fakeImageBuffer);

      expect(colors[0]).toBeDefined();
      expect(typeof colors[0]).toBe('string');
    });

    test('should handle color extraction errors gracefully', async () => {
      const invalidBuffer = Buffer.from('not-an-image');

      await expect(extractDominantColors(invalidBuffer)).rejects.toThrow();
    });
  });
});
