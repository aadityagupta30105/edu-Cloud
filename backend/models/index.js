const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: String,
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [questionSchema],
    timeLimit: { type: Number, default: 30 },
    isAIGenerated: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    submissions: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        answers: [Number],
        score: Number,
        percentage: Number,
        results: [
          {
            question: String,
            yourAnswer: Number,
            correctAnswer: Number,
            isCorrect: Boolean,
            explanation: String,
          },
        ],
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    fileUrl: String,
    submissions: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        fileUrl: String,
        grade: Number,
        feedback: String,
        submittedAt: { type: Date, default: Date.now },
        isGraded: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isGlobal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = {
  Quiz:         mongoose.model('Quiz',         quizSchema),
  Assignment:   mongoose.model('Assignment',   assignmentSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
};