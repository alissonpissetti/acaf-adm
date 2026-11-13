import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ConfirmDialogProvider } from './components/confirm/ConfirmDialogProvider.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { FlashMessageProvider } from './components/flash/FlashMessageProvider.jsx';
import { MarketingFormSkeleton } from './components/MarketingFormSkeleton.jsx';
import { SupportProvider } from './components/support/SupportContext.jsx';
import { AppLoadingPanel } from './components/crud/AppLoading.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AdminLayout } from './layout/AdminLayout.jsx';
import {
  AccountPlansPage,
  AcafAssociationRedirect,
  AssociationsPage,
  CashFlowPage,
  ChangelogPage,
  CommercialFunnelsPage,
  CommercialLeadsPage,
  CommercialLossReportPage,
  CompaniesPage,
  ConnectPlansPage,
  CostCentersPage,
  DashboardPage,
  DepartmentsPage,
  EvolutionInstancesPage,
  JobPositionsPage,
  LegacyRedirect,
  LoginPage,
  MarketingCampaignsPage,
  MarketingDashboardPage,
  MarketingFormPage,
  MarketingGoPage,
  MarketingLandingPagesPage,
  ModalitiesPage,
  ModulesPage,
  NetworkDetailRedirect,
  NetworksPage,
  DocumentsPage,
  NotificationsPage,
  PayablesPage,
  PlatformSettingsPage,
  ReceivablesPage,
  SuppliersPage,
  SupportQueuesPage,
  SupportTicketsPage,
  UserGroupsPage,
  UsersPage,
  WhatsAppInboxPage,
} from './routing/lazyPages.js';

function AdminRouteFallback() {
  return <AppLoadingPanel label="Carregando painel…" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FlashMessageProvider>
          <ConfirmDialogProvider>
            <BrowserRouter>
              <SupportProvider>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <Suspense fallback={<AdminRouteFallback />}>
                        <LoginPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/f/go/:slug"
                    element={
                      <Suspense fallback={<MarketingFormSkeleton />}>
                        <MarketingGoPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/f/:slug"
                    element={
                      <Suspense fallback={<MarketingFormSkeleton />}>
                        <MarketingFormPage />
                      </Suspense>
                    }
                  />
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="/m/comercial/whatsapp"
                      element={
                        <Suspense fallback={<AdminRouteFallback />}>
                          <WhatsAppInboxPage />
                        </Suspense>
                      }
                    />
                    <Route element={<AdminLayout />}>
                      <Route
                        path="/m/operacao/dashboard"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <DashboardPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/redes"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <NetworksPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/redes/:networkId"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <NetworkDetailRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/modalidades"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <ModalitiesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/planos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <ConnectPlansPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/usuarios"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <UsersPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/documentos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <DocumentsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/documentos/:slug"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <DocumentsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/operacao/termos-parceiro"
                        element={<Navigate to="/m/operacao/documentos/partner_onboarding" replace />}
                      />
                      <Route
                        path="/m/sistema/configuracoes"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <PlatformSettingsPage />
                          </Suspense>
                        }
                      />
                      <Route path="/m/plataforma/connect" element={<Navigate to="/m/operacao/planos" replace />} />
                      <Route path="/m/plataforma/usuarios" element={<Navigate to="/m/operacao/usuarios" replace />} />
                      <Route
                        path="/m/plataforma/configuracoes"
                        element={<Navigate to="/m/sistema/configuracoes" replace />}
                      />
                      <Route
                        path="/m/corporativo/empresas"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CompaniesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/associacao/parceiros"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <AcafAssociationRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/comercial/leads"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CommercialLeadsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/comercial/funis"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CommercialFunnelsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/comercial/relatorio-perdas"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CommercialLossReportPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/marketing/painel"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <MarketingDashboardPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/marketing/campanhas"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <MarketingCampaignsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/marketing/formularios"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <MarketingLandingPagesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/contas-pagar"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <PayablesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/contas-receber"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <ReceivablesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/fluxo-caixa"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CashFlowPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/centros-custo"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <CostCentersPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/fornecedores"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <SuppliersPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/financeiro/planos-conta"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <AccountPlansPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/modulos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <ModulesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/grupos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <UserGroupsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/departamentos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <DepartmentsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/cargos"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <JobPositionsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/evolution"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <EvolutionInstancesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/atualizacoes"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <ChangelogPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/sistema/associacoes"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <AssociationsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/atendimento/filas"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <SupportQueuesPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/atendimento/chamados"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <SupportTicketsPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/m/notificacoes"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <NotificationsPage />
                          </Suspense>
                        }
                      />

                      <Route
                        path="/"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/networks"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/networks/:networkId"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/modalities"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/connect"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/companies"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/units"
                        element={
                          <Suspense fallback={<AdminRouteFallback />}>
                            <LegacyRedirect />
                          </Suspense>
                        }
                      />
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
