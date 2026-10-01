import { Routes } from '@angular/router';
import { USER_ROLES } from '../../core/auth/domain/auth.models';
import { protectedPage } from '../../core/routing/protected-page';

const ENTERPRISE_ROLES = [USER_ROLES.enterprise] as const;

export const ENTERPRISE_ROUTES: Routes = [
  protectedPage({
    path: 'enterprise-dashboard',
    title: 'Dashboard Entreprise',
    data: { subtitle: "Vue d'ensemble de votre espace entreprise" },
    loadComponent: () => import('./pages/dashboard/enterprise-dashboard.component').then(module => module.EnterpriseDashboardComponent),
  }, ENTERPRISE_ROLES),
  protectedPage({
    path: 'enterprise-employees',
    title: 'Gestion des salariés',
    data: { subtitle: 'Gérez les salariés et leurs soldes' },
    loadComponent: () => import('./pages/employees/enterprise-employees.component').then(module => module.EnterpriseEmployeesComponent),
  }, ENTERPRISE_ROLES),
  protectedPage({
    path: 'enterprise-employees/add',
    title: 'Ajouter un salarié',
    data: { subtitle: 'Gérez les salariés et leurs soldes' },
    loadComponent: () => import('./pages/employee-add/enterprise-employee-add.component').then(module => module.EnterpriseEmployeeAddComponent),
  }, ENTERPRISE_ROLES),
  protectedPage({
    path: 'enterprise-employees/charge-balances',
    title: 'Charger les comptes',
    data: { subtitle: 'Alimentez les comptes de vos salariés' },
    loadComponent: () => import('./pages/balance-charge/enterprise-balance-charge.component').then(module => module.EnterpriseBalanceChargeComponent),
  }, ENTERPRISE_ROLES),
  protectedPage({
    path: 'enterprise-history',
    title: 'Historique des transactions',
    data: { subtitle: 'Consultez toutes les transactions' },
    loadComponent: () => import('./pages/history/enterprise-history.component').then(module => module.EnterpriseHistoryComponent),
  }, ENTERPRISE_ROLES),
  protectedPage({
    path: 'enterprise-settings',
    title: 'Paramètres de l’entreprise',
    data: { subtitle: 'Gérez votre compte et sa sécurité' },
    loadComponent: () => import('./pages/settings/enterprise-settings.component').then(module => module.EnterpriseSettingsComponent),
  }, ENTERPRISE_ROLES),
];
