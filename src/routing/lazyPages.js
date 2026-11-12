import { lazy } from 'react';

function lazyNamed(importFn, exportName) {
  return lazy(() => importFn().then((module) => ({ default: module[exportName] })));
}

export const MarketingFormPage = lazyNamed(
  () => import('../pages/MarketingFormPage.jsx'),
  'MarketingFormPage',
);
export const MarketingGoPage = lazyNamed(() => import('../pages/MarketingGoPage.jsx'), 'MarketingGoPage');
export const LoginPage = lazyNamed(() => import('../pages/LoginPage.jsx'), 'LoginPage');
export const WhatsAppInboxPage = lazyNamed(
  () => import('../pages/WhatsAppInboxPage.jsx'),
  'WhatsAppInboxPage',
);
export const DashboardPage = lazyNamed(() => import('../pages/DashboardPage.jsx'), 'DashboardPage');
export const NetworksPage = lazyNamed(() => import('../pages/NetworksPage.jsx'), 'NetworksPage');
export const NetworkDetailRedirect = lazyNamed(
  () => import('../pages/NetworkDetailRedirect.jsx'),
  'NetworkDetailRedirect',
);
export const ModalitiesPage = lazyNamed(() => import('../pages/ModalitiesPage.jsx'), 'ModalitiesPage');
export const ConnectPlansPage = lazyNamed(() => import('../pages/ConnectPlansPage.jsx'), 'ConnectPlansPage');
export const UsersPage = lazyNamed(() => import('../pages/UsersPage.jsx'), 'UsersPage');
export const PlatformSettingsPage = lazyNamed(
  () => import('../pages/PlatformSettingsPage.jsx'),
  'PlatformSettingsPage',
);
export const CompaniesPage = lazyNamed(() => import('../pages/CompaniesPage.jsx'), 'CompaniesPage');
export const AcafAssociationRedirect = lazyNamed(
  () => import('../pages/AcafAssociationRedirect.jsx'),
  'AcafAssociationRedirect',
);
export const CommercialLeadsPage = lazyNamed(
  () => import('../pages/CommercialLeadsPage.jsx'),
  'CommercialLeadsPage',
);
export const CommercialFunnelsPage = lazyNamed(
  () => import('../pages/CommercialFunnelsPage.jsx'),
  'CommercialFunnelsPage',
);
export const CommercialLossReportPage = lazyNamed(
  () => import('../pages/CommercialLossReportPage.jsx'),
  'CommercialLossReportPage',
);
export const MarketingDashboardPage = lazyNamed(
  () => import('../pages/MarketingDashboardPage.jsx'),
  'MarketingDashboardPage',
);
export const MarketingCampaignsPage = lazyNamed(
  () => import('../pages/MarketingCampaignsPage.jsx'),
  'MarketingCampaignsPage',
);
export const MarketingLandingPagesPage = lazyNamed(
  () => import('../pages/MarketingLandingPagesPage.jsx'),
  'MarketingLandingPagesPage',
);
export const PayablesPage = lazyNamed(() => import('../pages/PayablesPage.jsx'), 'PayablesPage');
export const ReceivablesPage = lazyNamed(() => import('../pages/ReceivablesPage.jsx'), 'ReceivablesPage');
export const CashFlowPage = lazyNamed(() => import('../pages/CashFlowPage.jsx'), 'CashFlowPage');
export const CostCentersPage = lazyNamed(() => import('../pages/CostCentersPage.jsx'), 'CostCentersPage');
export const SuppliersPage = lazyNamed(() => import('../pages/SuppliersPage.jsx'), 'SuppliersPage');
export const AccountPlansPage = lazyNamed(() => import('../pages/AccountPlansPage.jsx'), 'AccountPlansPage');
export const ModulesPage = lazyNamed(() => import('../pages/ModulesPage.jsx'), 'ModulesPage');
export const UserGroupsPage = lazyNamed(() => import('../pages/UserGroupsPage.jsx'), 'UserGroupsPage');
export const DepartmentsPage = lazyNamed(() => import('../pages/DepartmentsPage.jsx'), 'DepartmentsPage');
export const JobPositionsPage = lazyNamed(() => import('../pages/JobPositionsPage.jsx'), 'JobPositionsPage');
export const EvolutionInstancesPage = lazyNamed(
  () => import('../pages/EvolutionInstancesPage.jsx'),
  'EvolutionInstancesPage',
);
export const ChangelogPage = lazyNamed(() => import('../pages/ChangelogPage.jsx'), 'ChangelogPage');
export const AssociationsPage = lazy(() => import('../pages/AssociationsPage.jsx'));
export const SupportQueuesPage = lazyNamed(
  () => import('../pages/SupportQueuesPage.jsx'),
  'SupportQueuesPage',
);
export const SupportTicketsPage = lazyNamed(
  () => import('../pages/SupportTicketsPage.jsx'),
  'SupportTicketsPage',
);
export const NotificationsPage = lazyNamed(
  () => import('../pages/NotificationsPage.jsx'),
  'NotificationsPage',
);
export const LegacyRedirect = lazyNamed(() => import('../routing/LegacyRedirect.jsx'), 'LegacyRedirect');
