// routes/announcements.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Announcement } = require('../models/index');

// GET announcements - role-aware
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      // Admin sees everything
      query = {};
    } else if (req.user.role === 'teacher') {
      // Teacher sees global + their course announcements
      query = { $or: [{ isGlobal: true }, { author: req.user._id }] };
    } else {
      // Student sees global announcements + announcements for their enrolled courses
      if (req.query.courseId) {
        query = { $or: [{ course: req.query.courseId }, { isGlobal: true }] };
      } else {
        query = { isGlobal: true };
      }
    }

    // Optional course filter
    if (req.query.courseId && req.user.role !== 'student') {
      query = { $or: [{ course: req.query.courseId }, { isGlobal: true }] };
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name role avatar')
      .populate('course', 'title')
      .sort('-createdAt')
      .limit(50);

    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create announcement
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, content, priority, course, isGlobal } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'medium',
      course: course || null,
      isGlobal: isGlobal || false,
      author: req.user._id,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('author', 'name role avatar')
      .populate('course', 'title');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const room = course || 'global';
      io.to(room.toString()).emit('new_announcement', populated);
      // Also broadcast globally
      io.emit('announcement_notification', { title, content });
    }

    res.status(201).json({ success: true, announcement: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE announcement
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });

    // Teacher can only delete their own
    if (req.user.role === 'teacher' && announcement.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this announcement' });
    }

    await announcement.deleteOne();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
