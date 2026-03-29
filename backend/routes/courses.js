// routes/courses.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const courseController = require('../controllers/courseController');

router.get('/',                     protect,                             courseController.getAllCourses);
router.get('/:id',                  protect,                             courseController.getCourse);
router.post('/',                    protect, authorize('teacher','admin'),courseController.createCourse);
router.put('/:id',                  protect, authorize('teacher','admin'),courseController.updateCourse);
router.delete('/:id',               protect, authorize('teacher','admin'),courseController.deleteCourse);

// Lessons
router.post('/:id/lessons',         protect, authorize('teacher','admin'),
  upload.single('file'),
  courseController.addLesson);
router.delete('/:id/lessons/:lessonId', protect, authorize('teacher','admin'), courseController.deleteLesson);

// Enrollment
router.post('/:id/enroll',          protect, authorize('student'),        courseController.enrollCourse);
router.post('/:id/unenroll',        protect, authorize('student'),        courseController.unenrollCourse);

// Progress
router.put('/:id/progress',         protect, authorize('student'),        courseController.updateProgress);

module.exports = router;