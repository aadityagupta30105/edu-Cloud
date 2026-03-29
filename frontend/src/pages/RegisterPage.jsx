// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created successfully!');
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'student', label: 'Student', icon: '👨‍🎓', color: '#38bdf8', desc: 'Access courses & learn' },
    { value: 'teacher', label: 'Teacher', icon: '👨‍🏫', color: '#34d399', desc: 'Create & manage courses' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 460, animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: '16px', margin: '0 auto 1rem', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>🎓</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.3rem' }}>Create Account</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Join the EduCloud learning platform</p>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Role selector */}
            <div>
              <label className="label">I am a...</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {roles.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setForm(p => ({ ...p, role: r.value }))}
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '12px', cursor: 'pointer',
                      background: form.role === r.value ? `${r.color}15` : '#1e293b',
                      border: `2px solid ${form.role === r.value ? r.color : '#334155'}`,
                      color: form.role === r.value ? r.color : '#64748b',
                      transition: 'all 0.2s', textAlign: 'center',
                    }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{r.icon}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.7 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="John Doe"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} minLength={6} required />
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.83rem', color: '#64748b', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#38bdf8', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}