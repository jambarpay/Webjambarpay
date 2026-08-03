import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { landingGuard } from './core/auth/guards/landing.guard';
import { ADMIN_ROUTES } from './features/admin/admin.routes';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { ENTERPRISE_ROUTES } from './features/enterprise/enterprise.routes';
import { RESTAURANT_ROUTES } from './features/restaurant/restaurant.routes';

const landingComponent = () =>
  import('./features/landing/landing.component').then(module => module.LandingComponent);

const PUBLIC_LANDING_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'JambaarPay | Portail',
    data: { landingSection: 'accueil' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
  {
    path: 'fonctionnalites',
    title: 'Fonctionnalités | JambaarPay',
    data: { landingSection: 'solution' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
  {
    path: 'espaces',
    title: 'Nos espaces | JambaarPay',
    data: { landingSection: 'espaces' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
  {
    path: 'securite',
    title: 'Sécurité | JambaarPay',
    data: { landingSection: 'securite' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
  {
    path: 'forfaits',
    title: 'Forfaits | JambaarPay',
    data: { landingSection: 'forfaits' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
  {
    path: 'a-propos',
    title: 'À propos | JambaarPay',
    data: { landingSection: 'contact' },
    canActivate: [landingGuard],
    loadComponent: landingComponent,
  },
];

export const routes: Routes = [
  ...PUBLIC_LANDING_ROUTES,
  ...AUTH_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(module => module.MainLayoutComponent),
    children: [
      ...ADMIN_ROUTES,
      ...ENTERPRISE_ROUTES,
      ...RESTAURANT_ROUTES,
    ],
  },
  { path: '**', redirectTo: '' },
];
