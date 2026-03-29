const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Multer stores file in memory as buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/upload/image - Upload image to Cloudinary
router.post('/image', authenticateToken, async (req, res) => {
  try {
    // Try multer first (works locally), fallback to base64 (works on Vercel)
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(() => null); // Silently ignore multer errors on Vercel

    let result;

    if (req.file && req.file.buffer) {
      // Multer parsed the file (local/traditional hosting)
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'khaata/profiles',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    } else if (req.body && req.body.base64) {
      // Base64 upload (Vercel serverless fallback)
      const base64Data = req.body.base64.startsWith('data:')
        ? req.body.base64
        : `data:image/jpeg;base64,${req.body.base64}`;

      result = await cloudinary.uploader.upload(base64Data, {
        folder: 'khaata/profiles',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });
    } else {
      return res.status(400).json({ success: false, message: 'No image provided. Send as multipart form-data or base64.' });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message,
    });
  }
});

module.exports = router;
