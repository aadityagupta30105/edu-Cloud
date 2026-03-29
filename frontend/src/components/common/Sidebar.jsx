// src/components/common/Sidebar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, Bell, Settings,
  LogOut, ChevronLeft, ChevronRight, Brain, BarChart3,
  Video, FileText, PlusCircle, Shield
} from 'lucide-react';

const navItems = {
  student: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/student' },
    { icon: BookOpen,        label: 'My Courses',   path: '/courses' },
    { icon: Bell,            label: 'Announcements',path: '/student#announcements' },
    { icon: Brain,           label: 'AI Assistant', path: '/student#ai' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/teacher' },
    { icon: BookOpen,        label: 'My Courses',   path: '/courses' },
    { icon: PlusCircle,      label: 'Create Course',path: '/teacher#create' },
    { icon: Video,           label: 'Live Classes', path: '/teacher#live' },
    { icon: FileText,        label: 'Assignments',  path: '/teacher#assignments' },
    { icon: BarChart3,       label: 'Analytics',    path: '/teacher#analytics' },
    { icon: Bell,            label: 'Announcements',path: '/teacher#announce' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/admin' },
    { icon: Users,           label: 'Users',        path: '/admin#users' },
    { icon: BookOpen,        label: 'Courses',      path: '/courses' },
    { icon: BarChart3,       label: 'Analytics',    path: '/admin#analytics' },
    { icon: Shield,          label: 'Roles',        path: '/admin#roles' },
    { icon: Bell,            label: 'Announcements',path: '/admin#announce' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const items = navItems[user?.role] || [];
  const roleColors = { student: '#38bdf8', teacher: '#34d399', admin: '#a78bfa' };
  const roleColor = roleColors[user?.role] || '#38bdf8';

  return (
    <aside style={{
      width: collapsed ? '72px' : '240px',
      minHeight: '100vh',
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'sticky', top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '1.5rem 1rem' : '1.5rem',
        display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: `linear-gradient(135deg, ${roleColor}, ${roleColor}80)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
        }}>🎓</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>
              EduCloud
            </div>
            <div style={{ fontSize: '0.7rem', color: roleColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user?.role}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`,
              border: `2px solid ${roleColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 700, color: roleColor, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {items.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path.split('#')[0] && !path.includes('#');
          return (
            <Link key={path} to={path} style={{ textDecoration: 'none' }}
              onClick={() => {
                const hash = path.split('#')[1];
                if (hash) {
                  setTimeout(() => {
                    const el = document.getElementById(hash);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: collapsed ? '0.75rem 1.2rem' : '0.7rem 1.25rem',
                margin: '2px 0.5rem', borderRadius: '10px',
                background: isActive ? `${roleColor}15` : 'transparent',
                color: isActive ? roleColor : '#64748b',
                transition: 'all 0.2s',
                cursor: 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => {
                if (!isActive) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#f1f5f9'; }
              }}
              onMouseLeave={e => {
                if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }
              }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: '0.88rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '0.75rem 0', borderTop: '1px solid #1e293b' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: collapsed ? '0.75rem 1.2rem' : '0.7rem 1.25rem',
            margin: '2px 0.5rem', borderRadius: '10px', width: 'calc(100% - 1rem)',
            background: 'transparent', border: 'none',
            color: '#64748b', cursor: 'pointer', transition: 'all 0.2s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} />
          {!collapsed && <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '0.6rem',
            margin: '4px 0.5rem 0', width: 'calc(100% - 1rem)',
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', cursor: 'pointer', borderRadius: '8px',
            fontSize: '0.78rem',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}