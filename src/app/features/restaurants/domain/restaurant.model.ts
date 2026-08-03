export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone?: string;
  totalTransactions: number;
  totalVolume: number;
  registrationDate: string;
  status: 'Actif' | 'Inactif' | 'En attente' | 'Suspendu';
  registrationNumber?: string;
  ownerId?: string;
  country?: string;
  city?: string;
  district?: string;
  street?: string;
  paymentEligibilityStatus?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'SUSPENDED';
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerPhoneNumber?: string;
  source?: 'local' | 'backend' | 'new';
}
