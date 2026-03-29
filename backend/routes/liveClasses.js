// routes/liveClasses.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Course = require('../models/Course');
const { v4: uuidv4 } = require('uuid');

// Schedule / start a live class
router.post('/:courseId/start', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const roomId = uuidv4();
    // Jitsi Meet public instance - no API key needed
    const meetingLink = `https://meet.jit.si/lp-${roomId}`;

    course.liveClass = {
      isScheduled: true,
      scheduledAt: req.body.scheduledAt || new Date(),
      meetingLink,
      isLive: true,
    };
    await course.save();

    // Notify enrolled students via socket
    const io = req.app.get('io');
    if (io) {
      io.to(course._id.toString()).emit('class_notification', {
        type: 'CLASS_STARTED',
        message: `Live class started for "${course.title}"`,
        link: meetingLink,
        courseId: course._id,
      });
    }

    res.json({ success: true, meetingLink, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// End live class
router.post('/:courseId/end', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    course.liveClass.isLive = false;
    await course.save();
    res.json({ success: true, message: 'Live class ended' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get live status
router.get('/:courseId/status', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).select('liveClass title');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, liveClass: course.liveClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;