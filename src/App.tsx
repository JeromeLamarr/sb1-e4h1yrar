import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { NewSubmissionPage } from './pages/NewSubmissionPage';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { EvaluatorDashboard } from './pages/EvaluatorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/UserManagement';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';
import { AllRecordsPage } from './pages/AllRecordsPage';
import { AssignmentManagementPage } from './pages/AssignmentManagementPage';
import { SettingsPage } from './pages/SettingsPage';

function DashboardRouter() {
  const { profile } = useAuth();

  if (!profile) {
    return <div>Loading...</div>;
  }

  const getDashboardComponent = () => {
    switch (profile.role) {
      case 'supervisor':
        return <SupervisorDashboard />;
      case 'evaluator':
        return <EvaluatorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <ApplicantDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={getDashboardComponent()} />
        <Route path="submit" element={<NewSubmissionPage />} />
        <Route path="submissions" element={<ApplicantDashboard />} />
        <Route path="submissions/:id" element={<SubmissionDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="review" element={<SupervisorDashboard />} />
        <Route path="evaluations" element={<EvaluatorDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="records" element={<AllRecordsPage />} />
        <Route path="assignments" element={<AssignmentManagementPage />} />
        <Route path="analytics" element={<AdminDashboard />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
                <p className="text-gray-600">You don't have permission to access this page.</p>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
