// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Pages
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import StudentDashboard  from './pages/StudentDashboard';
import TeacherDashboard  from './pages/TeacherDashboard';
import AdminDashboard    from './pages/AdminDashboard';
import CoursePage        from './pages/CoursePage';
import CourseCatalog     from './pages/CourseCatalog';
import NotFound          from './pages/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0f172a',
      }}>
        <div style={{ color: '#38bdf8', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};

// Dashboard redirector
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Auto-redirect to role dashboard */}
      <Route path="/" element={<DashboardRedirect />} />

      {/* Student */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      {/* Teacher */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Shared */}
      <Route path="/courses" element={
        <ProtectedRoute>
          <CourseCatalog />
        </ProtectedRoute>
      } />
      <Route path="/courses/:id" element={
        <ProtectedRoute>
          <CoursePage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}