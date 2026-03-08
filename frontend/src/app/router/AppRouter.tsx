import { Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderPage } from '../../shared/components/PlaceholderPage';
import { ActiveVoyagePage } from '../../features/fisherman/pages/ActiveVoyagePage';
import { FishermanDashboardPage } from '../../features/fisherman/pages/FishermanDashboardPage';
import { NoticesPage } from '../../features/fisherman/pages/NoticesPage';
import { TripHistoryPage } from '../../features/fisherman/pages/TripHistoryPage';
import { FishermanManagementPage } from '../../features/fisherman-management/pages/FishermanManagementPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<PlaceholderPage title="Login" />} />
      <Route path="/register" element={<PlaceholderPage title="Register" />} />

      <Route path="/dashboard" element={<FishermanDashboardPage />} />
      <Route path="/trips/new" element={<PlaceholderPage title="Register Departure" />} />
      <Route path="/trips/active" element={<ActiveVoyagePage />} />
      <Route path="/trips/history" element={<TripHistoryPage />} />
      <Route path="/landing/new" element={<PlaceholderPage title="Landing Intake" />} />
      <Route path="/alerts/new" element={<PlaceholderPage title="Incident Alert" />} />
      <Route path="/notices" element={<NoticesPage />} />

      <Route path="/officer/dashboard" element={<PlaceholderPage title="Officer Dashboard" />} />
      <Route path="/officer/fishermen" element={<FishermanManagementPage />} />
      <Route path="/officer/trips" element={<PlaceholderPage title="Trip Monitoring" />} />
      <Route path="/officer/landing" element={<PlaceholderPage title="Verification Queue" />} />
      <Route path="/officer/notices" element={<PlaceholderPage title="Harbor Notice Manager" />} />

      <Route path="/buyer/market" element={<PlaceholderPage title="Verified Landing Market" />} />
      <Route path="/buyer/batches/:batchId" element={<PlaceholderPage title="Batch Traceability" />} />

      <Route path="/admin/users" element={<PlaceholderPage title="User Management" />} />
      <Route path="/admin/fishermen" element={<FishermanManagementPage />} />
      <Route path="/admin/audit" element={<PlaceholderPage title="Audit Logs" />} />
      <Route path="/admin/settings" element={<PlaceholderPage title="System Settings" />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
