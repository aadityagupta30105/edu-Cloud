const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Quiz } = require('../models/index');
const Course   = require('../models/Course');
const User     = require('../models/User');

router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role === 'student') {
      const isEnrolled = course.enrolledStudents.some(s => s.toString() === req.user._id.toString());
      if (!isEnrolled) return res.status(403).json({ success: false, message: 'Not enrolled' });
    }

    const quizzes = await Quiz.find({ course: req.params.courseId })
      .populate('createdBy', 'name employeeId')
      .sort('-createdAt');

    const withStatus = quizzes.map(q => {
      const qObj = q.toObject();
      if (req.user.role === 'student') {
        const mySubs = q.submissions.filter(s => s.student?.toString() === req.user._id.toString());
        qObj.myBestResult = mySubs.length > 0 ? mySubs.reduce((best, s) => (!best || s.percentage > best.percentage ? s : best), null) : null;
        qObj.attemptCount = mySubs.length;
        delete qObj.submissions;
        qObj.questions = qObj.questions.map(q2 => ({ ...q2, correctAnswer: undefined, explanation: undefined }));
      }
      return qObj;
    });

    res.json({ success: true, quizzes: withStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/submissions', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('submissions.student', 'name email');
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/my-result', protect, authorize('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found' });
    const mySubs = quiz.submissions
      .filter(s => s.student?.toString() === req.user._id.toString())
      .sort((a, b) => b.submittedAt - a.submittedAt);
    res.json({ success: true, submissions: mySubs, bestPercentage: mySubs.length > 0 ? Math.max(...mySubs.map(s => s.percentage)) : null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, course, questions, timeLimit, isAIGenerated } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    if (!course) return res.status(400).json({ success: false, message: 'Course required' });
    if (!questions || questions.length === 0) return res.status(400).json({ success: false, message: 'At least one question required' });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question?.trim()) return res.status(400).json({ success: false, message: `Q${i + 1} has no text` });
      if (!Array.isArray(q.options) || q.options.length !== 4) return res.status(400).json({ success: false, message: `Q${i + 1} must have 4 options` });
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) return res.status(400).json({ success: false, message: `Q${i + 1} invalid correctAnswer` });
    }

    const courseDoc = await Course.findById(course).populate('enrolledStudents', '_id');
    if (!courseDoc) return res.status(404).json({ success: false, message: 'Course not found' });
    if (req.user.role === 'teacher' && courseDoc.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'You do not teach this course' });

    const quiz = await Quiz.create({ title, course, questions, timeLimit: timeLimit || 30, isAIGenerated: isAIGenerated || false, createdBy: req.user._id });
    const populated = await Quiz.findById(quiz._id).populate('createdBy', 'name employeeId');

    const io = req.app.get('io');
    if (io) io.to(course.toString()).emit('new_quiz', { quiz: { _id: quiz._id, title, course }, courseId: course });

    await User.updateMany(
      { _id: { $in: courseDoc.enrolledStudents.map(s => s._id || s) } },
      { $push: { notifications: { message: `New quiz "${title}" available in ${courseDoc.title}`, type: 'info' } } }
    );

    res.status(201).json({ success: true, quiz: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'teacher' && quiz.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const updated = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, quiz: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'teacher' && quiz.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await quiz.deleteOne();
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length)
      return res.status(400).json({ success: false, message: `Provide ${quiz.questions.length} answers` });

    let correct = 0;
    const results = quiz.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) correct++;
      return { question: q.question, yourAnswer: answers[i], correctAnswer: q.correctAnswer, isCorrect, explanation: q.explanation || '' };
    });

    const score      = correct;
    const percentage = Math.round((correct / quiz.questions.length) * 100);

    quiz.submissions.push({ student: req.user._id, answers, score, percentage, results });
    await quiz.save();

    res.json({ success: true, score, percentage, total: quiz.questions.length, results, message: percentage >= 60 ? '🎉 Passed!' : '📚 Keep studying!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;