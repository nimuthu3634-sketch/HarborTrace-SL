import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import AlertsPanel from '../features/alerts/AlertsPanel';
import AnalyticsPanel from '../features/analytics/AnalyticsPanel';
import AuditPanel from '../features/audit/AuditPanel';
import { AuthProvider } from '../features/auth/AuthContext';
import BatchesPanel from '../features/batches/BatchesPanel';
import HarborsPanel from '../features/harbors/HarborsPanel';
import NoticesPanel from '../features/notices/NoticesPanel';
import VesselsPanel from '../features/vessels/VesselsPanel';
import ProtectedRoute from './ProtectedRoute';
import AboutPage from '../pages/AboutPage';
import BatchVerifyPage from '../pages/BatchVerifyPage';
import BuyerBatchDetailPage from '../pages/BuyerBatchDetailPage';
import DashboardPage from '../pages/DashboardPage';
import FeaturePage from '../pages/FeaturePage';
import LoginPage from '../pages/LoginPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import RegisterDeparturePage from '../pages/RegisterDeparturePage';
import VoyageDetailPage from '../pages/VoyageDetailPage';
import VoyageListPage from '../pages/VoyageListPage';
import LandingDetailPage from '../pages/LandingDetailPage';
import LandingIntakePage from '../pages/LandingIntakePage';
import MyLandingsPage from '../pages/MyLandingsPage';
import OfficerActiveTripsPage from '../pages/OfficerActiveTripsPage';
import OfficerOverdueTripsPage from '../pages/OfficerOverdueTripsPage';
import OfficerPendingAlertsPage from '../pages/OfficerPendingAlertsPage';
import OfficerPendingLandingsPage from '../pages/OfficerPendingLandingsPage';
import NoticeDetailPage from '../pages/NoticeDetailPage';
import VesselDetailPage from '../pages/VesselDetailPage';
import HarborDetailPage from '../pages/HarborDetailPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify/:batchCode?" element={<BatchVerifyPage />} />
      <Route
        path="/unauthorized"
        element={
          <ProtectedRoute>
            <UnauthorizedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/trips" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'admin']}><VoyageListPage /></ProtectedRoute>} />
                <Route path="/trips/register" element={<ProtectedRoute allowedRoles={['fisherman']}><RegisterDeparturePage /></ProtectedRoute>} />
                <Route path="/trips/:tripId" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'admin']}><VoyageDetailPage /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'admin']}><FeaturePage titleKey="nav.alerts"><AlertsPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/landings" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'admin']}><FeaturePage titleKey="nav.landingIntake"><MyLandingsPage /></FeaturePage></ProtectedRoute>} />
                <Route path="/landings/new" element={<ProtectedRoute allowedRoles={['fisherman']}><FeaturePage titleKey="nav.landingIntake"><LandingIntakePage /></FeaturePage></ProtectedRoute>} />
                <Route path="/landings/:landingId" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'admin']}><FeaturePage titleKey="nav.landingIntake"><LandingDetailPage /></FeaturePage></ProtectedRoute>} />
                <Route path="/batches" element={<ProtectedRoute allowedRoles={['buyer', 'harbor_officer', 'admin']}><FeaturePage titleKey="nav.batches"><BatchesPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/batches/verify/:batchCode" element={<ProtectedRoute allowedRoles={['buyer', 'harbor_officer', 'admin']}><FeaturePage titleKey="nav.batches"><BuyerBatchDetailPage /></FeaturePage></ProtectedRoute>} />
                <Route path="/notices" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'buyer', 'admin']}><FeaturePage titleKey="nav.notices"><NoticesPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/notices/:noticeId" element={<ProtectedRoute allowedRoles={['fisherman', 'harbor_officer', 'buyer', 'admin']}><NoticeDetailPage /></ProtectedRoute>} />
                <Route path="/vessels" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><FeaturePage titleKey="nav.vessels"><VesselsPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/vessels/:vesselId" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><VesselDetailPage /></ProtectedRoute>} />
                <Route path="/harbors" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><FeaturePage titleKey="nav.harbors"><HarborsPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/harbors/:harborId" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><HarborDetailPage /></ProtectedRoute>} />
                <Route path="/officer/trips/active" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><OfficerActiveTripsPage /></ProtectedRoute>} />
                <Route path="/officer/trips/overdue" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><OfficerOverdueTripsPage /></ProtectedRoute>} />
                <Route path="/officer/alerts/pending" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><OfficerPendingAlertsPage /></ProtectedRoute>} />
                <Route path="/officer/landings/pending-verification" element={<ProtectedRoute allowedRoles={['harbor_officer', 'admin']}><OfficerPendingLandingsPage /></ProtectedRoute>} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage titleKey="nav.audit"><AuditPanel /></FeaturePage></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><FeaturePage titleKey="nav.analytics"><AnalyticsPanel /></FeaturePage></ProtectedRoute>} />
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
