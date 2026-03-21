import { Suspense, lazy } from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const DownloaderPage = lazy(() => import('./pages/DownloaderPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/downloader" element={<DownloaderPage />} />
              <Route path="/projects/:id" element={<ProjectPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
