// routes/resources.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Course = require('../models/Course');

// Upload resource (file) to a course
router.post('/upload', protect, authorize('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fileUrl = req.file.location || `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;