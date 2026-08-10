import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { CompaniesPage } from './pages/CompaniesPage.jsx';
import { ConnectPlansPage } from './pages/ConnectPlansPage.jsx';
import { ModalitiesPage } from './pages/ModalitiesPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NetworkDetailRedirect } from './pages/NetworkDetailRedirect.jsx';
import { NetworksPage } from './pages/NetworksPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="networks" element={<NetworksPage />} />
              <Route path="networks/:networkId" element={<NetworkDetailRedirect />} />
              <Route path="modalities" element={<ModalitiesPage />} />
              <Route path="connect" element={<ConnectPlansPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="units" element={<Navigate to="/networks" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
