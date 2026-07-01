import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { Target, Tag, HelpCircle, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { LucideIcon } from './Settings';
import { supabase, hasSupabaseConfig, clearSupabaseKeys } from '../lib/supabase';

function formatMonthYear(monthStr: string) {
  if (monthStr === 'all') return 'Todos los meses';
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${monthNames[monthIndex]} ${year}`;
  }
  return monthStr;
}

export function Budgets() {
  const { 
    data, 
    setBudget, 
    deleteBudget, 
    addSpecialFundItem, 
    deleteSpecialFundItem, 
    toggleSpecialFundItem 
  } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7);
  });

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentMonthStr);
    
    data.transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });

    data.budgets.forEach(b => {
      if (b.month && b.month.length >= 7) {
        monthsSet.add(b.month);
      }
    });
    
    return Array.from(monthsSet).sort().reverse();
  }, [data.transactions, data.budgets]);

  const [session, setSession] = useState<any>(null);
  
  const sortedExpenseCategories = useMemo(() => {
    return [...data.categories.expense].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.categories.expense]);

  const [category, setCategory] = useState('');

  useEffect(() => {
    if (sortedExpenseCategories.length > 0 && (!category || !sortedExpenseCategories.some(c => c.name === category))) {
      setCategory(sortedExpenseCategories[0].name);
    }
  }, [sortedExpenseCategories, category]);

  const [amount, setAmount] = useState('');

  // Form states for Special Fund Items
  const [inversionName, setInversionName] = useState('');
  const [inversionAmount, setInversionAmount] = useState('');
  const [obligacionesName, setObligacionesName] = useState('');
  const [obligacionesAmount, setObligacionesAmount] = useState('');

  // Sort states for Special Fund Items (default: 'amount_asc' which is lowest to highest price)
  const [inversionSort, setInversionSort] = useState<'amount_asc' | 'amount_desc' | 'alpha'>('amount_asc');
  const [obligacionesSort, setObligacionesSort] = useState<'amount_asc' | 'amount_desc' | 'alpha'>('amount_asc');

  useEffect(() => {
    if (hasSupabaseConfig) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('refresh token') || errMsg.includes('not found') || errMsg.includes('invalid') || errMsg.includes('expired')) {
            supabase.auth.signOut().catch(() => {});
            clearSupabaseKeys();
          }
        } else {
          setSession(session);
        }
      }).catch(() => {});
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
      return () => subscription.unsubscribe();
    }
  }, []);

  // Transform data to calculate spending per budget
  const budgetProgress = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    
    data.transactions.forEach(t => {
      if (t.type === 'expense' && (selectedMonth === 'all' || t.date.startsWith(selectedMonth))) {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }
    });

    return data.budgets
      .filter(b => selectedMonth === 'all' || b.month === selectedMonth)
      .map(b => {
        let spent = 0;
        if (selectedMonth === 'all') {
          spent = data.transactions
            .filter(t => t.type === 'expense' && t.category === b.category && t.date.startsWith(b.month))
            .reduce((sum, t) => sum + t.amount, 0);
        } else {
          spent = expensesByCategory[b.category] || 0;
        }
        const percentage = Math.min((spent / b.amount) * 100, 100);
        return { ...b, spent, percentage };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.month.localeCompare(b.month));
  }, [data.transactions, data.budgets, selectedMonth]);

  const totalBudgetAmount = useMemo(() => {
    return data.budgets
      .filter(b => selectedMonth === 'all' || b.month === selectedMonth)
      .reduce((sum, b) => sum + b.amount, 0);
  }, [data.budgets, selectedMonth]);

  const specialFundsBalance = useMemo(() => {
    const incomeByCat: Record<string, number> = {};
    const fundExpenses: Record<string, number> = {};
    
    data.transactions.forEach(t => {
      if (selectedMonth === 'all' || t.date.startsWith(selectedMonth)) {
        if (t.type === 'income') {
          incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
        } else if (t.type === 'expense' && t.allocationFund) {
          fundExpenses[t.allocationFund] = (fundExpenses[t.allocationFund] || 0) + t.amount;
        }
      }
    });

    const fundAssigned: Record<string, number> = {};
    data.allocations.forEach(a => {
      const incomeForCat = incomeByCat[a.incomeCategory] || 0;
      const assigned = (incomeForCat * a.percentage) / 100;
      const key = a.fundName.trim();
      fundAssigned[key] = (fundAssigned[key] || 0) + assigned;
    });

    const inversionAssigned = fundAssigned['Inversión'] || 0;
    const inversionConsumed = fundExpenses['Inversión'] || 0;
    const obligacionesAssigned = fundAssigned['Obligaciones'] || 0;
    const obligacionesConsumed = fundExpenses['Obligaciones'] || 0;

    return {
      inversion: inversionAssigned - inversionConsumed,
      obligaciones: obligacionesAssigned - obligacionesConsumed
    };
  }, [data.transactions, data.allocations, selectedMonth]);

  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !category) return;
    const targetMonth = selectedMonth === 'all' ? new Date().toISOString().substring(0, 7) : selectedMonth;
    setBudget({ category, amount: Number(amount), month: targetMonth });
    setAmount('');
  };

  const inversionItems = useMemo(() => {
    const items = (data.specialFundItems || []).filter(item => item.fundType === 'Inversión');
    if (inversionSort === 'amount_asc') {
      return [...items].sort((a, b) => a.amount - b.amount);
    } else if (inversionSort === 'amount_desc') {
      return [...items].sort((a, b) => b.amount - a.amount);
    } else {
      return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
  }, [data.specialFundItems, inversionSort]);

  const obligacionesItems = useMemo(() => {
    const items = (data.specialFundItems || []).filter(item => item.fundType === 'Obligaciones');
    if (obligacionesSort === 'amount_asc') {
      return [...items].sort((a, b) => a.amount - b.amount);
    } else if (obligacionesSort === 'amount_desc') {
      return [...items].sort((a, b) => b.amount - a.amount);
    } else {
      return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
  }, [data.specialFundItems, obligacionesSort]);

  const totalInversionPlanned = useMemo(() => {
    return inversionItems.reduce((acc, item) => acc + (item.isCompleted ? 0 : item.amount), 0);
  }, [inversionItems]);

  const totalObligacionesPlanned = useMemo(() => {
    return obligacionesItems.reduce((acc, item) => acc + (item.isCompleted ? 0 : item.amount), 0);
  }, [obligacionesItems]);

  const handleAddInversionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inversionName || !inversionAmount || isNaN(Number(inversionAmount))) return;
    addSpecialFundItem({
      fundType: 'Inversión',
      name: inversionName,
      amount: Number(inversionAmount),
      isCompleted: false
    });
    setInversionName('');
    setInversionAmount('');
  };

  const handleAddObligacionesItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obligacionesName || !obligacionesAmount || isNaN(Number(obligacionesAmount))) return;
    addSpecialFundItem({
      fundType: 'Obligaciones',
      name: obligacionesName,
      amount: Number(obligacionesAmount),
      isCompleted: false
    });
    setObligacionesName('');
    setObligacionesAmount('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Presupuesto</h1>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Mes de análisis:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white/10 transition-colors"
          >
            <option value="all" className="bg-slate-800">Todos los meses</option>
            {availableMonths.map(month => (
              <option key={month} value={month} className="bg-slate-800">{formatMonthYear(month)}</option>
            ))}
          </select>
        </div>
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
                  {sortedExpenseCategories.map(cat => (
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
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider opacity-60">Monitoreo de Presupuesto</h3>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 inline-block mt-2">{formatMonthYear(selectedMonth)}</span>
            </div>
            <div className="md:text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Presupuesto Mensual Total</p>
              <p className="text-2xl font-bold text-indigo-400">{formatCurrency(totalBudgetAmount)}</p>
            </div>
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
                          <button 
                            onClick={() => {
                              if(window.confirm('¿Eliminar este presupuesto?')) {
                                deleteBudget(bp.id);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar Presupuesto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Special Funds Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inversión */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Inversión
            </h3>
            <p className="text-3xl font-bold font-mono text-white mb-1">
              {formatCurrency(specialFundsBalance.inversion)}
            </p>
            <p className="text-xs text-slate-400">Saldo disponible este mes</p>
            
            {/* Wishlist items to acquire */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Wishlist (Para Adquirir)</span>
                <span className="text-indigo-400 font-mono text-[11px]">Total: {formatCurrency(totalInversionPlanned)}</span>
              </h4>
              
              <div className="flex items-center justify-between mb-4 bg-white/5 p-1 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-medium pl-1.5">Ordenar por:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setInversionSort('amount_asc')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      inversionSort === 'amount_asc'
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Menor precio
                  </button>
                  <button
                    type="button"
                    onClick={() => setInversionSort('amount_desc')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      inversionSort === 'amount_desc'
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Mayor precio
                  </button>
                  <button
                    type="button"
                    onClick={() => setInversionSort('alpha')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      inversionSort === 'alpha'
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Nombre A-Z
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {inversionItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">No hay elementos agregados aún.</p>
                ) : (
                  inversionItems.map(item => {
                    const isCoverable = item.amount <= specialFundsBalance.inversion;
                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all group",
                          isCoverable && !item.isCompleted
                            ? "bg-indigo-500/25 border-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        <button 
                          type="button" 
                          onClick={() => toggleSpecialFundItem(item.id, !item.isCompleted)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          {item.isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isCoverable ? "text-indigo-300 hover:text-indigo-100" : "text-slate-500 hover:text-indigo-400"
                            )} />
                          )}
                          <span className={cn(
                            "text-xs font-medium truncate",
                            item.isCompleted ? "line-through text-slate-500" : (isCoverable ? "text-white font-semibold" : "text-slate-200")
                          )}>
                            {item.name}
                            {isCoverable && !item.isCompleted && (
                              <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold tracking-wider uppercase border border-indigo-300/40">
                                Cubrible
                              </span>
                            )}
                          </span>
                        </button>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className={cn(
                            "text-xs font-semibold font-mono",
                            item.isCompleted ? "text-slate-500" : (isCoverable ? "text-indigo-200 font-bold" : "text-slate-300")
                          )}>
                            {formatCurrency(item.amount)}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Eliminar este elemento?')) {
                                deleteSpecialFundItem(item.id);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={handleAddInversionItem} className="flex gap-2 mt-4 pt-4 border-t border-white/5 shrink-0">
            <input
              type="text"
              placeholder="Ej: Nueva Laptop..."
              value={inversionName}
              onChange={e => setInversionName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 flex-1 min-w-0"
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={inversionAmount}
              onChange={e => setInversionAmount(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-20 font-mono"
              required
            />
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white p-2 rounded-xl transition-all flex items-center justify-center shrink-0"
              title="Agregar"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Obligaciones */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Obligaciones
            </h3>
            <p className="text-3xl font-bold font-mono text-white mb-1">
              {formatCurrency(specialFundsBalance.obligaciones)}
            </p>
            <p className="text-xs text-slate-400">Saldo disponible este mes</p>
            
            {/* Obligation items to pay */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Obligaciones (Por Pagar)</span>
                <span className="text-emerald-400 font-mono text-[11px]">Total: {formatCurrency(totalObligacionesPlanned)}</span>
              </h4>
              
              <div className="flex items-center justify-between mb-4 bg-white/5 p-1 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-medium pl-1.5">Ordenar por:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setObligacionesSort('amount_asc')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      obligacionesSort === 'amount_asc'
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Menor precio
                  </button>
                  <button
                    type="button"
                    onClick={() => setObligacionesSort('amount_desc')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      obligacionesSort === 'amount_desc'
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Mayor precio
                  </button>
                  <button
                    type="button"
                    onClick={() => setObligacionesSort('alpha')}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg transition-all font-semibold",
                      obligacionesSort === 'alpha'
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Nombre A-Z
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {obligacionesItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">No hay elementos agregados aún.</p>
                ) : (
                  obligacionesItems.map(item => {
                    const isCoverable = item.amount <= specialFundsBalance.obligaciones;
                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all group",
                          isCoverable && !item.isCompleted
                            ? "bg-emerald-500/25 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        <button 
                          type="button" 
                          onClick={() => toggleSpecialFundItem(item.id, !item.isCompleted)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          {item.isCompleted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isCoverable ? "text-emerald-300 hover:text-emerald-100" : "text-slate-500 hover:text-emerald-400"
                            )} />
                          )}
                          <span className={cn(
                            "text-xs font-medium truncate",
                            item.isCompleted ? "line-through text-slate-500" : (isCoverable ? "text-white font-semibold" : "text-slate-200")
                          )}>
                            {item.name}
                            {isCoverable && !item.isCompleted && (
                              <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold tracking-wider uppercase border border-emerald-300/40">
                                Cubrible
                              </span>
                            )}
                          </span>
                        </button>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className={cn(
                            "text-xs font-semibold font-mono",
                            item.isCompleted ? "text-slate-500" : (isCoverable ? "text-emerald-200 font-bold" : "text-slate-300")
                          )}>
                            {formatCurrency(item.amount)}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Eliminar este elemento?')) {
                                deleteSpecialFundItem(item.id);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Add form */}
          <form onSubmit={handleAddObligacionesItem} className="flex gap-2 mt-4 pt-4 border-t border-white/5 shrink-0">
            <input
              type="text"
              placeholder="Ej: Seguro, Arriendo..."
              value={obligacionesName}
              onChange={e => setObligacionesName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 flex-1 min-w-0"
              required
            />
            <input
              type="number"
              placeholder="Valor"
              value={obligacionesAmount}
              onChange={e => setObligacionesAmount(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-20 font-mono"
              required
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white p-2 rounded-xl transition-all flex items-center justify-center shrink-0"
              title="Agregar"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
