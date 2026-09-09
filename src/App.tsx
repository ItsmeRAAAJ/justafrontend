import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { PendingRequestsPage } from './pages/PendingRequestsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ConflictAlertsPage } from './pages/ConflictAlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DemoModePage } from './pages/DemoModePage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<PendingRequestsPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="conflicts" element={<ConflictAlertsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="demo" element={<DemoModePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
