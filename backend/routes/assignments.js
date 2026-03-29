const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Assignment } = require('../models/index');
const Course = require('../models/Course');
const User   = require('../models/User');
const { sendEmail, templates } = require('../utils/email');

router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'student') {
      const enrolled = course.enrolledStudents.some(s => s.toString() === req.user._id.toString());
      if (!enrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    }

    const assignments = await Assignment.find({ course: req.params.courseId })
      .populate('createdBy', 'name employeeId')
      .sort('-createdAt');

    const result = assignments.map(a => {
      const obj = a.toObject();
      if (req.user.role === 'student') {
        obj.mySubmission = a.submissions.find(s => s.student?.toString() === req.user._id.toString()) || null;
        delete obj.submissions;
      }
      return obj;
    });

    res.json({ success: true, assignments: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name email employeeId')
      .populate('course', 'title')
      .populate('submissions.student', 'name email employeeId');
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, assignment: a });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, course, deadline, maxMarks } = req.body;
    if (!title || !description || !course || !deadline)
      return res.status(400).json({ success: false, message: 'title, description, course, deadline are required' });

    const courseDoc = await Course.findById(course).populate('enrolledStudents', '_id name email');
    if (!courseDoc) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'teacher' && courseDoc.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'You do not teach this course' });

    const assignment = await Assignment.create({ title, description, course, deadline, maxMarks: maxMarks || 100, createdBy: req.user._id });
    const populated  = await Assignment.findById(assignment._id).populate('createdBy', 'name employeeId').populate('course', 'title');

    const io = req.app.get('io');
    if (io) io.to(course.toString()).emit('new_assignment', { assignment: populated, courseId: course });

    // Notify enrolled students via DB notification
    await User.updateMany(
      { _id: { $in: courseDoc.enrolledStudents.map(s => s._id || s) } },
      { $push: { notifications: { message: `New assignment "${title}" posted in ${courseDoc.title}`, type: 'info' } } }
    );

    res.status(201).json({ success: true, assignment: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'teacher' && a.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('createdBy', 'name employeeId');
    res.json({ success: true, assignment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'teacher' && a.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await a.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });

    const already = a.submissions.some(s => s.student?.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ success: false, message: 'Already submitted' });

    if (new Date() > new Date(a.deadline))
      return res.status(400).json({ success: false, message: 'Deadline has passed' });

    a.submissions.push({ student: req.user._id, text: req.body.text || '', fileUrl: req.body.fileUrl || '' });
    await a.save();
    res.json({ success: true, message: 'Submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/grade/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const a = await Assignment.findById(req.params.id).populate('course', 'title');
    if (!a) return res.status(404).json({ success: false, message: 'Not found' });

    const sub = a.submissions.find(s => s.student?.toString() === req.params.studentId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    sub.grade    = grade;
    sub.feedback = feedback;
    sub.isGraded = true;
    await a.save();

    const student = await User.findById(req.params.studentId).select('name email');
    if (student) {
      await User.findByIdAndUpdate(req.params.studentId, {
        $push: { notifications: { message: `Assignment "${a.title}" graded: ${grade}/${a.maxMarks}`, type: 'success' } },
      });

      const tmpl = templates.graded({
        studentName:     student.name,
        assignmentTitle: a.title,
        grade,
        maxMarks: a.maxMarks,
        feedback,
        courseName: a.course?.title || 'Course',
      });
      await sendEmail({ to: student.email, ...tmpl });
    }

    res.json({ success: true, message: 'Graded and email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;