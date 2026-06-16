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
  addCategory: (type: 'income' | 'expense', category: Category) => Promise<void>;
  deleteCategory: (type: 'income' | 'expense', name: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
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
      
      // Migración: Si las categorías son strings, las convertimos al nuevo formato
      let migratedCategories = parsed.categories;
      if (migratedCategories && Array.isArray(migratedCategories.expense) && typeof migratedCategories.expense[0] === 'string') {
        migratedCategories = {
          income: migratedCategories.income.map((name: string) => ({ name, icon: 'PlusCircle' })),
          expense: migratedCategories.expense.map((name: string) => ({ name, icon: 'Tag' }))
        };
      }

      return {
        ...mockInitialData,
        ...parsed,
        categories: migratedCategories || DEFAULT_CATEGORIES
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
          const [{ data: txs, error: txError }, { data: bgts, error: bgtError }, { data: cats, error: catError }] = await Promise.all([
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('budgets').select('*'),
            supabase.from('categories').select('*')
          ]);

          if (!txError && txs) {
            let cloudCategories = data.categories; 
            let cloudBudgets = !bgtError && bgts ? (bgts as Budget[]) : data.budgets;
            
            if (!catError && cats && cats.length > 0) {
               cloudCategories = {
                 income: cats.filter(c => c.type === 'income').map(c => ({ name: c.name, icon: c.icon })),
                 expense: cats.filter(c => c.type === 'expense').map(c => ({ name: c.name, icon: c.icon }))
               };
               
               // Buscar meta de presupuesto (amount) dentro de las categorías
               const catsWithBudgets = cats.filter(c => c.type === 'expense' && c.amount != null);
               if (catsWithBudgets.length > 0) {
                 cloudBudgets = catsWithBudgets.map(c => ({
                   id: c.id || crypto.randomUUID(),
                   category: c.name,
                   amount: c.amount,
                   month: c.month || new Date().toISOString().substring(0, 7)
                 }));
               }
            }

            const cloudData = {
              transactions: txs as Transaction[],
              budgets: cloudBudgets,
              categories: cloudCategories
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
          // Actualizamos la categoría correspondiente con el monto del presupuesto
          await supabase.from('categories')
            .update({ amount: newB.amount, month: newB.month })
            .eq('user_id', session.user.id)
            .eq('name', newB.category)
            .eq('type', 'expense');
        }
      } catch (error) {
        console.error('Error Syncing budget to Supabase:', error);
      }
    }
  };

  const addCategory = async (type: 'income' | 'expense', category: Category) => {
    setData(prev => {
      if (prev.categories[type].some(c => c.name === category.name)) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [type]: [...prev.categories[type], category]
        }
      };
    });

    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('categories').upsert(
            { user_id: session.user.id, name: category.name, type, icon: category.icon },
            { onConflict: 'user_id,type,name' }
          );
        }
      } catch (error) {
        console.error('Supabase Sync Error (add category):', error);
      }
    }
  };

  const deleteCategory = async (type: 'income' | 'expense', name: string) => {
    setData(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [type]: prev.categories[type].filter(c => c.name !== name)
      }
    }));

    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('categories').delete()
            .eq('user_id', session.user.id)
            .eq('type', type)
            .eq('name', name);
        }
      } catch (error) {
        console.error('Supabase Sync Error (delete category):', error);
      }
    }
  };

  const resetDatabase = async () => {
    setData({
      transactions: [],
      budgets: [],
      categories: DEFAULT_CATEGORIES
    });
    localStorage.removeItem('finance_data');

    if (hasSupabaseConfig) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await Promise.all([
            supabase.from('transactions').delete().eq('user_id', session.user.id),
            supabase.from('categories').delete().eq('user_id', session.user.id),
            supabase.from('budgets').delete().eq('user_id', session.user.id)
          ]);
        }
      } catch (error) {
        console.error('Supabase Sync Error (reset db):', error);
      }
    }
  };

  return (
    <FinanceContext.Provider value={{ data, isLoading, addTransaction, deleteTransaction, setBudget, addCategory, deleteCategory, resetDatabase }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
