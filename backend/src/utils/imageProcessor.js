// Utilities for image processing using sharp
import sharp from 'sharp';

export async function generateThumbnail(buffer, width = 400) {
  // Returns a resized thumbnail buffer preserving aspect ratio
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const thumb = await image.resize({ width }).jpeg({ quality: 80 }).toBuffer();
  return { thumbnailBuffer: thumb, width: width, height: Math.round((metadata.height * width) / metadata.width) };
}
