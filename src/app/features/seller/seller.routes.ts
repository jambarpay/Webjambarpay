import { Routes } from '@angular/router';
import { USER_ROLES } from '../../core/auth/domain/auth.models';
import { protectedPage } from '../../core/routing/protected-page';

export const SELLER_ROUTES: Routes = [
  protectedPage({
    path: 'seller-portal',
    title: 'Espace vendeur',
    data: { subtitle: 'QR du restaurant et scan rapide', compact: true },
    loadComponent: () => import('./seller-portal/seller-portal.component').then(module => module.SellerPortalComponent),
  }, [USER_ROLES.seller]),
];
