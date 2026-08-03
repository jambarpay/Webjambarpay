import { AdminProfile, USER_ROLES } from '../domain/auth.models';

export interface DemoAccount {
  readonly label: string;
  readonly email: string;
  readonly password: string;
  readonly profile: AdminProfile;
}

export const TEMPORARY_DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Admin',
    email: 'adminjambar@jambaarpay.com',
    password: 'JambarPay2@26',
    profile: {
      id: 'demo-admin',
      name: 'Administrateur JambaarPay',
      email: 'adminjambar@jambaarpay.com',
      role: USER_ROLES.admin,
    },
  },
  {
    label: 'Entreprise',
    email: 'entreprise@jambaarpay.com',
    password: 'Entreprise@1234',
    profile: {
      id: 'demo-enterprise',
      name: 'Entreprise Démo',
      email: 'entreprise@jambaarpay.com',
      role: USER_ROLES.enterprise,
    },
  },
  {
    label: 'Restaurant',
    email: 'restaurant@jambaarpay.com',
    password: 'Restaurant@1234',
    profile: {
      id: 'demo-restaurant',
      name: 'Restaurant Démo',
      email: 'restaurant@jambaarpay.com',
      role: USER_ROLES.restaurant,
    },
  },
];
