import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="networks"
            element={
              <PlaceholderPage
                title="Redes parceiras"
                description="Cadastro e gestão das redes de academias integradas ao ACAF Connect."
              />
            }
          />
          <Route
            path="units"
            element={
              <PlaceholderPage
                title="Unidades"
                description="Configuração de unidades, diárias, modalidades e presença no app."
              />
            }
          />
          <Route
            path="connect"
            element={
              <PlaceholderPage
                title="Connect"
                description="Planos, taxas da plataforma e regras comerciais do ACAF Connect."
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Configurações"
                description="Preferências globais, equipe interna e integrações."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
