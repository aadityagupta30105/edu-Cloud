import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI, quizzesAPI, assignmentsAPI, liveAPI } from '../services/api';
import Sidebar from '../components/common/Sidebar';
import { Loader, Modal, EmptyState } from '../components/common/UIComponents';
import toast from 'react-hot-toast';

const S = {
  card:    { background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'1.25rem', marginBottom:'0.75rem' },
  tabBtn:  (a) => ({ padding:'0.55rem 1.2rem', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'0.83rem', transition:'all 0.2s', background: a ? '#38bdf8' : '#1e293b', color: a ? '#0a0f1e' : '#64748b' }),
  badge:   (c) => ({ background:`${c}15`, color:c, padding:'2px 10px', borderRadius:'999px', fontSize:'0.7rem', fontWeight:600, display:'inline-block' }),
  lbl:     { fontSize:'0.75rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px', display:'block' },
};

// ─── Lesson Viewer Modal ──────────────────────────────────────────────────────
function LessonViewer({ lesson, onClose, onComplete, isCompleted }) {
  if (!lesson) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem', overflowY:'auto' }}>
      <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'16px', width:'100%', maxWidth:780, animation:'fadeIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #1e293b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#f1f5f9' }}>{lesson.title}</div>
            <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:'2px' }}>
              <span style={S.badge('#64748b')}>{lesson.type}</span>
              {lesson.duration && <span style={{ marginLeft:'8px' }}>⏱ {lesson.duration} min</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', cursor:'pointer', borderRadius:'8px', padding:'6px 12px', fontSize:'0.82rem' }}>
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div style={{ padding:'1.5rem' }}>
          {lesson.description && (
            <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:'10px', padding:'1rem', marginBottom:'1.25rem', fontSize:'0.88rem', color:'#94a3b8', lineHeight:1.7 }}>
              {lesson.description}
            </div>
          )}

          {/* Text content */}
          {lesson.type === 'text' && lesson.content && (
            <div style={{ background:'#1e293b', borderRadius:'10px', padding:'1.5rem', lineHeight:1.9, color:'#94a3b8', fontSize:'0.9rem', whiteSpace:'pre-wrap', minHeight:200 }}>
              {lesson.content}
            </div>
          )}

          {/* PDF */}
          {lesson.type === 'pdf' && lesson.fileUrl && (
            <div>
              <iframe
                src={lesson.fileUrl}
                title={lesson.title}
                style={{ width:'100%', height:500, border:'none', borderRadius:'10px', background:'#fff' }}
              />
              <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-block', marginTop:'10px', ...S.badge('#38bdf8'), padding:'6px 14px', textDecoration:'none', fontSize:'0.82rem' }}>
                📄 Open PDF in new tab
              </a>
            </div>
          )}

          {/* Video */}
          {lesson.type === 'video' && lesson.fileUrl && (
            <video controls style={{ width:'100%', borderRadius:'10px', background:'#000', maxHeight:440 }}>
              <source src={lesson.fileUrl} />
              Your browser does not support the video tag.
            </video>
          )}

          {/* File only (no viewer) */}
          {lesson.fileUrl && lesson.type !== 'pdf' && lesson.type !== 'video' && (
            <div style={{ background:'#1e293b', borderRadius:'10px', padding:'1.5rem', textAlign:'center' }}>
              <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                📎 Open File
              </a>
            </div>
          )}

          {/* Empty content fallback */}
          {!lesson.content && !lesson.fileUrl && (
            <div style={{ textAlign:'center', padding:'2rem', color:'#475569' }}>
              <div style={{ fontSize:'2rem', marginBottom:'8px' }}>📄</div>
              <div>No content available for this lesson yet.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #1e293b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:'0.82rem', color: isCompleted ? '#34d399' : '#64748b' }}>
            {isCompleted ? '✅ Completed' : '○ Not completed'}
          </div>
          {!isCompleted && (
            <button className="btn btn-green btn-sm" onClick={() => { onComplete(lesson._id); onClose(); }}>
              ✓ Mark as Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Course Info Tab ──────────────────────────────────────────────────────────
function CourseInfoTab({ course, enrollment, onLessonComplete }) {
  const [viewLesson, setViewLesson] = useState(null);

  return (
    <div>
      {/* Description */}
      <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'1rem', fontWeight:700, color:'#f1f5f9', marginBottom:'6px' }}>{course.title}</div>
        <div style={{ fontSize:'0.85rem', color:'#94a3b8', lineHeight:1.7 }}>{course.description}</div>
      </div>

      {/* Teacher + Details */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.25rem' }}>
        <div style={S.card}>
          <span style={S.lbl}>Assigned Teacher</span>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'4px' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(52,211,153,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'#34d399', fontWeight:700, fontSize:'1rem', flexShrink:0 }}>
              {course.teacher?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight:600, color:'#f1f5f9', fontSize:'0.9rem' }}>{course.teacher?.name || 'Not assigned'}</div>
              {course.teacher?.employeeId && <div style={{ fontSize:'0.72rem', color:'#38bdf8', marginTop:'1px' }}>ID: {course.teacher.employeeId}</div>}
              {course.teacher?.email && <div style={{ fontSize:'0.72rem', color:'#64748b' }}>{course.teacher.email}</div>}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <span style={S.lbl}>Course Details</span>
          <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'4px' }}>
            {[
              ['Category', course.category, '#38bdf8'],
              ['Level',    course.level,    '#a78bfa'],
            ].map(([k,v,c]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'0.82rem', color:'#64748b' }}>{k}</span>
                <span style={S.badge(c)}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.82rem', color:'#64748b' }}>Students</span>
              <span style={{ fontSize:'0.82rem', color:'#f1f5f9' }}>👥 {course.enrolledStudents?.length || 0}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.82rem', color:'#64748b' }}>Lessons</span>
              <span style={{ fontSize:'0.82rem', color:'#f1f5f9' }}>📖 {course.lessons?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons — clickable */}
      {course.lessons?.length > 0 ? (
        <div>
          <span style={S.lbl}>Course Lessons</span>
          <div style={{ fontSize:'0.78rem', color:'#475569', marginBottom:'10px' }}>Click any lesson to view its full content</div>
          {course.lessons.map((l, i) => {
            const isCompleted = enrollment?.completedLessons?.includes(l._id);
            const typeIcons   = { text:'📄', pdf:'📋', video:'🎬', quiz:'📝' };
            return (
              <div
                key={l._id}
                onClick={() => setViewLesson(l)}
                style={{
                  ...S.card,
                  display:'flex', alignItems:'center', gap:'12px', cursor:'pointer',
                  transition:'all 0.2s',
                  border: isCompleted ? '1px solid rgba(52,211,153,0.3)' : '1px solid #334155',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='#263347'; e.currentTarget.style.transform='translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='#1e293b'; e.currentTarget.style.transform=''; }}
              >
                <div style={{ width:34, height:34, borderRadius:'50%', background: isCompleted ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color: isCompleted ? '#34d399' : '#38bdf8', fontWeight:700, fontSize:'0.82rem', flexShrink:0 }}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'0.88rem', color:'#f1f5f9' }}>{l.title}</div>
                  {l.description && <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.description}</div>}
                  <div style={{ display:'flex', gap:'6px', marginTop:'4px' }}>
                    <span style={S.badge('#64748b')}>{typeIcons[l.type] || '📄'} {l.type}</span>
                    {l.duration && <span style={{ fontSize:'0.7rem', color:'#64748b' }}>⏱ {l.duration} min</span>}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                  {isCompleted && <span style={S.badge('#34d399')}>✓ Done</span>}
                  <span style={{ fontSize:'0.75rem', color:'#38bdf8', fontWeight:500 }}>View →</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="📚" title="No lessons yet" subtitle="The teacher hasn't added lessons to this course yet" />
      )}

      {/* Lesson Viewer */}
      {viewLesson && (
        <LessonViewer
          lesson={viewLesson}
          onClose={() => setViewLesson(null)}
          onComplete={onLessonComplete}
          isCompleted={enrollment?.completedLessons?.includes(viewLesson._id)}
        />
      )}
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────
function AssignmentsTab({ courseId, isTeacher }) {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [submitModal, setSubmitModal] = useState(null);
  const [gradeModal,  setGradeModal]  = useState(null);
  const [form,        setForm]        = useState({ title:'', description:'', deadline:'', maxMarks:100 });
  const [submitText,  setSubmitText]  = useState('');
  const [gradeData,   setGradeData]   = useState({ grade:'', feedback:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await assignmentsAPI.getByCourse(courseId);
      setAssignments(r.data.assignments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load assignments');
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await assignmentsAPI.create({ ...form, course: courseId });
      toast.success('Assignment created! Students notified.');
      setShowCreate(false);
      setForm({ title:'', description:'', deadline:'', maxMarks:100 });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await assignmentsAPI.delete(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const submit = async () => {
    if (!submitText.trim()) return toast.error('Write your answer');
    try {
      await assignmentsAPI.submit(submitModal._id, { text: submitText });
      toast.success('Submitted!');
      setSubmitModal(null); setSubmitText(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const grade = async () => {
    if (gradeData.grade === '') return toast.error('Enter a grade');
    try {
      await assignmentsAPI.grade(gradeModal.assignmentId, gradeModal.studentId, gradeData);
      toast.success('Graded! Email sent to student.');
      setGradeModal(null); setGradeData({ grade:'', feedback:'' }); load();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <Loader />;

  return (
    <div>
      {isTeacher && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Assignment</button>
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState icon="📋" title="No assignments yet"
          action={isTeacher ? <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create First Assignment</button> : null} />
      ) : assignments.map(a => {
        const overdue = new Date() > new Date(a.deadline);
        const mySub   = a.mySubmission;
        const allSubs = a.submissions || [];
        return (
          <div key={a._id} style={S.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'8px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#f1f5f9', marginBottom:'4px' }}>{a.title}</div>
                <div style={{ fontSize:'0.83rem', color:'#94a3b8', marginBottom:'8px', lineHeight:1.5 }}>{a.description}</div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                  <span style={S.badge(overdue ? '#f87171' : '#34d399')}>
                    📅 {overdue ? 'Overdue: ' : 'Due: '}{new Date(a.deadline).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                  <span style={S.badge('#a78bfa')}>Max: {a.maxMarks} marks</span>
                  {a.createdBy && <span style={{ fontSize:'0.72rem', color:'#64748b' }}>By {a.createdBy.name} ({a.createdBy.employeeId})</span>}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                {!isTeacher && (
                  mySub ? (
                    <div style={{ textAlign:'right' }}>
                      <span style={S.badge('#34d399')}>✓ Submitted</span>
                      {mySub.isGraded && (
                        <div style={{ marginTop:'4px' }}>
                          <div style={{ fontSize:'1rem', fontWeight:700, color: (mySub.grade/a.maxMarks)>=0.6 ? '#34d399' : '#f87171' }}>{mySub.grade}/{a.maxMarks}</div>
                          {mySub.feedback && <div style={{ fontSize:'0.72rem', color:'#64748b', fontStyle:'italic', maxWidth:160 }}>"{mySub.feedback}"</div>}
                        </div>
                      )}
                      {!mySub.isGraded && <div style={{ fontSize:'0.72rem', color:'#fbbf24', marginTop:'4px' }}>⏳ Awaiting grade</div>}
                    </div>
                  ) : !overdue ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setSubmitModal(a)}>Submit</button>
                  ) : (
                    <span style={S.badge('#f87171')}>⚠ Missed</span>
                  )
                )}

                {isTeacher && (
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <span style={S.badge('#38bdf8')}>{allSubs.length} submitted</span>
                    <button className="btn btn-danger btn-sm" onClick={() => del(a._id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher submissions list */}
            {isTeacher && allSubs.length > 0 && (
              <div style={{ marginTop:'1rem', paddingTop:'0.75rem', borderTop:'1px solid #334155' }}>
                <span style={S.lbl}>Submissions ({allSubs.length})</span>
                <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:200, overflowY:'auto' }}>
                  {allSubs.map((sub, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.5rem', background:'#0f172a', borderRadius:'8px' }}>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:'0.83rem', color:'#f1f5f9', fontWeight:500 }}>{sub.student?.name || 'Student'}</span>
                        <span style={{ fontSize:'0.72rem', color:'#64748b', marginLeft:'8px' }}>{sub.text?.substring(0, 50)}{sub.text?.length > 50 ? '...' : ''}</span>
                      </div>
                      {sub.isGraded ? (
                        <span style={S.badge('#34d399')}>{sub.grade}/{a.maxMarks}</span>
                      ) : (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setGradeModal({ assignmentId:a._id, studentId:sub.student?._id, studentName:sub.student?.name, maxMarks:a.maxMarks, text:sub.text })}>
                          Grade
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment">
        <form onSubmit={create} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Week 1 Exercise" /></div>
          <div><label className="label">Description *</label><textarea className="input" rows={4} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} required placeholder="Describe the assignment task..." /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div><label className="label">Deadline *</label><input className="input" type="datetime-local" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} required /></div>
            <div><label className="label">Max Marks</label><input className="input" type="number" value={form.maxMarks} onChange={e=>setForm(p=>({...p,maxMarks:parseInt(e.target.value)||100}))} min={1} /></div>
          </div>
          <button className="btn btn-primary" type="submit" style={{width:'100%'}}>📋 Create Assignment</button>
        </form>
      </Modal>

      <Modal open={!!submitModal} onClose={() => setSubmitModal(null)} title={`Submit: ${submitModal?.title}`}>
        {submitModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ background:'#0f172a', borderRadius:'8px', padding:'0.75rem', fontSize:'0.83rem', color:'#94a3b8', lineHeight:1.5 }}>{submitModal.description}</div>
            <div style={{ fontSize:'0.75rem', color: new Date()>new Date(submitModal.deadline)?'#f87171':'#34d399' }}>
              📅 Due: {new Date(submitModal.deadline).toLocaleString()}
            </div>
            <div>
              <label className="label">Your Answer *</label>
              <textarea className="input" rows={7} placeholder="Type your answer here..." value={submitText} onChange={e=>setSubmitText(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={submit} style={{width:'100%'}}>Submit Assignment</button>
          </div>
        )}
      </Modal>

      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title={`Grade: ${gradeModal?.studentName}`}>
        {gradeModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label className="label">Student Submission</label>
              <div style={{ background:'#0f172a', borderRadius:'8px', padding:'0.75rem', fontSize:'0.82rem', color:'#94a3b8', maxHeight:150, overflowY:'auto', lineHeight:1.6 }}>
                {gradeModal.text || <em style={{ color:'#475569' }}>No text content</em>}
              </div>
            </div>
            <div>
              <label className="label">Grade (out of {gradeModal.maxMarks}) *</label>
              <input className="input" type="number" min={0} max={gradeModal.maxMarks} value={gradeData.grade} onChange={e=>setGradeData(p=>({...p,grade:parseFloat(e.target.value)}))} placeholder={`0 – ${gradeModal.maxMarks}`} />
            </div>
            <div>
              <label className="label">Feedback (optional)</label>
              <textarea className="input" rows={3} placeholder="Personalized feedback for the student..." value={gradeData.feedback} onChange={e=>setGradeData(p=>({...p,feedback:e.target.value}))} />
            </div>
            <div style={{ fontSize:'0.78rem', color:'#64748b' }}>📧 Student will receive an email notification with their grade.</div>
            <button className="btn btn-primary" onClick={grade} style={{width:'100%'}}>💾 Save Grade & Notify Student</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Quizzes Tab ──────────────────────────────────────────────────────────────
function QuizzesTab({ courseId, isTeacher }) {
  const [quizzes,    setQuizzes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [result,     setResult]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await quizzesAPI.getByCourse(courseId);
      setQuizzes(r.data.quizzes || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load quizzes'); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const startQuiz = (q) => { setActiveQuiz(q); setAnswers({}); setResult(null); };

  const submit = async () => {
    const unanswered = activeQuiz.questions.filter((_, i) => answers[i] === undefined);
    if (unanswered.length > 0) return toast.error(`Answer all ${activeQuiz.questions.length} questions (${unanswered.length} left)`);
    try {
      const r = await quizzesAPI.submit(activeQuiz._id, { answers: activeQuiz.questions.map((_, i) => answers[i]) });
      setResult(r.data);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const delQuiz = async (id) => {
    if (!window.confirm('Delete quiz?')) return;
    try { await quizzesAPI.delete(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  if (loading) return <Loader />;

  // Quiz in progress
  if (activeQuiz && !result) {
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#f1f5f9' }}>{activeQuiz.title}</div>
            <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{activeQuiz.questions.length} questions · {activeQuiz.timeLimit} min</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveQuiz(null)}>← Back</button>
        </div>

        {activeQuiz.questions.map((q, qi) => (
          <div key={qi} style={{ ...S.card, marginBottom:'1rem' }}>
            <div style={{ fontWeight:600, fontSize:'0.92rem', color:'#f1f5f9', marginBottom:'0.75rem', lineHeight:1.4 }}>
              {qi + 1}. {q.question}
              {answers[qi] !== undefined && <span style={{ marginLeft:'8px', fontSize:'0.7rem', color:'#34d399' }}>✓ Answered</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {q.options.map((opt, oi) => (
                <label key={oi} style={{
                  display:'flex', alignItems:'center', gap:'10px', padding:'0.65rem 0.9rem',
                  borderRadius:'8px', cursor:'pointer',
                  background: answers[qi]===oi ? 'rgba(56,189,248,0.1)' : '#0f172a',
                  border: answers[qi]===oi ? '1px solid #38bdf8' : '1px solid #1e293b',
                  transition:'all 0.15s',
                }}>
                  <input type="radio" name={`q${qi}`} checked={answers[qi]===oi} onChange={() => setAnswers(p=>({...p,[qi]:oi}))} style={{ accentColor:'#38bdf8' }} />
                  <span style={{ fontSize:'0.88rem', color: answers[qi]===oi ? '#38bdf8' : '#94a3b8' }}>{['A','B','C','D'][oi]}. {opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 0' }}>
          <span style={{ fontSize:'0.82rem', color:'#64748b' }}>{Object.keys(answers).length} / {activeQuiz.questions.length} answered</span>
          <button className="btn btn-primary" onClick={submit}>Submit Quiz →</button>
        </div>
      </div>
    );
  }

  // Quiz result
  if (result) {
    return (
      <div>
        <div style={{ ...S.card, textAlign:'center', padding:'2rem', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'0.5rem' }}>{result.percentage >= 60 ? '🎉' : '📚'}</div>
          <div style={{ fontSize:'2.5rem', fontWeight:800, color: result.percentage>=60?'#34d399':'#f87171' }}>{result.percentage}%</div>
          <div style={{ color:'#94a3b8', marginTop:'4px' }}>{result.score} / {result.total} correct</div>
          <div style={{ fontWeight:600, color: result.percentage>=60?'#34d399':'#f87171', marginTop:'4px', marginBottom:'1.25rem' }}>{result.message}</div>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
            <button className="btn btn-secondary" onClick={() => { setActiveQuiz(null); setResult(null); }}>← All Quizzes</button>
            <button className="btn btn-primary" onClick={() => startQuiz(activeQuiz)}>Try Again</button>
          </div>
        </div>

        <span style={S.lbl}>Question Review</span>
        {result.results?.map((r, i) => (
          <div key={i} style={{ ...S.card, borderLeft:`3px solid ${r.isCorrect?'#34d399':'#f87171'}`, marginBottom:'0.6rem' }}>
            <div style={{ fontWeight:600, fontSize:'0.88rem', color:'#f1f5f9', marginBottom:'6px' }}>
              {r.isCorrect ? '✅' : '❌'} Q{i+1}: {r.question}
            </div>
            <div style={{ fontSize:'0.8rem', color: r.isCorrect?'#34d399':'#f87171' }}>Your answer: Option {['A','B','C','D'][r.yourAnswer]||'?'}</div>
            {!r.isCorrect && <div style={{ fontSize:'0.8rem', color:'#34d399' }}>Correct: Option {['A','B','C','D'][r.correctAnswer]}</div>}
            {r.explanation && <div style={{ fontSize:'0.77rem', color:'#64748b', marginTop:'4px', fontStyle:'italic' }}>💡 {r.explanation}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Quiz list
  return (
    <div>
      {quizzes.length === 0 ? (
        <EmptyState icon="📝" title="No quizzes yet" subtitle={isTeacher ? 'Create quizzes from Teacher Dashboard → Quizzes tab' : "Your teacher hasn't added quizzes yet"} />
      ) : quizzes.map(q => {
        const best = q.myBestResult;
        return (
          <div key={q._id} style={S.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'8px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#f1f5f9', marginBottom:'6px' }}>{q.title}</div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                  <span style={S.badge('#38bdf8')}>📝 {q.questions?.length||0} questions</span>
                  <span style={S.badge('#a78bfa')}>⏱ {q.timeLimit} min</span>
                  {q.isAIGenerated && <span style={S.badge('#fbbf24')}>🤖 AI</span>}
                  {q.createdBy && <span style={{ fontSize:'0.72rem', color:'#64748b' }}>By {q.createdBy.name} ({q.createdBy.employeeId})</span>}
                </div>
                {!isTeacher && best && (
                  <div style={{ marginTop:'6px' }}>
                    <span style={S.badge(best.percentage>=60?'#34d399':'#f87171')}>
                      Best: {best.percentage}% ({best.score}/{q.questions?.length})
                    </span>
                    {q.attemptCount > 0 && <span style={{ fontSize:'0.72rem', color:'#64748b', marginLeft:'8px' }}>{q.attemptCount} attempt(s)</span>}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                {!isTeacher && <button className="btn btn-primary btn-sm" onClick={() => startQuiz(q)}>{best ? 'Retry' : 'Start Quiz'}</button>}
                {isTeacher && <button className="btn btn-danger btn-sm" onClick={() => delQuiz(q._id)}>Delete</button>}
              </div>
            </div>
            {isTeacher && (q.submissions?.length > 0) && (
              <div style={{ marginTop:'0.6rem', paddingTop:'0.6rem', borderTop:'1px solid #334155', display:'flex', gap:'12px' }}>
                <span style={{ fontSize:'0.78rem', color:'#64748b' }}>{q.submissions.length} submission(s)</span>
                <span style={{ fontSize:'0.78rem', color:'#34d399' }}>Avg: {Math.round(q.submissions.reduce((s,sub)=>s+sub.percentage,0)/q.submissions.length)}%</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CoursePage ──────────────────────────────────────────────────────────
export default function CoursePage() {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [course,    setCourse]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('course');
  const [liveStatus,setLiveStatus]= useState(null);
  const [addLesson, setAddLesson] = useState(false);
  const [lessonForm,setLessonForm]= useState({ title:'', description:'', type:'text', content:'', duration:'' });
  const [lessonFile,setLessonFile]= useState(null);

  const isTeacher  = user?.role === 'teacher' || user?.role === 'admin';
  const enrollment = user?.enrolledCourses?.find(e => (e.course?._id || e.course) === id);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    try {
      const r = await coursesAPI.getOne(id);
      setCourse(r.data.course);
    } catch { toast.error('Course not found'); navigate('/courses'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => {
    loadCourse();
    liveAPI.getStatus(id).then(r => setLiveStatus(r.data.liveClass)).catch(() => {});
  }, [id, loadCourse]);

  const markComplete = async (lessonId) => {
    if (!enrollment) return;
    try {
      const total     = course.lessons.length;
      const completed = (enrollment.completedLessons?.length || 0) + 1;
      const progress  = Math.round((completed / total) * 100);
      await coursesAPI.updateProgress(id, { lessonId, progress });
      toast.success('Lesson marked complete! 🎉');
      loadCourse();
    } catch (err) { console.error(err); }
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(lessonForm).forEach(([k,v]) => v && fd.append(k, v));
    if (lessonFile) fd.append('file', lessonFile);
    try {
      await coursesAPI.addLesson(id, fd);
      toast.success('Lesson added!');
      setAddLesson(false);
      setLessonForm({ title:'', description:'', type:'text', content:'', duration:'' });
      setLessonFile(null);
      loadCourse();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const startLive = async () => {
    try {
      const r = await liveAPI.start(id, {});
      window.open(r.data.meetingLink, '_blank');
      toast.success('Live class started! 🎥');
      setLiveStatus({ isLive:true, meetingLink:r.data.meetingLink });
    } catch { toast.error('Failed to start'); }
  };

  if (loading) return <div style={{ display:'flex' }}><Sidebar /><main style={{ flex:1, padding:'2rem' }}><Loader /></main></div>;
  if (!course) return null;

  const tabs = [
    { key:'course',      label:'📖 Course' },
    { key:'assignments', label:'📋 Assignments' },
    { key:'quizzes',     label:'📝 Quizzes' },
  ];

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'2rem' }}>
        <div style={{ maxWidth:920, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:'0.82rem', marginBottom:'6px', display:'flex', alignItems:'center', gap:'4px', padding:0 }}>
                ← Back
              </button>
              <h1 style={{ fontSize:'1.35rem', fontWeight:700, color:'#f1f5f9', marginBottom:'4px' }}>{course.title}</h1>
              <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
                👨‍🏫 {course.teacher?.name || 'No teacher'}
                {course.teacher?.employeeId && <span style={{ color:'#38bdf8', marginLeft:'6px' }}>· ID: {course.teacher.employeeId}</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {liveStatus?.isLive && (
                <a href={liveStatus.meetingLink} target="_blank" rel="noopener noreferrer"
                  style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', padding:'0.4rem 0.9rem', fontSize:'0.82rem', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:'4px' }}>
                  🔴 Join Live
                </a>
              )}
              {isTeacher && !liveStatus?.isLive && (
                <button className="btn btn-green btn-sm" onClick={startLive}>🎥 Go Live</button>
              )}
              {isTeacher && (
                <button className="btn btn-secondary btn-sm" onClick={() => setAddLesson(true)}>+ Add Lesson</button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {enrollment && (
            <div style={{ background:'#0f172a', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'0.75rem', color:'#64748b' }}>Your Progress</span>
                  <span style={{ fontSize:'0.75rem', color:'#38bdf8', fontWeight:600 }}>{enrollment.progress}%</span>
                </div>
                <div style={{ height:6, background:'#1e293b', borderRadius:'999px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${enrollment.progress}%`, background:'linear-gradient(90deg,#38bdf8,#34d399)', borderRadius:'999px', transition:'width 0.6s' }} />
                </div>
              </div>
              <span style={{ fontSize:'0.8rem', color:'#fb923c' }}>🔥 {enrollment.streak || 0} day streak</span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:'flex', gap:'6px', background:'#0f172a', padding:'4px', borderRadius:'10px', marginBottom:'1.5rem', width:'fit-content' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={S.tabBtn(activeTab===t.key)}>{t.label}</button>
            ))}
          </div>

          {activeTab === 'course'      && <CourseInfoTab course={course} enrollment={enrollment} onLessonComplete={markComplete} />}
          {activeTab === 'assignments' && <AssignmentsTab courseId={id} isTeacher={isTeacher} />}
          {activeTab === 'quizzes'     && <QuizzesTab courseId={id} isTeacher={isTeacher} />}
        </div>
      </main>

      {/* Add Lesson Modal */}
      <Modal open={addLesson} onClose={() => setAddLesson(false)} title="Add Lesson">
        <form onSubmit={submitLesson} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label className="label">Title *</label><input className="input" value={lessonForm.title} onChange={e=>setLessonForm(p=>({...p,title:e.target.value}))} required placeholder="Lesson title" /></div>
          <div><label className="label">Description</label><input className="input" value={lessonForm.description} onChange={e=>setLessonForm(p=>({...p,description:e.target.value}))} placeholder="Brief description" /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div><label className="label">Type</label>
              <select className="input" value={lessonForm.type} onChange={e=>setLessonForm(p=>({...p,type:e.target.value}))}>
                {['text','pdf','video'].map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Duration (minutes)</label><input className="input" type="number" value={lessonForm.duration} onChange={e=>setLessonForm(p=>({...p,duration:e.target.value}))} placeholder="e.g. 30" /></div>
          </div>
          {lessonForm.type === 'text' && (
            <div><label className="label">Content</label>
              <textarea className="input" rows={6} value={lessonForm.content} onChange={e=>setLessonForm(p=>({...p,content:e.target.value}))} placeholder="Write the lesson content here..." /></div>
          )}
          {(lessonForm.type==='pdf'||lessonForm.type==='video') && (
            <div><label className="label">Upload File</label>
              <input type="file" onChange={e=>setLessonFile(e.target.files[0])} accept={lessonForm.type==='pdf'?'.pdf':'video/*'} style={{ color:'#94a3b8', fontSize:'0.85rem' }} /></div>
          )}
          <button className="btn btn-primary" type="submit" style={{width:'100%'}}>Add Lesson</button>
        </form>
      </Modal>
    </div>
  );
}