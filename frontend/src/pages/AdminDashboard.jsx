// src/pages/AdminDashboard.jsx  — fully fixed
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, usersAPI, coursesAPI, announcementsAPI } from '../services/api';
import Sidebar from '../components/common/Sidebar';
import { StatCard, Loader, SectionHeader, Modal, EmptyState } from '../components/common/UIComponents';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f87171', '#fbbf24'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RC = { student: '#38bdf8', teacher: '#34d399', admin: '#a78bfa' };

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const [analytics,     setAnalytics]     = useState(null);
  const [users,         setUsers]         = useState([]);
  const [courses,       setCourses]       = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('overview');

  const [editUser,        setEditUser]        = useState(null);
  const [enrollModal,     setEnrollModal]     = useState(null);
  const [assignModal,     setAssignModal]     = useState(null);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [announceModal,   setAnnounceModal]   = useState(false);

  const [userSearch,    setUserSearch]    = useState('');
  const [courseSearch,  setCourseSearch]  = useState('');
  const [userFilter,    setUserFilter]    = useState('');

  const [newUserForm,     setNewUserForm]     = useState({ name:'', email:'', password:'', role:'student' });
  const [announceForm,    setAnnounceForm]    = useState({ title:'', content:'', priority:'medium', isGlobal:true, course:'' });
  const [enrollCourseId,  setEnrollCourseId]  = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, uRes, cRes, anRes] = await Promise.all([
        analyticsAPI.overview(),
        usersAPI.getAll(),
        coursesAPI.getAll(),
        announcementsAPI.getAll(),
      ]);
      setAnalytics(aRes.data);
      setUsers(uRes.data.users || []);
      setCourses(cRes.data.courses || []);
      setAnnouncements(anRes.data.announcements || []);
    } catch (err) {
      toast.error('Failed to load: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredUsers = users.filter(u => {
    const matchRole   = !userFilter || u.role === userFilter;
    const matchSearch = !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const filteredCourses = courses.filter(c =>
    !courseSearch || c.title?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');

  const monthlyData = analytics?.monthlySignups?.map(m => ({
    name: MONTHS[m._id.month - 1], signups: m.count,
  })) || [];

  const roleData = analytics ? [
    { name: 'Students', value: analytics.stats.students || 0 },
    { name: 'Teachers', value: analytics.stats.teachers || 0 },
    { name: 'Admins',   value: Math.max(0, (analytics.stats.totalUsers || 0) - (analytics.stats.students || 0) - (analytics.stats.teachers || 0)) },
  ] : [];

  const updateUser = async () => {
    try {
      await usersAPI.update(editUser._id, { role: editUser.role, isActive: editUser.isActive });
      toast.success('User updated!'); setEditUser(null); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await usersAPI.delete(id); toast.success('Deleted'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.create(newUserForm);
      toast.success('User created!');
      setCreateUserModal(false);
      setNewUserForm({ name:'', email:'', password:'', role:'student' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const enrollStudent = async () => {
    if (!enrollCourseId) return toast.error('Select a course');
    try {
      const res = await usersAPI.enrollStudent(enrollModal._id, enrollCourseId);
      toast.success(res.data.message); setEnrollModal(null); setEnrollCourseId(''); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Enroll failed'); }
  };

  const unenrollStudent = async (studentId, courseId, sName, cTitle) => {
    if (!window.confirm(`Remove ${sName} from ${cTitle}?`)) return;
    try { await usersAPI.unenrollStudent(studentId, courseId); toast.success('Removed'); loadAll(); }
    catch (err) { toast.error('Failed'); }
  };

  const assignTeacher = async () => {
    if (!assignTeacherId) return toast.error('Select a teacher');
    try {
      const res = await usersAPI.assignTeacher(assignTeacherId, assignModal._id);
      toast.success(res.data.message); setAssignModal(null); setAssignTeacherId(''); loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await announcementsAPI.create({ ...announceForm, course: announceForm.course || undefined });
      toast.success('Posted!'); setAnnounceModal(false);
      setAnnounceForm({ title:'', content:'', priority:'medium', isGlobal:true, course:'' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await announcementsAPI.delete(id); toast.success('Deleted'); loadAll(); }
    catch (err) { toast.error('Failed'); }
  };

  const deleteCourse = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try { await coursesAPI.delete(id); toast.success('Course deleted'); loadAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const tabs = ['overview', 'users', 'courses', 'announcements', 'analytics'];

  const TH = ({ children }) => (
    <th style={{ padding:'0.85rem 1rem', textAlign:'left', fontSize:'0.72rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{children}</th>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', padding:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
          <div>
            <h1 style={{ fontSize:'1.6rem', fontWeight:700, color:'#f1f5f9' }}>Admin Dashboard</h1>
            <p style={{ color:'#64748b', fontSize:'0.88rem' }}>Platform overview and management</p>
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setAnnounceModal(true)}>📢 Announce</button>
            <button className="btn btn-primary btn-sm"   onClick={() => setCreateUserModal(true)}>+ Add User</button>
          </div>
        </div>

        <div style={{ display:'flex', gap:'4px', background:'#0f172a', padding:'4px', borderRadius:'12px', marginBottom:'2rem', width:'fit-content', flexWrap:'wrap' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:'0.5rem 1.1rem', borderRadius:'8px', border:'none', cursor:'pointer',
              background: activeTab===tab ? '#1e293b' : 'transparent',
              color: activeTab===tab ? '#f1f5f9' : '#64748b',
              fontWeight:500, fontSize:'0.83rem', textTransform:'capitalize', transition:'all 0.2s',
            }}>{tab}</button>
          ))}
        </div>

        {loading ? <Loader text="Loading dashboard..." /> : (
          <>
            {/* OVERVIEW */}
            {activeTab==='overview' && (
              <div className="animate-fadeIn">
                <div className="grid-4" style={{ marginBottom:'2rem' }}>
                  <StatCard icon="👥" label="Total Users"   value={analytics?.stats.totalUsers??0}          color="#38bdf8" />
                  <StatCard icon="📚" label="Total Courses" value={analytics?.stats.totalCourses??0}        color="#34d399" />
                  <StatCard icon="📝" label="Total Quizzes" value={analytics?.stats.totalQuizzes??0}        color="#a78bfa" />
                  <StatCard icon="📢" label="Announcements" value={analytics?.stats.totalAnnouncements??0}  color="#fb923c" />
                </div>
                <div className="grid-2">
                  <div className="card">
                    <SectionHeader title="User Distribution" subtitle="Breakdown by role" />
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                          {roleData.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9' }} />
                        <Legend formatter={v => <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card">
                    <SectionHeader title="Monthly Signups" subtitle="New registrations" />
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} />
                          <YAxis tick={{ fill:'#64748b', fontSize:11 }} />
                          <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9' }} />
                          <Line type="monotone" dataKey="signups" stroke="#38bdf8" strokeWidth={2} dot={{ fill:'#38bdf8' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'0.85rem' }}>No signup data yet</div>}
                  </div>
                  <div className="card">
                    <SectionHeader title="Top Courses" subtitle="By enrollment" />
                    {analytics?.enrollmentStats?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.enrollmentStats} layout="vertical">
                          <XAxis type="number" tick={{ fill:'#64748b', fontSize:11 }} />
                          <YAxis dataKey="title" type="category" width={130} tick={{ fill:'#94a3b8', fontSize:10 }} />
                          <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9' }} />
                          <Bar dataKey="enrolledCount" fill="#34d399" radius={[0,4,4,0]} name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon="📊" title="No enrollment data yet" />}
                  </div>
                  <div className="card">
                    <SectionHeader title="Recent Signups" subtitle="Latest registrations" />
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                      {analytics?.recentUsers?.map(u => (
                        <div key={u._id} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:`${RC[u.role]||'#38bdf8'}20`, border:`1px solid ${RC[u.role]||'#38bdf8'}30`, display:'flex', alignItems:'center', justifyContent:'center', color:RC[u.role]||'#38bdf8', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'0.85rem', fontWeight:500, color:'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                            <div style={{ fontSize:'0.72rem', color:'#64748b' }}>{u.email}</div>
                          </div>
                          <span className={`badge badge-${u.role==='student'?'blue':u.role==='teacher'?'green':'purple'}`}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {activeTab==='users' && (
              <div className="animate-fadeIn">
                <div style={{ display:'flex', gap:'10px', marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
                  <input className="input" placeholder="Search name or email..." value={userSearch}
                    onChange={e => setUserSearch(e.target.value)} style={{ width:240 }} />
                  <select className="input" value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ width:170 }}>
                    <option value="">All Roles ({users.length})</option>
                    <option value="student">Students ({students.length})</option>
                    <option value="teacher">Teachers ({teachers.length})</option>
                    <option value="admin">Admins ({users.filter(u=>u.role==='admin').length})</option>
                  </select>
                  <span style={{ color:'#64748b', fontSize:'0.83rem' }}>{filteredUsers.length} shown</span>
                  <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto' }} onClick={() => setCreateUserModal(true)}>+ Add User</button>
                </div>
                <div style={{ background:'#0f172a', borderRadius:'16px', border:'1px solid #1e293b', overflow:'hidden', overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                    <thead><tr style={{ borderBottom:'1px solid #1e293b' }}>
                      <TH>User</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH>Courses</TH><TH>Actions</TH>
                    </tr></thead>
                    <tbody>
                      {filteredUsers.length===0 ? (
                        <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#475569' }}>No users found</td></tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u._id} style={{ borderBottom:'1px solid #1e293b' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#1e293b'}
                          onMouseLeave={e=>e.currentTarget.style.background=''}>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:`${RC[u.role]||'#38bdf8'}15`, display:'flex', alignItems:'center', justifyContent:'center', color:RC[u.role]||'#38bdf8', fontWeight:700, fontSize:'0.8rem', flexShrink:0 }}>
                                {u.name?.[0]?.toUpperCase()}
                              </div>
                              <span style={{ fontSize:'0.85rem', fontWeight:500, color:'#f1f5f9' }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ padding:'0.75rem 1rem', fontSize:'0.78rem', color:'#64748b' }}>{u.email}</td>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <span className={`badge badge-${u.role==='student'?'blue':u.role==='teacher'?'green':'purple'}`}>{u.role}</span>
                          </td>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', color:u.isActive?'#34d399':'#f87171' }}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:u.isActive?'#34d399':'#f87171' }} />
                              {u.isActive?'Active':'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding:'0.75rem 1rem', fontSize:'0.78rem' }}>
                            {u.role==='student' ? (
                              <div>
                                {(u.enrolledCourses?.length||0)===0
                                  ? <span style={{ color:'#475569' }}>None</span>
                                  : u.enrolledCourses.slice(0,2).map((e,i) => (
                                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                                      <span style={{ fontSize:'0.72rem', color:'#38bdf8' }}>{e.course?.title||'Course'}</span>
                                      <button onClick={() => unenrollStudent(u._id, e.course?._id||e.course, u.name, e.course?.title||'course')}
                                        style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:'0.8rem', lineHeight:1 }}>×</button>
                                    </div>
                                  ))
                                }
                                {(u.enrolledCourses?.length||0)>2 && <span style={{ color:'#64748b', fontSize:'0.7rem' }}>+{u.enrolledCourses.length-2} more</span>}
                              </div>
                            ) : u.role==='teacher' ? (
                              <span style={{ color:'#34d399' }}>{u.teachingCourses?.length||0} course(s)</span>
                            ) : <span style={{ color:'#a78bfa' }}>—</span>}
                          </td>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditUser({...u})}>Edit</button>
                              {u.role==='student' && (
                                <button onClick={() => { setEnrollModal(u); setEnrollCourseId(''); }}
                                  style={{ background:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.2)', borderRadius:'6px', padding:'3px 8px', cursor:'pointer', fontSize:'0.72rem', fontWeight:600 }}>
                                  + Enroll
                                </button>
                              )}
                              <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u._id, u.name)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COURSES */}
            {activeTab==='courses' && (
              <div className="animate-fadeIn">
                <div style={{ display:'flex', gap:'10px', marginBottom:'1.25rem', alignItems:'center' }}>
                  <input className="input" placeholder="Search courses..." value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)} style={{ width:260 }} />
                  <span style={{ color:'#64748b', fontSize:'0.83rem' }}>{filteredCourses.length} courses</span>
                </div>
                <div style={{ background:'#0f172a', borderRadius:'16px', border:'1px solid #1e293b', overflow:'hidden', overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                    <thead><tr style={{ borderBottom:'1px solid #1e293b' }}>
                      <TH>Course</TH><TH>Teacher</TH><TH>Category</TH><TH>Students</TH><TH>Published</TH><TH>Actions</TH>
                    </tr></thead>
                    <tbody>
                      {filteredCourses.length===0 ? (
                        <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#475569' }}>No courses found</td></tr>
                      ) : filteredCourses.map(c => (
                        <tr key={c._id} style={{ borderBottom:'1px solid #1e293b' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#1e293b'}
                          onMouseLeave={e=>e.currentTarget.style.background=''}>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <div style={{ fontWeight:500, fontSize:'0.88rem', color:'#f1f5f9' }}>{c.title}</div>
                            <div style={{ fontSize:'0.7rem', color:'#64748b' }}>{c.lessons?.length||0} lessons · {c.level}</div>
                          </td>
                          <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#34d399' }}>{c.teacher?.name||'—'}</td>
                          <td style={{ padding:'0.75rem 1rem' }}><span className="badge badge-blue">{c.category}</span></td>
                          <td style={{ padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#94a3b8' }}>👥 {c.enrolledStudents?.length||0}</td>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <span style={{ fontSize:'0.75rem', color:c.isPublished?'#34d399':'#f87171' }}>{c.isPublished?'✓ Published':'✗ Draft'}</span>
                          </td>
                          <td style={{ padding:'0.75rem 1rem' }}>
                            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/courses/${c._id}`)}>View</button>
                              <button onClick={() => { setAssignModal(c); setAssignTeacherId(''); }}
                                style={{ background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'6px', padding:'3px 8px', cursor:'pointer', fontSize:'0.72rem', fontWeight:600 }}>
                                Assign Teacher
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(c._id, c.title)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS */}
            {activeTab==='announcements' && (
              <div className="animate-fadeIn">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                  <div>
                    <h2 style={{ fontWeight:700, fontSize:'1rem', color:'#f1f5f9' }}>Announcements</h2>
                    <p style={{ color:'#64748b', fontSize:'0.8rem' }}>{announcements.length} total</p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setAnnounceModal(true)}>+ New Announcement</button>
                </div>
                {announcements.length===0 ? (
                  <EmptyState icon="📢" title="No announcements yet" action={<button className="btn btn-primary" onClick={() => setAnnounceModal(true)}>Create First</button>} />
                ) : announcements.map(a => {
                  const pc = { high:'#f87171', medium:'#fbbf24', low:'#34d399' };
                  return (
                    <div key={a._id} className="card" style={{ marginBottom:'0.75rem', padding:'1rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'0.3rem', flexWrap:'wrap' }}>
                            <div style={{ fontWeight:600, fontSize:'0.92rem', color:'#f1f5f9' }}>{a.title}</div>
                            <span style={{ background:`${pc[a.priority]}15`, color:pc[a.priority], padding:'1px 8px', borderRadius:'999px', fontSize:'0.68rem', fontWeight:600, textTransform:'uppercase' }}>{a.priority}</span>
                            {a.isGlobal && <span className="badge badge-blue">Global</span>}
                            {a.course && <span className="badge badge-green">{a.course?.title||'Course'}</span>}
                          </div>
                          <p style={{ fontSize:'0.82rem', color:'#94a3b8', lineHeight:1.5, marginBottom:'0.4rem' }}>{a.content}</p>
                          <div style={{ fontSize:'0.72rem', color:'#475569' }}>
                            By {a.author?.name} ({a.author?.role}) · {new Date(a.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAnnouncement(a._id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ANALYTICS */}
            {activeTab==='analytics' && (
              <div className="animate-fadeIn">
                <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
                  {[
                    { l:'Total Users',   v:analytics?.stats.totalUsers??0,   c:'#38bdf8', i:'👥' },
                    { l:'Students',      v:analytics?.stats.students??0,      c:'#38bdf8', i:'👨‍🎓' },
                    { l:'Teachers',      v:analytics?.stats.teachers??0,      c:'#34d399', i:'👨‍🏫' },
                    { l:'Total Courses', v:analytics?.stats.totalCourses??0,  c:'#a78bfa', i:'📚' },
                  ].map(s => <StatCard key={s.l} icon={s.i} label={s.l} value={s.v} color={s.c} />)}
                </div>
                <div className="grid-2">
                  <div className="card">
                    <SectionHeader title="Monthly Signups" subtitle="6-month trend" />
                    {monthlyData.length>0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} />
                          <YAxis tick={{ fill:'#64748b', fontSize:11 }} />
                          <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9' }} />
                          <Line type="monotone" dataKey="signups" stroke="#38bdf8" strokeWidth={2} dot={{ fill:'#38bdf8', r:4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon="📈" title="No signup data yet" />}
                  </div>
                  <div className="card">
                    <SectionHeader title="Course Enrollment" subtitle="Top 5 courses" />
                    {analytics?.enrollmentStats?.length>0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={analytics.enrollmentStats} layout="vertical">
                          <XAxis type="number" tick={{ fill:'#64748b', fontSize:11 }} />
                          <YAxis dataKey="title" type="category" width={130} tick={{ fill:'#94a3b8', fontSize:10 }} />
                          <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9' }} />
                          <Bar dataKey="enrolledCount" fill="#38bdf8" radius={[0,4,4,0]} name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState icon="📊" title="No enrollment data" />}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.name}`}>
        {editUser && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div><label className="label">Name</label><input className="input" value={editUser.name} readOnly style={{ opacity:0.6 }} /></div>
            <div><label className="label">Email</label><input className="input" value={editUser.email} readOnly style={{ opacity:0.6 }} /></div>
            <div><label className="label">Role</label>
              <select className="input" value={editUser.role} onChange={e => setEditUser(p => ({...p, role:e.target.value}))}>
                <option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>
              </select></div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <input type="checkbox" id="ac" checked={editUser.isActive} onChange={e => setEditUser(p => ({...p, isActive:e.target.checked}))} />
              <label htmlFor="ac" style={{ fontSize:'0.85rem', color:'#94a3b8' }}>Account Active</label>
            </div>
            <button className="btn btn-primary" onClick={updateUser} style={{ width:'100%' }}>Save Changes</button>
          </div>
        )}
      </Modal>

      {/* Create User Modal */}
      <Modal open={createUserModal} onClose={() => setCreateUserModal(false)} title="Create New User">
        <form onSubmit={createUser} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label className="label">Full Name *</label><input className="input" value={newUserForm.name} onChange={e => setNewUserForm(p=>({...p,name:e.target.value}))} required /></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={newUserForm.email} onChange={e => setNewUserForm(p=>({...p,email:e.target.value}))} required /></div>
          <div><label className="label">Password</label><input className="input" type="password" placeholder="Default: changeme123" value={newUserForm.password} onChange={e => setNewUserForm(p=>({...p,password:e.target.value}))} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={newUserForm.role} onChange={e => setNewUserForm(p=>({...p,role:e.target.value}))}>
              <option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>
            </select></div>
          <button className="btn btn-primary" type="submit" style={{ width:'100%' }}>Create User</button>
        </form>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal open={!!enrollModal} onClose={() => setEnrollModal(null)} title={`Enroll ${enrollModal?.name}`} width={500}>
        {enrollModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Enrolled in {enrollModal.enrolledCourses?.length||0} course(s)</p>
            <div><label className="label">Select Course to Enroll In</label>
              <select className="input" value={enrollCourseId} onChange={e => setEnrollCourseId(e.target.value)}>
                <option value="">— Choose a course —</option>
                {courses.filter(c => !enrollModal.enrolledCourses?.some(e => (e.course?._id||e.course)===c._id))
                  .map(c => <option key={c._id} value={c._id}>{c.title} ({c.teacher?.name||'No teacher'})</option>)}
              </select></div>
            <button className="btn btn-primary" onClick={enrollStudent} disabled={!enrollCourseId} style={{ width:'100%' }}>Enroll Student</button>
            {(enrollModal.enrolledCourses?.length||0)>0 && (
              <div>
                <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:'0.5rem', fontWeight:600 }}>Current Enrollments (click × to remove):</div>
                {enrollModal.enrolledCourses.map((e,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #1e293b' }}>
                    <div>
                      <span style={{ fontSize:'0.82rem', color:'#f1f5f9' }}>{e.course?.title||'Course'}</span>
                      <span style={{ fontSize:'0.7rem', color:'#64748b', marginLeft:'8px' }}>{e.progress||0}% progress</span>
                    </div>
                    <button onClick={() => unenrollStudent(enrollModal._id, e.course?._id||e.course, enrollModal.name, e.course?.title||'course')}
                      className="btn btn-danger btn-sm">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Assign Teacher to "${assignModal?.title}"`}>
        {assignModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'8px', padding:'0.75rem', fontSize:'0.85rem', color:'#94a3b8' }}>
              Current: <strong style={{ color:'#34d399' }}>{assignModal.teacher?.name||'No teacher assigned'}</strong>
            </div>
            <div><label className="label">Select New Teacher</label>
              <select className="input" value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}>
                <option value="">— Choose a teacher —</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name} — {t.email}</option>)}
              </select></div>
            {teachers.length===0 && <p style={{ color:'#f87171', fontSize:'0.82rem' }}>⚠️ No teacher accounts found. Create one first in Users tab.</p>}
            <button className="btn btn-primary" onClick={assignTeacher} disabled={!assignTeacherId||teachers.length===0} style={{ width:'100%' }}>Assign Teacher</button>
          </div>
        )}
      </Modal>

      {/* Announcement Modal */}
      <Modal open={announceModal} onClose={() => setAnnounceModal(false)} title="Post Announcement">
        <form onSubmit={postAnnouncement} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label className="label">Title *</label><input className="input" value={announceForm.title} onChange={e => setAnnounceForm(p=>({...p,title:e.target.value}))} required placeholder="Announcement title" /></div>
          <div><label className="label">Content *</label><textarea className="input" rows={4} value={announceForm.content} onChange={e => setAnnounceForm(p=>({...p,content:e.target.value}))} required placeholder="Write your announcement..." /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div><label className="label">Priority</label>
              <select className="input" value={announceForm.priority} onChange={e => setAnnounceForm(p=>({...p,priority:e.target.value}))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select></div>
            <div><label className="label">Target Course (optional)</label>
              <select className="input" value={announceForm.course} onChange={e => setAnnounceForm(p=>({...p,course:e.target.value}))}>
                <option value="">All users (global)</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <input type="checkbox" id="gCheck" checked={announceForm.isGlobal} onChange={e => setAnnounceForm(p=>({...p,isGlobal:e.target.checked}))} />
            <label htmlFor="gCheck" style={{ fontSize:'0.85rem', color:'#94a3b8' }}>Broadcast to all users</label>
          </div>
          <button className="btn btn-primary" type="submit" style={{ width:'100%' }}>📢 Post Announcement</button>
        </form>
      </Modal>
    </div>
  );
}