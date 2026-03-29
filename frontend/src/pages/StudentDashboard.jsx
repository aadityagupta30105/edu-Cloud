import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { analyticsAPI, announcementsAPI, coursesAPI } from '../services/api';
import Sidebar from '../components/common/Sidebar';
import AIChatbot from '../components/common/AIChatbot';
import { StatCard, Loader, EmptyState, SectionHeader } from '../components/common/UIComponents';
import toast from 'react-hot-toast';

const S = {
  card: { background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'1.25rem', marginBottom:'0.75rem' },
  badge: (c) => ({ background:`${c}15`, color:c, padding:'2px 10px', borderRadius:'999px', fontSize:'0.7rem', fontWeight:600 }),
};

export default function StudentDashboard() {
  const { user }       = useAuth();
  const { joinRoom }   = useSocket();
  const navigate       = useNavigate();
  const [stats,         setStats]         = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [allCourses,    setAllCourses]    = useState([]);
  const [enrolled,      setEnrolled]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('dashboard');
  const [notifications, setNotifications] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, annRes, coursesRes] = await Promise.all([
        analyticsAPI.student(),
        announcementsAPI.getAll(),
        coursesAPI.getAll({ limit: 20 }),
      ]);
      setStats(statsRes.data.stats);
      setEnrolled(statsRes.data.enrolledCourses || []);
      setAnnouncements(annRes.data.announcements || []);
      setAllCourses(coursesRes.data.courses || []);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const stored = JSON.parse(localStorage.getItem(`notifications_${user?._id}`) || '[]');
    setNotifications(stored);
  }, [loadData, user?._id]);

  useEffect(() => {
    if (user?.enrolledCourses) {
      user.enrolledCourses.forEach(e => {
        const cid = e.course?._id || e.course;
        if (cid) joinRoom?.(cid);
      });
    }
  }, [user, joinRoom]);

  const enrolledIds = new Set(user?.enrolledCourses?.map(e => e.course?._id || e.course) || []);

  const tabs = [
    { key:'dashboard',   label:'🏠 Dashboard' },
    { key:'courses',     label:'📚 My Courses' },
    { key:'discover',    label:'🔍 Discover' },
    { key:'announcements', label:`📢 Announcements ${announcements.length > 0 ? `(${announcements.length})` : ''}` },
  ];

  const priorityColors = { high:'#f87171', medium:'#fbbf24', low:'#34d399' };

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'2rem' }}>
        <div style={{ marginBottom:'2rem' }}>
          <h1 style={{ fontSize:'1.6rem', fontWeight:700, color:'#f1f5f9' }}>
            Good {new Date().getHours()<12 ? 'morning' : new Date().getHours()<17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color:'#64748b', fontSize:'0.85rem' }}>
            Student ID: <span style={{ color:'#38bdf8', fontWeight:600 }}>{user?.employeeId || 'Not assigned'}</span>
            &nbsp;·&nbsp;{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>

        <div style={{ display:'flex', gap:'4px', background:'#0f172a', padding:'4px', borderRadius:'12px', marginBottom:'2rem', width:'fit-content', flexWrap:'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding:'0.5rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer',
              background: activeTab===t.key ? '#1e293b' : 'transparent',
              color: activeTab===t.key ? '#f1f5f9' : '#64748b',
              fontWeight:500, fontSize:'0.82rem', transition:'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? <Loader /> : (
          <>
            {activeTab === 'dashboard' && (
              <div>
                <div className="grid-4" style={{ marginBottom:'2rem' }}>
                  <StatCard icon="📚" label="Enrolled Courses" value={stats?.enrolledCourses||0}                                          color="#38bdf8" />
                  <StatCard icon="📈" label="Avg Progress"     value={`${stats?.avgProgress||0}%`}                                        color="#34d399" />
                  <StatCard icon="🔥" label="Best Streak"      value={`${stats?.bestStreak||0}d`}                                         color="#fb923c" />
                  <StatCard icon="✅" label="Completed"        value={enrolled.filter(e=>e.progress>=100).length}                          color="#a78bfa" />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1.5rem' }}>
                  <div>
                    <SectionHeader title="My Courses" subtitle="Continue learning"
                      action={<button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('courses')}>View All</button>} />
                    {enrolled.length === 0 ? (
                      <EmptyState icon="📚" title="Not enrolled in any courses" subtitle="Browse courses to get started"
                        action={<button className="btn btn-primary" onClick={() => setActiveTab('discover')}>Browse Courses</button>} />
                    ) : enrolled.slice(0,4).map(e => {
                      const course = e.course;
                      if (!course || typeof course === 'string') return null;
                      return (
                        <div key={e._id} style={{ ...S.card, cursor:'pointer' }} onClick={() => navigate(`/courses/${course._id}`)}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, fontSize:'0.92rem', color:'#f1f5f9', marginBottom:'2px' }}>{course.title}</div>
                              {course.teacher && (
                                <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'8px' }}>
                                  👨‍🏫 {course.teacher?.name} {course.teacher?.employeeId ? `· ID: ${course.teacher.employeeId}` : ''}
                                </div>
                              )}
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>
                                <span>Progress</span><span style={{ color:'#38bdf8' }}>{e.progress}%</span>
                              </div>
                              <div style={{ height:6, background:'#0f172a', borderRadius:'999px', overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${e.progress}%`, background:'linear-gradient(90deg,#38bdf8,#34d399)', borderRadius:'999px', transition:'width 0.6s' }} />
                              </div>
                            </div>
                            <div style={{ marginLeft:'12px', textAlign:'right' }}>
                              <div style={{ fontSize:'0.72rem', color:'#fb923c' }}>🔥 {e.streak}d</div>
                              <div style={{ fontSize:'0.68rem', color:'#475569', marginTop:'2px' }}>
                                {new Date(e.lastAccessed).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <SectionHeader title="Recent Announcements" />
                    {announcements.length === 0 ? (
                      <EmptyState icon="📢" title="No announcements" />
                    ) : announcements.slice(0,4).map(a => (
                      <div key={a._id} style={{ ...S.card, padding:'0.9rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <div style={{ fontWeight:600, fontSize:'0.82rem', color:'#f1f5f9' }}>{a.title}</div>
                          <div style={{ width:7, height:7, borderRadius:'50%', background:priorityColors[a.priority], flexShrink:0, marginTop:3 }} />
                        </div>
                        <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'4px', lineHeight:1.4 }}>
                          {a.content.substring(0,80)}{a.content.length>80?'...':''}
                        </div>
                        <div style={{ fontSize:'0.68rem', color:'#475569' }}>
                          {a.author?.name} · {new Date(a.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'courses' && (
              <div>
                <SectionHeader title="My Enrolled Courses" subtitle={`${enrolled.length} course(s)`} />
                {enrolled.length === 0 ? (
                  <EmptyState icon="📚" title="No enrolled courses" action={<button className="btn btn-primary" onClick={() => setActiveTab('discover')}>Browse Courses</button>} />
                ) : enrolled.map(e => {
                  const course = e.course;
                  if (!course || typeof course === 'string') return null;
                  return (
                    <div key={e._id} style={{ ...S.card, cursor:'pointer' }} onClick={() => navigate(`/courses/${course._id}`)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'10px' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'1rem', color:'#f1f5f9', marginBottom:'6px' }}>{course.title}</div>

                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,auto)', gap:'8px', marginBottom:'10px', width:'fit-content' }}>
                            <div style={{ display:'flex', flexDirection:'column' }}>
                              <span style={{ fontSize:'0.68rem', color:'#64748b' }}>Teacher</span>
                              <span style={{ fontSize:'0.78rem', color:'#34d399', fontWeight:500 }}>{course.teacher?.name || '—'}</span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column' }}>
                              <span style={{ fontSize:'0.68rem', color:'#64748b' }}>Teacher ID</span>
                              <span style={{ fontSize:'0.78rem', color:'#38bdf8', fontWeight:500 }}>{course.teacher?.employeeId || '—'}</span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column' }}>
                              <span style={{ fontSize:'0.68rem', color:'#64748b' }}>Category</span>
                              <span style={{ fontSize:'0.78rem', color:'#a78bfa', fontWeight:500 }}>{course.category}</span>
                            </div>
                          </div>

                          <div style={{ marginBottom:'6px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>
                              <span>Progress</span>
                              <span style={{ color: e.progress>=100?'#34d399':'#38bdf8' }}>{e.progress}%</span>
                            </div>
                            <div style={{ height:7, background:'#0f172a', borderRadius:'999px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${e.progress}%`, background:'linear-gradient(90deg,#38bdf8,#34d399)', borderRadius:'999px' }} />
                            </div>
                          </div>

                          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                            <span style={S.badge('#38bdf8')}>📖 {course.lessons?.length||0} lessons</span>
                            <span style={S.badge('#fb923c')}>🔥 {e.streak}d streak</span>
                            {e.progress>=100 && <span style={S.badge('#34d399')}>✅ Completed</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:'2rem', fontWeight:800, color: e.progress>=100?'#34d399':e.progress>0?'#38bdf8':'#64748b' }}>
                            {e.progress}%
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={ev => { ev.stopPropagation(); navigate(`/courses/${course._id}`); }}>
                            {e.progress > 0 ? 'Continue' : 'Start'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'discover' && (
              <div>
                <SectionHeader title="Available Courses" subtitle="Courses you can join" />
                {allCourses.filter(c => !enrolledIds.has(c._id)).length === 0 ? (
                  <EmptyState icon="🎉" title="You're enrolled in all available courses!" />
                ) : (
                  <div className="grid-3">
                    {allCourses.filter(c => !enrolledIds.has(c._id)).map(c => {
                      const catColors = { programming:'#38bdf8', mathematics:'#a78bfa', science:'#34d399', arts:'#fb923c', language:'#fbbf24', other:'#64748b' };
                      const color     = catColors[c.category] || '#64748b';
                      return (
                        <div key={c._id} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'hidden', cursor:'pointer', transition:'all 0.2s' }}
                          onClick={() => navigate(`/courses/${c._id}`)}
                          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
                          <div style={{ height:100, background:`linear-gradient(135deg,${color}20,${color}08)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem' }}>
                            {{ programming:'💻', mathematics:'📐', science:'🔬', arts:'🎨', language:'📚', other:'📖' }[c.category] || '📖'}
                          </div>
                          <div style={{ padding:'1rem' }}>
                            <div style={{ fontWeight:600, fontSize:'0.9rem', color:'#f1f5f9', marginBottom:'4px' }}>{c.title}</div>
                            <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'8px' }}>👨‍🏫 {c.teacher?.name || 'No teacher'}</div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={S.badge(color)}>{c.level}</span>
                              <span style={{ fontSize:'0.72rem', color:'#64748b' }}>👥 {c.enrolledStudents?.length||0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'announcements' && (
              <div>
                <SectionHeader title="Announcements" subtitle={`${announcements.length} announcement(s)`} />
                {announcements.length === 0 ? (
                  <EmptyState icon="📢" title="No announcements" />
                ) : announcements.map(a => (
                  <div key={a._id} style={S.card}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'8px' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#f1f5f9', marginBottom:'4px' }}>{a.title}</div>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <span style={S.badge(priorityColors[a.priority])}>{a.priority}</span>
                          {a.isGlobal && <span style={S.badge('#38bdf8')}>Global</span>}
                          {a.course && <span style={S.badge('#34d399')}>{a.course?.title||'Course'}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'#475569', whiteSpace:'nowrap' }}>{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                    <p style={{ fontSize:'0.85rem', color:'#94a3b8', lineHeight:1.6, marginBottom:'6px' }}>{a.content}</p>
                    <div style={{ fontSize:'0.72rem', color:'#475569' }}>By {a.author?.name} ({a.author?.role})</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <AIChatbot />
    </div>
  );
}