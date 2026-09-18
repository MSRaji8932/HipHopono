import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProjectProvider } from './context/ProjectContext.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
import { ToastProvider } from './components/ui/toast.tsx';
import Login from './pages/Login.tsx';
import Workspace from './pages/Workspace.tsx';
import Settings from './pages/Settings.tsx';
import ProjectPicker from './pages/ProjectPicker.tsx';
import { useAuth } from './context/AuthContext.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-text-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/project" replace /> : <Login />}
      />
      <Route
        path="/project"
        element={
          <ProtectedRoute>
            <ProjectPicker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setting"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/project" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <ProjectProvider>
              <AppRoutes />
            </ProjectProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
