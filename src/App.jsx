import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ConfirmDialogProvider } from './components/confirm/ConfirmDialogProvider.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { FlashMessageProvider } from './components/flash/FlashMessageProvider.jsx';
import { SupportProvider } from './components/support/SupportContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AdminLayout } from './layout/AdminLayout.jsx';
import { CashFlowPage } from './pages/CashFlowPage.jsx';
import { CommercialFunnelsPage } from './pages/CommercialFunnelsPage.jsx';
import { CommercialLeadsPage } from './pages/CommercialLeadsPage.jsx';
import { WhatsAppInboxPage } from './pages/WhatsAppInboxPage.jsx';
import { CompaniesPage } from './pages/CompaniesPage.jsx';
import { ConnectPlansPage } from './pages/ConnectPlansPage.jsx';
import { CostCentersPage } from './pages/CostCentersPage.jsx';
import { AccountPlansPage } from './pages/AccountPlansPage.jsx';
import { SuppliersPage } from './pages/SuppliersPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { EvolutionInstancesPage } from './pages/EvolutionInstancesPage.jsx';
import { ChangelogPage } from './pages/ChangelogPage.jsx';
import { JobPositionsPage } from './pages/JobPositionsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ModalitiesPage } from './pages/ModalitiesPage.jsx';
import { MarketingDashboardPage } from './pages/MarketingDashboardPage.jsx';
import { MarketingCampaignsPage } from './pages/MarketingCampaignsPage.jsx';
import { MarketingLandingPagesPage } from './pages/MarketingLandingPagesPage.jsx';
import { MarketingFormPage } from './pages/MarketingFormPage.jsx';
import { MarketingGoPage } from './pages/MarketingGoPage.jsx';
import { ModulesPage } from './pages/ModulesPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { NetworkDetailRedirect } from './pages/NetworkDetailRedirect.jsx';
import { NetworksPage } from './pages/NetworksPage.jsx';
import { PayablesPage } from './pages/PayablesPage.jsx';
import { PlatformSettingsPage } from './pages/PlatformSettingsPage.jsx';
import { ReceivablesPage } from './pages/ReceivablesPage.jsx';
import { SupportTicketsPage } from './pages/SupportTicketsPage.jsx';
import { SupportQueuesPage } from './pages/SupportQueuesPage.jsx';
import { UserGroupsPage } from './pages/UserGroupsPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { LegacyRedirect } from './routing/LegacyRedirect.jsx';
import { AcafAssociationRedirect } from './pages/AcafAssociationRedirect.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FlashMessageProvider>
          <ConfirmDialogProvider>
            <BrowserRouter>
              <SupportProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/f/go/:slug" element={<MarketingGoPage />} />
                  <Route path="/f/:slug" element={<MarketingFormPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/m/comercial/whatsapp" element={<WhatsAppInboxPage />} />
                    <Route element={<AdminLayout />}>
              <Route path="/m/operacao/dashboard" element={<DashboardPage />} />
              <Route path="/m/operacao/redes" element={<NetworksPage />} />
              <Route path="/m/operacao/redes/:networkId" element={<NetworkDetailRedirect />} />
              <Route path="/m/operacao/modalidades" element={<ModalitiesPage />} />
              <Route path="/m/operacao/planos" element={<ConnectPlansPage />} />
              <Route path="/m/operacao/usuarios" element={<UsersPage />} />
              <Route path="/m/sistema/configuracoes" element={<PlatformSettingsPage />} />
              <Route path="/m/plataforma/connect" element={<Navigate to="/m/operacao/planos" replace />} />
              <Route path="/m/plataforma/usuarios" element={<Navigate to="/m/operacao/usuarios" replace />} />
              <Route path="/m/plataforma/configuracoes" element={<Navigate to="/m/sistema/configuracoes" replace />} />
              <Route path="/m/corporativo/empresas" element={<CompaniesPage />} />
              <Route path="/m/associacao/parceiros" element={<AcafAssociationRedirect />} />
              <Route path="/m/comercial/leads" element={<CommercialLeadsPage />} />
              <Route path="/m/comercial/funis" element={<CommercialFunnelsPage />} />
              <Route path="/m/marketing/painel" element={<MarketingDashboardPage />} />
              <Route path="/m/marketing/campanhas" element={<MarketingCampaignsPage />} />
              <Route path="/m/marketing/formularios" element={<MarketingLandingPagesPage />} />
              <Route path="/m/financeiro/contas-pagar" element={<PayablesPage />} />
              <Route path="/m/financeiro/contas-receber" element={<ReceivablesPage />} />
              <Route path="/m/financeiro/fluxo-caixa" element={<CashFlowPage />} />
              <Route path="/m/financeiro/centros-custo" element={<CostCentersPage />} />
              <Route path="/m/financeiro/fornecedores" element={<SuppliersPage />} />
              <Route path="/m/financeiro/planos-conta" element={<AccountPlansPage />} />
              <Route path="/m/sistema/modulos" element={<ModulesPage />} />
              <Route path="/m/sistema/grupos" element={<UserGroupsPage />} />
              <Route path="/m/sistema/departamentos" element={<DepartmentsPage />} />
              <Route path="/m/sistema/cargos" element={<JobPositionsPage />} />
              <Route path="/m/sistema/evolution" element={<EvolutionInstancesPage />} />
              <Route path="/m/sistema/atualizacoes" element={<ChangelogPage />} />
              <Route path="/m/atendimento/filas" element={<SupportQueuesPage />} />
              <Route path="/m/atendimento/chamados" element={<SupportTicketsPage />} />
              <Route path="/m/notificacoes" element={<NotificationsPage />} />

              <Route path="/" element={<LegacyRedirect />} />
              <Route path="/networks" element={<LegacyRedirect />} />
              <Route path="/networks/:networkId" element={<LegacyRedirect />} />
              <Route path="/modalities" element={<LegacyRedirect />} />
              <Route path="/connect" element={<LegacyRedirect />} />
              <Route path="/users" element={<LegacyRedirect />} />
              <Route path="/companies" element={<LegacyRedirect />} />
              <Route path="/units" element={<LegacyRedirect />} />
              <Route path="*" element={<Navigate to="/m/operacao/dashboard" replace />} />
                    </Route>
                  </Route>
                </Routes>
              </SupportProvider>
            </BrowserRouter>
          </ConfirmDialogProvider>
        </FlashMessageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
