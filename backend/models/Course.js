// models/Course.js
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  content: String,          // text content or S3 URL
  type: {
    type: String,
    enum: ['video', 'pdf', 'text', 'quiz'],
    default: 'text',
  },
  fileUrl: String,          // S3 URL for uploaded files
  duration: Number,         // in minutes
  order: { type: Number, default: 0 },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['programming', 'mathematics', 'science', 'arts', 'language', 'other'],
      default: 'other',
    },
    thumbnail: { type: String, default: '' },
    lessons: [lessonSchema],
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPublished: { type: Boolean, default: false },
    tags: [String],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    // Live class info
    liveClass: {
      isScheduled: { type: Boolean, default: false },
      scheduledAt: Date,
      meetingLink: String,
      isLive: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);