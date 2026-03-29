// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role) => {
    const demos = {
      student: { email: 'student@demo.com', password: 'demo123' },
      teacher: { email: 'teacher@demo.com', password: 'demo123' },
      admin:   { email: 'admin@demo.com',   password: 'demo123' },
    };
    const { email, password } = demos[role];
    setForm({ email, password });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e', padding: '1rem',
    }}>
      {/* Background effect */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.06), transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '16px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
          }}>🎓</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.3rem' }}>
            EduCloud
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Sign in to your learning portal</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: '20px', padding: '2rem',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email" placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password" placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          {/* Demo logins */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
              DEMO ACCOUNTS
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['student', 'teacher', 'admin'].map(role => {
                const colors = { student: '#38bdf8', teacher: '#34d399', admin: '#a78bfa' };
                return (
                  <button key={role} onClick={() => demoLogin(role)} style={{
                    flex: 1, padding: '0.5rem', borderRadius: '8px',
                    background: `${colors[role]}15`, border: `1px solid ${colors[role]}30`,
                    color: colors[role], cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    textTransform: 'capitalize', transition: 'all 0.2s',
                  }}>
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.83rem', color: '#64748b', marginTop: '1.5rem' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#38bdf8', fontWeight: 500 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}