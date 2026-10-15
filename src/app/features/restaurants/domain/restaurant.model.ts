export type PartnerType = 'RESTAURANT' | 'SHOP' | 'SUPERMARKET' | 'MARKET';

export const PARTNER_TYPES: readonly {
  value: PartnerType; label: string; description: string; icon: string;
}[] = [
  { value: 'RESTAURANT', label: 'Restaurant', description: 'Restauration & snacks', icon: 'pi pi-building' },
  { value: 'SHOP', label: 'Boutique', description: 'Commerce de détail', icon: 'pi pi-shopping-bag' },
  { value: 'SUPERMARKET', label: 'Supermarché', description: 'Grande surface', icon: 'pi pi-shopping-cart' },
  { value: 'MARKET', label: 'Marché', description: 'Marché local', icon: 'pi pi-shop' },
];

export function isPartnerType(value: unknown): value is PartnerType {
  return PARTNER_TYPES.some(type => type.value === value);
}

export function partnerTypeLabel(value: PartnerType | undefined): string {
  return PARTNER_TYPES.find(type => type.value === value)?.label ?? 'Restaurant';
}

export interface Restaurant {
  id: string;
  name: string;
  partnerType?: PartnerType;
  address: string;
  phone?: string;
  totalTransactions: number;
  totalVolume: number;
  registrationDate: string;
  status: 'Actif' | 'Inactif' | 'En attente';
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
  ownerEmail?: string;
  ownerPassword?: string;
  ownerTemporaryPassword?: string;
  source?: 'local' | 'backend' | 'new';
}
