const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`📧 [Email disabled] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"EduCloud Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`📧 Email failed to ${to}:`, err.message);
    return false;
  }
};

const templates = {
  welcome: ({ name, email, password, role, employeeId }) => ({
    subject: `Welcome to EduCloud — Your Account Details`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🎓</div>
          <h1 style="color: #38bdf8; margin: 0; font-size: 1.5rem;">Welcome to EduCloud!</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Your learning journey starts here</p>
        </div>

        <p style="color: #94a3b8;">Hello <strong style="color: #f1f5f9;">${name}</strong>,</p>
        <p style="color: #94a3b8;">Your account has been created on the EduCloud Learning Platform. Here are your login credentials:</p>

        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 0.85rem;">Role</td>
              <td style="padding: 8px 0; color: ${role === 'teacher' ? '#34d399' : '#38bdf8'}; font-weight: bold; text-transform: capitalize;">${role}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 0.85rem;">${role === 'teacher' ? 'Teacher' : 'Student'} ID</td>
              <td style="padding: 8px 0; color: #f1f5f9; font-weight: bold; font-family: monospace;">${employeeId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 0.85rem;">Email</td>
              <td style="padding: 8px 0; color: #f1f5f9;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 0.85rem;">Password</td>
              <td style="padding: 8px 0;">
                <span style="background: #0f172a; padding: 4px 10px; border-radius: 6px; font-family: monospace; color: #38bdf8;">${password}</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login"
             style="background: #38bdf8; color: #0a0f1e; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Login to EduCloud →
          </a>
        </div>

        <p style="color: #64748b; font-size: 0.82rem; text-align: center; margin-top: 28px;">
          Please change your password after first login.<br/>
          If you didn't expect this email, please contact your administrator.
        </p>
      </div>
    `,
  }),

  enrolled: ({ studentName, courseTitle, teacherName }) => ({
    subject: `Enrolled in ${courseTitle} — EduCloud`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 2rem;">📚</div>
          <h2 style="color: #34d399;">New Course Enrollment!</h2>
        </div>
        <p style="color: #94a3b8;">Hi <strong style="color: #f1f5f9;">${studentName}</strong>,</p>
        <p style="color: #94a3b8;">You have been enrolled in a new course:</p>
        <div style="background: #1e293b; border-left: 4px solid #34d399; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <div style="font-size: 1.1rem; font-weight: bold; color: #f1f5f9;">${courseTitle}</div>
          <div style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Instructor: ${teacherName || 'EduCloud'}</div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses"
             style="background: #34d399; color: #022c22; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Go to My Courses →
          </a>
        </div>
      </div>
    `,
  }),

  graded: ({ studentName, assignmentTitle, grade, maxMarks, feedback, courseName }) => ({
    subject: `Assignment Graded: ${assignmentTitle} — EduCloud`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 2rem;">📊</div>
          <h2 style="color: #a78bfa;">Assignment Graded!</h2>
        </div>
        <p style="color: #94a3b8;">Hi <strong style="color: #f1f5f9;">${studentName}</strong>,</p>
        <p style="color: #94a3b8;">Your assignment has been graded:</p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <div style="font-weight: bold; font-size: 1rem; margin-bottom: 12px;">${assignmentTitle}</div>
          <div style="font-size: 0.85rem; color: #64748b;">Course: ${courseName}</div>
          <div style="font-size: 2rem; font-weight: bold; color: ${(grade/maxMarks) >= 0.6 ? '#34d399' : '#f87171'}; margin: 12px 0;">
            ${grade} / ${maxMarks}
          </div>
          ${feedback ? `<div style="color: #94a3b8; font-style: italic; border-top: 1px solid #334155; padding-top: 12px; margin-top: 12px;">"${feedback}"</div>` : ''}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses"
             style="background: #a78bfa; color: #1e0040; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            View Courses →
          </a>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };