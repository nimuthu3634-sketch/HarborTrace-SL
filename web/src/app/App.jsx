import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import AlertsPanel from '../features/alerts/AlertsPanel';
import AnalyticsPanel from '../features/analytics/AnalyticsPanel';
import AuditPanel from '../features/audit/AuditPanel';
import { AuthProvider } from '../features/auth/AuthContext';
import BatchesPanel from '../features/batches/BatchesPanel';
import HarborsPanel from '../features/harbors/HarborsPanel';
import LandingsPanel from '../features/landings/LandingsPanel';
import NoticesPanel from '../features/notices/NoticesPanel';
import TripsPanel from '../features/trips/TripsPanel';
import VesselsPanel from '../features/vessels/VesselsPanel';
import ProtectedRoute from './ProtectedRoute';
import BatchVerifyPage from '../pages/BatchVerifyPage';
import DashboardPage from '../pages/DashboardPage';
import FeaturePage from '../pages/FeaturePage';
import LoginPage from '../pages/LoginPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify/:batchCode?" element={<BatchVerifyPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/trips" element={<FeaturePage title="Trip Registration & History"><TripsPanel /></FeaturePage>} />
                <Route path="/alerts" element={<FeaturePage title="Emergency / SOS Alerts"><AlertsPanel /></FeaturePage>} />
                <Route path="/landings" element={<FeaturePage title="Catch & Landing Intake"><LandingsPanel /></FeaturePage>} />
                <Route path="/batches" element={<FeaturePage title="Fish Batch Traceability"><BatchesPanel /></FeaturePage>} />
                <Route path="/notices" element={<FeaturePage title="Harbor Notices"><NoticesPanel /></FeaturePage>} />
                <Route path="/vessels" element={<FeaturePage title="Vessel Management"><VesselsPanel /></FeaturePage>} />
                <Route path="/harbors" element={<FeaturePage title="Harbor Management"><HarborsPanel /></FeaturePage>} />
                <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage title="Audit Log"><AuditPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage title="Admin Analytics"><AnalyticsPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
