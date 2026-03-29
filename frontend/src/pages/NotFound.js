// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e', flexDirection: 'column', gap: '1rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '5rem' }}>🌌</div>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#f1f5f9' }}>404</h1>
      <p style={{ color: '#64748b', fontSize: '1rem' }}>This page doesn't exist in our universe.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}