import multer from 'multer'

const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
    fields: 10,
  },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype)
    if (!ok) return cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
    cb(null, true)
  },
})
