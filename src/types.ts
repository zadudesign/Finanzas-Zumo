export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO format YYYY-MM-DD
  allocationFund?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM
}

export interface Category {
  name: string;
  icon: string;
}

export interface AllocationRule {
  id: string;
  incomeCategory: string;
  fundName: string;
  percentage: number;
}

export interface SpecialFundItem {
  id: string;
  fundType: 'Inversión' | 'Obligaciones';
  name: string;
  amount: number;
  isCompleted: boolean;
  createdAt?: string;
}

export interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  allocations: AllocationRule[];
  categories: {
    income: Category[];
    expense: Category[];
  };
  specialFundItems: SpecialFundItem[];
}

export const DEFAULT_CATEGORIES: FinanceData['categories'] = {
  income: [
    { name: 'Salario', icon: 'Wallet' },
    { name: 'Inversiones', icon: 'TrendingUp' },
    { name: 'Ventas', icon: 'ShoppingBag' },
    { name: 'Otros', icon: 'PlusCircle' }
  ],
  expense: [
    { name: 'Vivienda', icon: 'Home' },
    { name: 'Alimentación', icon: 'Utensils' },
    { name: 'Transporte', icon: 'Car' },
    { name: 'Salud', icon: 'Activity' },
    { name: 'Entretenimiento', icon: 'Play' },
    { name: 'Educación', icon: 'Book' },
    { name: 'Otros', icon: 'CreditCard' }
  ]
};
