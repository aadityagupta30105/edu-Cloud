const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User   = require('../models/User');
const Course = require('../models/Course');
const { sendEmail, templates } = require('../utils/email');

const generateId = async (role) => {
  const prefix = role === 'teacher' ? 'TCH' : role === 'admin' ? 'ADM' : 'STU';
  const count  = await User.countDocuments({ role });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const { role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];

    const users = await User.find(query)
      .select('-password')
      .populate('enrolledCourses.course', 'title')
      .populate('teachingCourses', 'title')
      .sort('-createdAt');

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, employeeId } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const rawPassword    = password || 'EduCloud@123';
    const finalEmployeeId = employeeId || await generateId(role || 'student');

    const user = await User.create({
      name, email,
      password: rawPassword,
      role: role || 'student',
      employeeId: finalEmployeeId,
    });

    // Send welcome email with credentials
    const tmpl = templates.welcome({ name, email, password: rawPassword, role: user.role, employeeId: finalEmployeeId });
    await sendEmail({ to: email, ...tmpl });

    res.status(201).json({
      success: true,
      message: `User created. Credentials sent to ${email}`,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.role       !== undefined) updates.role       = req.body.role;
    if (req.body.isActive   !== undefined) updates.isActive   = req.body.isActive;
    if (req.body.employeeId !== undefined) updates.employeeId = req.body.employeeId;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/enroll', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const [student, course] = await Promise.all([
      User.findById(studentId),
      Course.findById(courseId).populate('teacher', 'name'),
    ]);

    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found' });
    if (!course)
      return res.status(404).json({ success: false, message: 'Course not found' });

    const alreadyEnrolled = course.enrolledStudents.some(s => s.toString() === studentId);
    if (alreadyEnrolled) return res.status(400).json({ success: false, message: 'Already enrolled' });

    course.enrolledStudents.push(studentId);
    await course.save();

    if (!student.enrolledCourses.some(e => e.course?.toString() === courseId)) {
      student.enrolledCourses.push({ course: courseId, progress: 0, streak: 0 });
      student.notifications.push({ message: `You have been enrolled in "${course.title}"`, type: 'success' });
      await student.save();
    }

    // Real-time + email notification
    const io = req.app.get('io');
    if (io) io.to(studentId.toString()).emit('enrolled_in_course', { courseId, courseTitle: course.title });

    const tmpl = templates.enrolled({
      studentName: student.name,
      courseTitle:  course.title,
      teacherName:  course.teacher?.name,
    });
    await sendEmail({ to: student.email, ...tmpl });

    res.json({ success: true, message: `${student.name} enrolled in ${course.title}. Notification email sent.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/unenroll', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    await Promise.all([
      Course.findByIdAndUpdate(courseId, { $pull: { enrolledStudents: studentId } }),
      User.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: { course: courseId } } }),
    ]);
    res.json({ success: true, message: 'Student removed from course' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assign-teacher', protect, authorize('admin'), async (req, res) => {
  try {
    const { teacherId, courseId } = req.body;
    const [teacher, course] = await Promise.all([User.findById(teacherId), Course.findById(courseId)]);

    if (!teacher || teacher.role !== 'teacher')
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    if (!course)
      return res.status(404).json({ success: false, message: 'Course not found' });

    if (course.teacher) {
      await User.findByIdAndUpdate(course.teacher, { $pull: { teachingCourses: courseId } });
    }

    course.teacher = teacherId;
    await course.save();

    if (!teacher.teachingCourses.map(String).includes(courseId)) {
      teacher.teachingCourses.push(courseId);
      await teacher.save();
    }

    res.json({ success: true, message: `${teacher.name} (${teacher.employeeId}) assigned to ${course.title}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;