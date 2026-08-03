export const EMPLOYEE_NAMES = [
  'Aminata Ndiaye',
  'Moussa Diop',
  'Fatou Fall',
  'Ibrahima Sow',
  'Awa Ba',
  'Cheikh Gueye',
  'Mariama Diallo',
  'Ousmane Kane',
] as const;

export interface EnterpriseDemoTransaction {
  employee: string;
  employeeEmail: string;
  restaurant: string;
  amount: number;
  date: string;
  status: 'Validé';
}

const RESTAURANTS = [
  'Restaurant Le Djolof',
  'La Téranga',
  'Dakar Bistro',
  'Le Plat',
  'Chez Lamine',
  'Saveur d’Afrique',
] as const;

export function createEnterpriseDemoTransactions(referenceDate = new Date()): EnterpriseDemoTransaction[] {
  return Array.from({ length: 120 }, (_, index) => ({
    employee: EMPLOYEE_NAMES[index % EMPLOYEE_NAMES.length],
    employeeEmail: `salarie${(index % EMPLOYEE_NAMES.length) + 1}@gmail.com`,
    restaurant: RESTAURANTS[index % RESTAURANTS.length],
    amount: 2_000 + (index % EMPLOYEE_NAMES.length) * 500,
    date: toDateInputValue(new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - index,
    )),
    status: 'Validé',
  }));
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
