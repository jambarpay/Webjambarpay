export interface Company {
  id: string;
  name: string;
  employeeCount: number;
  totalBalance: number;
  registrationDate: string;
  status: 'Actif' | 'Inactif';
  phoneNumber?: string;
  address?: string;
  firstName?: string;
  lastName?: string;
  temporaryPassword?: string;
}

export interface CompanyFilter {
  search: string;
  status: Company['status'] | 'Tous';
  page: number;
  pageSize: number;
}
