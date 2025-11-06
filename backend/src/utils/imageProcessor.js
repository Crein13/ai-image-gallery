import sharp from 'sharp';

export async function generateThumbnail(buffer, maxSize = 400) {
  const image = sharp(buffer);
  const orientedImage = image.rotate();
  const orientedMetadata = await orientedImage.metadata();

  let resizeOptions = {};
  if (orientedMetadata.width > orientedMetadata.height) {
    resizeOptions = { width: maxSize };
  } else {
    resizeOptions = { height: maxSize };
  }

  const thumb = await orientedImage
    .resize(resizeOptions)
    .jpeg({ quality: 80 })
    .toBuffer();

  const finalMetadata = await sharp(thumb).metadata();

  return {
    thumbnailBuffer: thumb,
    width: finalMetadata.width,
    height: finalMetadata.height
  };
}
