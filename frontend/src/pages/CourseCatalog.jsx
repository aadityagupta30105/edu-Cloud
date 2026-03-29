// src/pages/CourseCatalog.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI } from '../services/api';
import Sidebar from '../components/common/Sidebar';
import { CourseCard, Loader, EmptyState } from '../components/common/UIComponents';
import toast from 'react-hot-toast';

export default function CourseCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', level: '', search: '' });

  useEffect(() => { loadCourses(); }, [filters]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await coursesAPI.getAll(filters);
      setCourses(res.data.courses);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await coursesAPI.enroll(courseId);
      toast.success('Enrolled successfully! 🎉');
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    }
  };

  const enrolledIds = new Set(user?.enrolledCourses?.map(e => e.course?._id || e.course) || []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.3rem' }}>Course Catalog</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>{courses.length} courses available</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search courses..." value={filters.search} style={{ width: 260 }}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
          <select className="input" value={filters.category} style={{ width: 160 }}
            onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
            <option value="">All Categories</option>
            {['programming','mathematics','science','arts','language','other'].map(c =>
              <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={filters.level} style={{ width: 140 }}
            onChange={e => setFilters(p => ({ ...p, level: e.target.value }))}>
            <option value="">All Levels</option>
            {['beginner','intermediate','advanced'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {loading ? <Loader /> : courses.length === 0 ? (
          <EmptyState icon="🔍" title="No courses found" subtitle="Try adjusting your filters" />
        ) : (
          <div className="grid-3">
            {courses.map(course => (
              <CourseCard key={course._id} course={course}
                enrolled={enrolledIds.has(course._id)}
                onEnroll={user?.role === 'student' && !enrolledIds.has(course._id) ? handleEnroll : null}
                onClick={() => navigate(`/courses/${course._id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}