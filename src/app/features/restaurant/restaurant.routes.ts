import { Routes } from '@angular/router';
import { USER_ROLES } from '../../core/auth/domain/auth.models';
import { protectedPage } from '../../core/routing/protected-page';

const RESTAURANT_ROLES = [USER_ROLES.restaurant] as const;

export const RESTAURANT_ROUTES: Routes = [
  protectedPage({
    path: 'restaurant-dashboard',
    title: 'Dashboard Global',
    data: { subtitle: "Vue d'ensemble de votre restaurant", compact: true },
    loadComponent: () => import('./pages/dashboard/restaurant-dashboard.component').then(module => module.RestaurantDashboardComponent),
  }, RESTAURANT_ROLES),
  protectedPage({
    path: 'restaurant-payments',
    title: 'Nouveau paiement',
    data: { subtitle: 'Encaissez rapidement vos clients et partenaires' },
    loadComponent: () => import('./pages/payments/restaurant-payments.component').then(module => module.RestaurantPaymentsComponent),
  }, RESTAURANT_ROLES),
  protectedPage({
    path: 'restaurant-history',
    title: 'Historique des paiements',
    data: { subtitle: 'Retrouvez toutes les transactions de votre restaurant' },
    loadComponent: () => import('./pages/history/restaurant-history.component').then(module => module.RestaurantHistoryComponent),
  }, RESTAURANT_ROLES),
  protectedPage({
    path: 'restaurant-sellers',
    title: 'Gestion des vendeurs',
    data: { subtitle: 'Créez les comptes des vendeurs autorisés à encaisser' },
    loadComponent: () => import('./pages/sellers/restaurant-sellers.component').then(module => module.RestaurantSellersComponent),
  }, RESTAURANT_ROLES),
  protectedPage({
    path: 'restaurant-settings',
    title: 'Paramètres',
    data: { subtitle: 'Configurez votre espace restaurant' },
    loadComponent: () => import('./pages/settings/restaurant-settings.component').then(module => module.RestaurantSettingsComponent),
  }, RESTAURANT_ROLES),
];
