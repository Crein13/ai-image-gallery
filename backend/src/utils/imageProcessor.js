// Utilities for image processing using sharp
import sharp from 'sharp';

export async function generateThumbnail(buffer, maxSize = 400) {
  // Returns a resized thumbnail buffer preserving aspect ratio and orientation
  const image = sharp(buffer);

  // Get metadata before any transformations
  const metadata = await image.metadata();

  // Apply auto-orientation to handle EXIF rotation data
  // This ensures the thumbnail has the correct orientation
  const orientedImage = image.rotate(); // Sharp's rotate() with no params applies EXIF orientation

  // Get dimensions after orientation is applied
  const orientedMetadata = await orientedImage.metadata();

  // Calculate resize dimensions preserving aspect ratio
  let resizeOptions = {};
  if (orientedMetadata.width > orientedMetadata.height) {
    // Landscape image - limit by width
    resizeOptions = { width: maxSize };
  } else {
    // Portrait image - limit by height
    resizeOptions = { height: maxSize };
  }

  // Generate thumbnail with proper orientation and aspect ratio
  const thumb = await orientedImage
    .resize(resizeOptions)
    .jpeg({ quality: 80 })
    .toBuffer();

  // Calculate final dimensions
  const finalMetadata = await sharp(thumb).metadata();

  return {
    thumbnailBuffer: thumb,
    width: finalMetadata.width,
    height: finalMetadata.height
  };
}
