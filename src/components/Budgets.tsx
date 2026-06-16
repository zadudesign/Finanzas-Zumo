import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { Target, Tag, HelpCircle } from 'lucide-react';
import { LucideIcon } from './Settings';
import { supabase, hasSupabaseConfig } from '../lib/supabase';

export function Budgets() {
  const { data, setBudget } = useFinance();
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [session, setSession] = useState<any>(null);
  
  const [category, setCategory] = useState(data.categories.expense[0]?.name || '');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (hasSupabaseConfig) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error && error.message?.includes('Refresh Token')) supabase.auth.signOut();
        else setSession(session);
      }).catch(() => {});
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
      return () => subscription.unsubscribe();
    }
  }, []);

  // Transform data to calculate spending per budget
  const budgetProgress = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    
    data.transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(currentMonth)) {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }
    });

    return data.budgets
      .filter(b => b.month === currentMonth)
      .map(b => {
        const spent = expensesByCategory[b.category] || 0;
        const percentage = Math.min((spent / b.amount) * 100, 100);
        return { ...b, spent, percentage };
      });
  }, [data.transactions, data.budgets, currentMonth]);

  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !category) return;
    setBudget({ category, amount: Number(amount), month: currentMonth });
    setAmount('');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Presupuesto</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration */}
        {session && (
          <div className="lg:col-span-4 space-y-6">
            {/* Formulario de Presupuesto */}
            <form onSubmit={handleSubmitBudget} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-indigo-400" /> Asignar Presupuesto
                </h3>
                <p className="text-xs text-slate-400 opacity-80">Define límites mensuales por categoría.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Categoría</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
                  required
                >
                  <option value="" disabled className="bg-slate-800">Seleccionar...</option>
                  {data.categories.expense.map(cat => (
                    <option key={cat.name} value={cat.name} className="bg-slate-800">{cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Límite Mensual (COP)</label>
                <input 
                  type="number" 
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors placeholder-slate-600"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                Guardar Límite
              </button>
            </form>
          </div>
        )}

        {/* Right Column: Monitors */}
        <div className={cn("space-y-4", session ? "lg:col-span-8" : "lg:col-span-12")}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-white uppercase tracking-wider opacity-60">Monitoreo Mes Actual</h3>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">{currentMonth}</span>
          </div>

          {budgetProgress.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-white font-bold text-xl">Sin límites establecidos</h3>
              <p className="text-slate-400 text-sm mt-3 max-w-sm">Configura límites mensuales para tus gastos y recibe alertas automáticas cuando estés cerca de superarlos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetProgress.map(bp => (
                <div key={bp.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col gap-5 transition-all hover:bg-white/10 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {(() => {
                        const catObj = data.categories.expense.find(c => c.name === bp.category);
                        return (
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center mr-3 transition-colors relative",
                            bp.percentage >= 90 ? "bg-rose-500/20 text-rose-400" : bp.percentage >= 75 ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400"
                          )}>
                            <LucideIcon name={catObj?.icon || 'Tag'} className="w-5 h-5" />
                          </div>
                        );
                      })()}
                      <div>
                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                          {bp.category}
                          <button 
                            onClick={() => {
                              setCategory(bp.category);
                              setAmount(bp.amount.toString());
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar Presupuesto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Consumido</p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-xl font-bold font-mono tracking-tight",
                      bp.percentage >= 90 ? "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]" : bp.percentage >= 75 ? "text-orange-400" : "text-cyan-400"
                    )}>
                      {bp.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          bp.percentage >= 90 ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : bp.percentage >= 75 ? "bg-orange-500" : "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        )}
                        style={{ width: `${bp.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono mt-2">
                       <span className="text-slate-200">{formatCurrency(bp.spent)}</span>
                       <span className="text-slate-500">{formatCurrency(bp.amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
