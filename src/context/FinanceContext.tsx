import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FinanceData, Transaction, Budget } from '../types';
import { DEFAULT_CATEGORIES } from '../types';
import { supabase, hasSupabaseConfig } from '../lib/supabase';

interface FinanceContextType {
  data: FinanceData;
  isLoading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setBudget: (b: Omit<Budget, 'id'>) => Promise<void>;
  addCategory: (type: 'income' | 'expense', name: string) => void;
  deleteCategory: (type: 'income' | 'expense', name: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const mockInitialData: FinanceData = {
  transactions: [
    { id: '1', type: 'income', amount: 5000000, category: 'Salario', description: 'Sueldo mensual', date: new Date().toISOString().split('T')[0] },
    { id: '2', type: 'expense', amount: 800000, category: 'Vivienda', description: 'Alquiler', date: new Date().toISOString().split('T')[0] },
    { id: '3', type: 'expense', amount: 300000, category: 'Alimentación', description: 'Supermercado', date: new Date().toISOString().split('T')[0] },
  ],
  budgets: [
    { id: '1', category: 'Vivienda', amount: 1000000, month: new Date().toISOString().substring(0, 7) },
    { id: '2', category: 'Alimentación', amount: 400000, month: new Date().toISOString().substring(0, 7) },
  ],
  categories: DEFAULT_CATEGORIES
};

export const FinanceProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [data, setData] = useState<FinanceData>(() => {
    const saved = localStorage.getItem('finance_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Aseguramos que existan las categorías si cargamos datos de una versión previa
      return {
        ...mockInitialData,
        ...parsed,
        categories: parsed.categories || DEFAULT_CATEGORIES
      };
    }
    return mockInitialData;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('finance_data', JSON.stringify(data));
  }, [data]);

  const loadData = async () => {
    setIsLoading(true);
    
    // 1. Cargar desde LocalStorage primero para velocidad instantánea
    const saved = localStorage.getItem('finance_data');
    if (saved) {
      setData(JSON.parse(saved));
    }

    // 2. Si Supabase está configurado, intentar traer datos frescos
    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const [{ data: txs, error: txError }, { data: bgts, error: bgtError }] = await Promise.all([
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('budgets').select('*')
          ]);

          if (!txError && !bgtError && txs && bgts) {
            const cloudData = {
              transactions: txs as Transaction[],
              budgets: bgts as Budget[],
              categories: data.categories // Mantenemos categorías locales o podrías crear table
            };
            setData(prev => ({ ...prev, ...cloudData }));
            localStorage.setItem('finance_data', JSON.stringify(cloudData));
          }
        }
      } catch (error) {
        console.warn('Sync failed, using offline data:', error);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    
    // Actualización optimista local
    setData(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));

    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Intentamos insertar con el ID ya generado para mantener consistencia
          const { error } = await supabase
            .from('transactions')
            .insert([{ ...t, id: newTransaction.id, user_id: session.user.id }]);
          
          if (error) throw error;
        }
      } catch (error) {
        console.error('Supabase Sync Error:', error);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    
    if (hasSupabaseConfig) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await supabase.from('transactions').delete().eq('id', id);
        } catch (error) {
          console.error('Error Syncing delete to Supabase:', error);
        }
      }
    }
  };

  const setBudget = async (b: Omit<Budget, 'id'>) => {
    const newB = { ...b, id: crypto.randomUUID() };
    setData(prev => {
      const existingIdx = prev.budgets.findIndex(x => x.category === b.category && x.month === b.month);
      if (existingIdx >= 0) {
        const newBudgets = [...prev.budgets];
        newB.id = prev.budgets[existingIdx].id;
        newBudgets[existingIdx] = newB;
        return { ...prev, budgets: newBudgets };
      }
      return { ...prev, budgets: [...prev.budgets, newB] };
    });

    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('budgets').upsert({ ...newB, user_id: session.user.id }, { onConflict: 'user_id,category,month' });
        }
      } catch (error) {
        console.error('Error Syncing budget to Supabase:', error);
      }
    }
  };

  const addCategory = (type: 'income' | 'expense', name: string) => {
    setData(prev => {
      if (prev.categories[type].includes(name)) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [type]: [...prev.categories[type], name]
        }
      };
    });
  };

  const deleteCategory = (type: 'income' | 'expense', name: string) => {
    setData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [type]: prev.categories[type].filter(c => c !== name)
      }
    }));
  };

  return (
    <FinanceContext.Provider value={{ data, isLoading, addTransaction, deleteTransaction, setBudget, addCategory, deleteCategory }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
