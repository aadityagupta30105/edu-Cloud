// src/components/common/StatCard.jsx
import React from 'react';

export function StatCard({ icon, label, value, color = '#38bdf8', trend }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at 100% 0%, ${color}15, transparent 70%)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
            {value}
          </div>
          {trend !== undefined && (
            <div style={{ fontSize: '0.75rem', color: trend >= 0 ? '#34d399' : '#f87171', marginTop: '0.3rem' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this month
            </div>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: `${color}20`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, fontSize: '1.2rem',
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Course Card ───────────────────────────────────────────────────────────────
export function CourseCard({ course, onEnroll, enrolled, onClick }) {
  const categoryColors = {
    programming: '#38bdf8', mathematics: '#a78bfa', science: '#34d399',
    arts: '#fb923c', language: '#fbbf24', other: '#64748b',
  };
  const color = categoryColors[course.category] || '#64748b';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e293b', borderRadius: '16px', overflow: 'hidden',
        border: '1px solid #334155', cursor: 'pointer',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 140, background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '3rem', borderBottom: '1px solid #334155',
        position: 'relative',
      }}>
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          { programming: '💻', mathematics: '📐', science: '🔬', arts: '🎨', language: '📚', other: '📖' }[course.category] || '📖'
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: `${color}20`, border: `1px solid ${color}30`,
          color, padding: '2px 8px', borderRadius: '999px',
          fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase',
        }}>
          {course.level}
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#f1f5f9', lineHeight: 1.3 }}>
          {course.title}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {course.description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
            👨‍🏫 {course.teacher?.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
            👥 {course.enrolledStudents?.length || 0}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px',
            background: `${color}15`, color, fontWeight: 600,
          }}>
            {course.category}
          </span>
          {onEnroll && (
            <button
              className={`btn btn-sm ${enrolled ? 'btn-secondary' : 'btn-primary'}`}
              onClick={e => { e.stopPropagation(); onEnroll(course._id); }}
            >
              {enrolled ? 'Enrolled ✓' : 'Enroll'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Spinner ───────────────────────────────────────────────────────────
export function Loader({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{text}</div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f1f5f9', marginBottom: '0.4rem' }}>{title}</div>
      {subtitle && <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>{subtitle}</div>}
      {action}
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: '16px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>{title}</h2>
        {subtitle && <p style={{ color: '#64748b', fontSize: '0.83rem', marginTop: '0.2rem' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}