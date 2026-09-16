import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary'; // F-2
import { LoginPage } from './pages/LoginPage';
import { PendingRequestsPage } from './pages/PendingRequestsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ConflictAlertsPage } from './pages/ConflictAlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DemoModePage } from './pages/DemoModePage';

export default function App() {
  return (
    // F-2: Top-level error boundary catches any unhandled render crash
    <ErrorBoundary>
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
                {/* Each page wrapped in its own boundary so one page crash doesn't kill the shell */}
                <Route index element={<ErrorBoundary><PendingRequestsPage /></ErrorBoundary>} />
                <Route path="schedule"  element={<ErrorBoundary><SchedulePage /></ErrorBoundary>} />
                <Route path="conflicts" element={<ErrorBoundary><ConflictAlertsPage /></ErrorBoundary>} />
                <Route path="analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                <Route path="demo"      element={<ErrorBoundary><DemoModePage /></ErrorBoundary>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
