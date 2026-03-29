const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User   = require('../models/User');
const Course = require('../models/Course');
const { Quiz, Assignment, Announcement } = require('../models/index');

router.get('/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalQuizzes, totalAnnouncements, students, teachers, recentUsers, recentCourses] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Quiz.countDocuments(),
      Announcement.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.find().sort('-createdAt').limit(5).select('name email role employeeId createdAt lastLogin'),
      Course.find().sort('-createdAt').limit(5).populate('teacher', 'name employeeId email').select('title teacher enrolledStudents createdAt isPublished category'),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fix: use $ifNull to handle missing enrolledStudents field
    const [monthlySignups, enrollmentStats] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Course.aggregate([
        {
          $project: {
            title: 1,
            category: 1,
            // Use $ifNull to guard against missing/null enrolledStudents
            enrolledCount: { $size: { $ifNull: ['$enrolledStudents', []] } },
          },
        },
        { $sort: { enrolledCount: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalCourses, totalQuizzes, totalAnnouncements, students, teachers },
      recentUsers,
      recentCourses,
      monthlySignups,
      enrollmentStats,
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/teacher', protect, authorize('teacher'), async (req, res) => {
  try {
    const [courses, quizzes, assignments] = await Promise.all([
      Course.find({ teacher: req.user._id })
        .select('title enrolledStudents lessons liveClass createdAt category level')
        .populate('enrolledStudents', 'name email employeeId'),
      Quiz.find({ createdBy: req.user._id }),
      Assignment.find({ createdBy: req.user._id }),
    ]);

    const totalEnrolled    = courses.reduce((s, c) => s + (c.enrolledStudents?.length || 0), 0);
    const totalLessons     = courses.reduce((s, c) => s + (c.lessons?.length || 0), 0);
    const totalSubmissions = quizzes.reduce((s, q) => s + (q.submissions?.length || 0), 0);

    res.json({
      success: true,
      stats: {
        totalCourses: courses.length,
        totalEnrolled,
        totalLessons,
        totalQuizzes: quizzes.length,
        totalAssignments: assignments.length,
        totalSubmissions,
      },
      courses,
    });
  } catch (err) {
    console.error('Teacher analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/student', protect, authorize('student'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'enrolledCourses.course',
      populate: { path: 'teacher', select: 'name employeeId email' },
    });

    const enrolled    = (user.enrolledCourses || []).filter(e => e.course);
    const avgProgress = enrolled.length
      ? Math.round(enrolled.reduce((s, e) => s + (e.progress || 0), 0) / enrolled.length)
      : 0;
    const bestStreak = enrolled.reduce((m, e) => Math.max(m, e.streak || 0), 0);

    res.json({
      success: true,
      stats: { enrolledCourses: enrolled.length, avgProgress, bestStreak },
      enrolledCourses: enrolled,
    });
  } catch (err) {
    console.error('Student analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;