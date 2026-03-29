// controllers/courseController.js
const Course = require('../models/Course');
const User = require('../models/User');

// ─── Get All Courses ──────────────────────────────────────────────────────────
exports.getAllCourses = async (req, res) => {
  try {
    const { category, level, search } = req.query;
    let query = {};

    if (req.user.role === 'student') query.isPublished = true;
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) query.title = { $regex: search, $options: 'i' };

    const courses = await Course.find(query)
      .populate('teacher', 'name avatar')
      .sort('-createdAt');

    res.json({ success: true, count: courses.length, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Course ────────────────────────────────────────────────────────
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name avatar email')
      .populate('enrolledStudents', 'name avatar');

    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Course ────────────────────────────────────────────────────────────
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create({
      ...req.body,
      teacher: req.user._id,
    });

    // Add to teacher's teaching courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teachingCourses: course._id },
    });

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Course ────────────────────────────────────────────────────────────
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Only teacher who owns the course or admin can update
    if (req.user.role !== 'admin' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('teacher', 'name avatar');

    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Course ────────────────────────────────────────────────────────────
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await course.deleteOne();
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Add Lesson ───────────────────────────────────────────────────────────────
exports.addLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const fileUrl = req.file
      ? req.file.location || `/uploads/${req.file.filename}` // S3 or local
      : null;

    course.lessons.push({
      ...req.body,
      fileUrl,
      order: course.lessons.length,
    });

    await course.save();
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Lesson ────────────────────────────────────────────────────────────
exports.deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    course.lessons = course.lessons.filter(
      (l) => l._id.toString() !== req.params.lessonId
    );
    await course.save();
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Enroll in Course ─────────────────────────────────────────────────────────
exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const alreadyEnrolled = course.enrolledStudents.includes(req.user._id);
    if (alreadyEnrolled) {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }

    course.enrolledStudents.push(req.user._id);
    await course.save();

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        enrolledCourses: {
          course: course._id,
          progress: 0,
          streak: 0,
        },
      },
    });

    res.json({ success: true, message: 'Successfully enrolled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Unenroll from Course ─────────────────────────────────────────────────────
exports.unenrollCourse = async (req, res) => {
  try {
    await Course.findByIdAndUpdate(req.params.id, {
      $pull: { enrolledStudents: req.user._id },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { enrolledCourses: { course: req.params.id } },
    });
    res.json({ success: true, message: 'Unenrolled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Progress ──────────────────────────────────────────────────────────
exports.updateProgress = async (req, res) => {
  try {
    const { lessonId, progress } = req.body;
    const user = await User.findById(req.user._id);

    const enrollment = user.enrolledCourses.find(
      (e) => e.course.toString() === req.params.id
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    if (lessonId && !enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);

      // Update streak
      const lastDate = enrollment.lastAccessed;
      const today = new Date();
      const dayDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) enrollment.streak += 1;
      else if (dayDiff > 1) enrollment.streak = 1;
    }

    if (progress !== undefined) enrollment.progress = progress;
    enrollment.lastAccessed = new Date();

    await user.save();
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};