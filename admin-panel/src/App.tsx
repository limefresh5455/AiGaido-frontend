import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import UploadPlace from './pages/UploadPlace';
import PaymentRequests from './pages/PaymentRequests';
import ReferralActivities from './pages/ReferralActivities';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTES } from './constants';

function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />

      <Route
        path={ROUTES.PAYMENT_REQUESTS}
        element={
          <ProtectedRoute>
            <AdminLayout>
              <PaymentRequests />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.UPLOAD_PLACE}
        element={
          <ProtectedRoute>
            <AdminLayout>
              <UploadPlace />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.REFERRAL_ACTIVITIES}
        element={
          <ProtectedRoute>
            <AdminLayout>
              <ReferralActivities />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={ROUTES.PAYMENT_REQUESTS} replace />} />
    </Routes>
  );
}

export default App;
