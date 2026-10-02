import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { LoadingSpinner, ErrorBoundary } from './components';
import HomePage from './pages/HomePage';
import StudentRegister from './pages/StudentRegister';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import PrincipalSetup from './pages/PrincipalSetup';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TestTaking from './pages/TestTaking';
import TestResult from './pages/TestResult';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { isAuthenticated, isLoading, user } = useApp();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user, isLoading } = useApp();
  if (isLoading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<StudentRegister />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/setup" element={<PrincipalSetup />} />
      <Route path="/student/*" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/teacher/*" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/principal/*" element={<ProtectedRoute roles={['principal']}><PrincipalDashboard /></ProtectedRoute>} />
      <Route path="/test/:testId" element={<ProtectedRoute roles={['student']}><TestTaking /></ProtectedRoute>} />
      <Route path="/result/:attemptId" element={<ProtectedRoute roles={['student']}><TestResult /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
