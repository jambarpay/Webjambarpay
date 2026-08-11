import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthFacade } from '../../core/auth/application/auth.facade';
import { USER_ROLES } from '../../core/auth/domain/auth.models';

interface NavItem {
  label: string;
  iconSrc: string;
  route?: string;
  disabled?: boolean;
}

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly auth = inject(AuthFacade);

  private readonly adminNavItems: NavItem[] = [
    { label: 'Dashboard Global', iconSrc: 'assets/icons/icon-dashboard.svg', route: '/dashboard' },
    { label: 'Gestion des entreprises', iconSrc: 'assets/icons/icon-business.svg', route: '/companies' },
    { label: 'Gestion des restaurants', iconSrc: 'assets/icons/icon-restaurants.svg', route: '/restaurants' },
    { label: 'Monitoring', iconSrc: 'assets/icons/icon-monitoring.svg', route: '/monitoring' },
    { label: "Journal d'audit", iconSrc: 'assets/icons/icon-audit.svg', route: '/audit' },
  ];

  private readonly enterpriseNavItems: NavItem[] = [
    { label: 'Dashboard Global', iconSrc: 'assets/icons/icon-dashboard.svg', route: '/enterprise-dashboard' },
    { label: 'Gestion des salariés', iconSrc: 'assets/icons/icon-business.svg', route: '/enterprise-employees' },
    { label: 'Historique', iconSrc: 'assets/icons/icon-audit.svg', route: '/enterprise-history' },
  ];

  private readonly restaurantNavItems: NavItem[] = [
    { label: 'Dashboard Global', iconSrc: 'assets/icons/icon-dashboard.svg', route: '/restaurant-dashboard' },
    { label: 'Nouveau paiement', iconSrc: 'assets/icons/icon-transactions.svg', route: '/restaurant-payments' },
    { label: 'Gestion des vendeurs', iconSrc: 'assets/icons/icon-business.svg', route: '/restaurant-sellers' },
    { label: 'Historique', iconSrc: 'assets/icons/icon-audit.svg', route: '/restaurant-history' },
    { label: 'Parametres', iconSrc: 'assets/icons/icon-settings.svg', route: '/restaurant-settings' },
  ];

  private readonly sellerNavItems: NavItem[] = [];

  get navItems(): NavItem[] {
    const role = this.auth.getRole();

    if (role === USER_ROLES.enterprise) {
      return this.enterpriseNavItems;
    }

    if (role === USER_ROLES.restaurant) {
      return this.restaurantNavItems;
    }

    if (role === USER_ROLES.seller) {
      return this.sellerNavItems;
    }

    return role === USER_ROLES.admin ? this.adminNavItems : [];
  }

  logout(): void {
    this.auth.logout();
  }
}
