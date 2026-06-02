export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO format YYYY-MM-DD
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM
}

export interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  categories: {
    income: string[];
    expense: string[];
  };
}

export const DEFAULT_CATEGORIES = {
  income: ['Salario', 'Inversiones', 'Ventas', 'Otros'],
  expense: ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Entretenimiento', 'Educación', 'Otros']
};
