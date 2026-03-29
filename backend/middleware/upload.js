// middleware/upload.js
const multer = require('multer');
const path = require('path');

// ─── Local Storage (development fallback) ────────────────────────────────────
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ─── S3 Storage (production) ─────────────────────────────────────────────────
let s3Storage = localStorage; // default to local

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) {
  try {
    const multerS3 = require('multer-s3');
    const { S3Client } = require('@aws-sdk/client-s3');

    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    s3Storage = multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET,
      acl: 'public-read',
      key: (req, file, cb) => {
        const folder = req.uploadFolder || 'general';
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
        cb(null, `${folder}/${uniqueName}`);
      },
    });
  } catch (e) {
    console.warn('⚠️  S3 not configured, using local storage');
  }
}

// ─── File Filter ──────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png|gif|mp4|webm|txt|docx|pptx/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} not allowed`), false);
  }
};

// ─── Export Upload Instances ──────────────────────────────────────────────────
const upload = multer({
  storage: process.env.AWS_S3_BUCKET ? s3Storage : localStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

module.exports = upload;