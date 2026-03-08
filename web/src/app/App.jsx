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
import AboutPage from '../pages/AboutPage';
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
                <Route path="/trips" element={<FeaturePage title="Voyage Registration & Sea Log"><TripsPanel /></FeaturePage>} />
                <Route path="/alerts" element={<FeaturePage title="Fisher Safety & Incident Alerts"><AlertsPanel /></FeaturePage>} />
                <Route path="/landings" element={<FeaturePage title="Catch Landing Intake & Verification"><LandingsPanel /></FeaturePage>} />
                <Route path="/batches" element={<FeaturePage title="Catch Batch Traceability"><BatchesPanel /></FeaturePage>} />
                <Route path="/notices" element={<FeaturePage title="Harbor Operations Bulletins"><NoticesPanel /></FeaturePage>} />
                <Route path="/vessels" element={<FeaturePage title="Fishing Vessel Registry"><VesselsPanel /></FeaturePage>} />
                <Route path="/harbors" element={<FeaturePage title="Port & Harbor Directory"><HarborsPanel /></FeaturePage>} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage title="Regulatory Audit Trail"><AuditPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage title="Fisheries Performance Analytics"><AnalyticsPanel /></FeaturePage></ProtectedRoute>} />
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
