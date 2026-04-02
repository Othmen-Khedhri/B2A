import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/dashboard/layout/DashboardLayout';
import Overview from './components/dashboard/overview/Overview';
import ProjectsList from './components/dashboard/projects/ProjectsList';
import ProjectDetail from './components/dashboard/projects/ProjectDetail';
import Staff from './components/dashboard/staff/Staff';
import StaffProfile from './components/dashboard/staff/StaffProfile';
import Assignments from './components/dashboard/assignments/Assignments';
import ImportPage from './components/dashboard/import/ImportPage';
import Estimation from './components/dashboard/estimation/Estimation';
import Clients from './components/dashboard/clients/Clients';
import ClientProfile from './components/dashboard/clients/ClientProfile';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
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
              <Route index element={<Overview />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="staff" element={<Staff />} />
              <Route path="staff/:id" element={<StaffProfile />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="estimation" element={<Estimation />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientProfile />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
