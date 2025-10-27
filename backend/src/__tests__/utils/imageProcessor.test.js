import { generateThumbnail } from '../../utils/imageProcessor.js'

describe('imageProcessor.generateThumbnail', () => {
  it('rejects for invalid image buffer', async () => {
    await expect(generateThumbnail(Buffer.from('not an image'))).rejects.toBeTruthy()
  })
})
