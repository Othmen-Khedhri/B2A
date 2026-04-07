import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import Toaster from './components/ui/Toaster';

// Auth pages — small, load eagerly
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/dashboard/layout/DashboardLayout';

// Dashboard pages — lazy loaded to split the 900KB bundle
const Overview      = lazy(() => import('./components/dashboard/overview/Overview'));
const ProjectsList  = lazy(() => import('./components/dashboard/projects/ProjectsList'));
const ProjectDetail = lazy(() => import('./components/dashboard/projects/ProjectDetail'));
const Staff         = lazy(() => import('./components/dashboard/staff/Staff'));
const StaffProfile  = lazy(() => import('./components/dashboard/staff/StaffProfile'));
const Assignments   = lazy(() => import('./components/dashboard/assignments/Assignments'));
const ImportPage    = lazy(() => import('./components/dashboard/import/ImportPage'));
const Estimation    = lazy(() => import('./components/dashboard/estimation/Estimation'));
const Clients       = lazy(() => import('./components/dashboard/clients/Clients'));
const ClientProfile = lazy(() => import('./components/dashboard/clients/ClientProfile'));
const ProjectPace   = lazy(() => import('./components/dashboard/projects/ProjectPace'));
const AuditLogs     = lazy(() => import('./components/dashboard/audit/AuditLogs'));
const AdminProfile  = lazy(() => import('./components/dashboard/profile/AdminProfile'));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#FFD600] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] font-medium">Chargement…</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                {/* Protected dashboard routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Suspense fallback={<PageLoader />}><Overview /></Suspense>} />
                  <Route path="projects" element={<Suspense fallback={<PageLoader />}><ProjectsList /></Suspense>} />
                  <Route path="projects/:id" element={<Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>} />
                  <Route path="staff" element={<Suspense fallback={<PageLoader />}><Staff /></Suspense>} />
                  <Route path="staff/:id" element={<Suspense fallback={<PageLoader />}><StaffProfile /></Suspense>} />
                  <Route path="assignments" element={<Suspense fallback={<PageLoader />}><Assignments /></Suspense>} />
                  <Route path="import" element={<Suspense fallback={<PageLoader />}><ImportPage /></Suspense>} />
                  <Route path="estimation" element={<Suspense fallback={<PageLoader />}><Estimation /></Suspense>} />
                  <Route path="clients" element={<Suspense fallback={<PageLoader />}><Clients /></Suspense>} />
                  <Route path="clients/:id" element={<Suspense fallback={<PageLoader />}><ClientProfile /></Suspense>} />
                  <Route path="pace" element={<Suspense fallback={<PageLoader />}><ProjectPace /></Suspense>} />
                  <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
                  <Route path="profile"   element={<Suspense fallback={<PageLoader />}><AdminProfile /></Suspense>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
              <Toaster />
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
