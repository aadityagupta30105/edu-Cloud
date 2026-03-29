const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    avatar: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    enrolledCourses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        progress: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        lastAccessed: { type: Date, default: Date.now },
        completedLessons: [String],
      },
    ],
    teachingCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    notifications: [
      {
        message: String,
        type: { type: String, enum: ['info', 'warning', 'success', 'error'] },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);