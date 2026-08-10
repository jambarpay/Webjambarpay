export const USER_ROLES = {
  admin: 'Admin Principal',
  enterprise: 'Entreprise',
  restaurant: 'Restaurant',
  client: 'Client',
  seller: 'Vendeur',
  employee: 'Employé',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string'
    && Object.values(USER_ROLES).some(role => role === value);
}

export interface LoginForm {
  email: string;
  password: string;
}

export type LoginCredentials = Pick<LoginForm, 'email' | 'password'>;

export interface EmployeeLoginCredentials {
  phoneNumber: string;
  pin: string;
}

export interface AuthSession {
  profile: AdminProfile;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  restaurantId?: string;
}

export interface AuthState {
  userId: string | null;
  role: UserRole | null;
  profile: AdminProfile | null;
  isAuthenticated: boolean;
}
