import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertCircle, ArrowDownRight, ArrowUpRight, DollarSign, LayoutGrid } from 'lucide-react';

import { LucideIcon } from './Settings';

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

export function Dashboard() {
  const { data } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7);
  });

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentMonth);
    
    data.transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });
    
    return Array.from(monthsSet).sort().reverse();
  }, [data.transactions]);

  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    data.transactions.forEach(t => {
      if (selectedMonth === 'all' || t.date.startsWith(selectedMonth)) {
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
      }
    });

    return {
      balance: totalIncome - totalExpense,
      income: totalIncome,
      expense: totalExpense,
    };
  }, [data.transactions, selectedMonth]);

  // Transformar datos para el gráfico mensual (simplificado para el prototipo asumiendo ingresos del mes actual)
  const chartData = useMemo(() => {
    const grouped: Record<string, { income: number, expense: number }> = {};
    
    data.transactions.forEach(t => {
      if (selectedMonth === 'all' || t.date.startsWith(selectedMonth)) {
        if (!grouped[t.date]) {
          grouped[t.date] = { income: 0, expense: 0 };
        }
        grouped[t.date][t.type] += t.amount;
      }
    });

    const entries = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b));

    // Si mostramos todos los meses, limitar a los últimos 15 días con datos para que no se sature el gráfico, de lo contrario mostrar todos los días de ese mes
    const finalEntries = selectedMonth === 'all' ? entries.slice(-15) : entries;

    return finalEntries.map(([date, values]) => ({
      name: date.split('-').slice(1).join('/'), // MM/DD
      Ingresos: values.income,
      Gastos: values.expense,
    }));
  }, [data.transactions, selectedMonth]);

  // Alertas de presupuesto
  const alerts = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const targetMonth = selectedMonth === 'all' ? currentMonth : selectedMonth;
    const expensesByCategory: Record<string, number> = {};
    
    data.transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(targetMonth)) {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }
    });

    return data.budgets
      .filter(b => b.month === targetMonth)
      .map(b => {
        const spent = expensesByCategory[b.category] || 0;
        const percentage = (spent / b.amount) * 100;
        return { category: b.category, spent, budget: b.amount, percentage };
      })
      .filter(a => a.percentage > 100); // Alertar si supera el 100%
  }, [data.transactions, data.budgets, selectedMonth]);

  // Distribuciones
  const allocationSummary = useMemo(() => {
    const incomeByCat: Record<string, number> = {};
    
    // Ingresos del mes seleccionado
    data.transactions.forEach(t => {
      if (t.type === 'income' && (selectedMonth === 'all' || t.date.startsWith(selectedMonth))) {
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
      }
    });

    const aggregated: Record<string, { fundName: string; assignedAmount: number; consumedAmount: number; balance: number; sources: string[] }> = {};

    // Obtener los gastos y restar ingresos asociados a cada rubro en el mes seleccionado
    const fundExpenses: Record<string, number> = {};
    data.transactions.forEach(t => {
      if ((selectedMonth === 'all' || t.date.startsWith(selectedMonth)) && t.allocationFund) {
        if (t.type === 'expense') {
          fundExpenses[t.allocationFund] = (fundExpenses[t.allocationFund] || 0) + t.amount;
        } else if (t.type === 'income') {
          fundExpenses[t.allocationFund] = (fundExpenses[t.allocationFund] || 0) - t.amount;
        }
      }
    });

    data.allocations.forEach(a => {
      const incomeForCat = incomeByCat[a.incomeCategory] || 0;
      const assignedAmount = (incomeForCat * a.percentage) / 100;
      
      const key = a.fundName.trim();
      if (!aggregated[key]) {
        aggregated[key] = {
          fundName: key,
          assignedAmount: 0,
          consumedAmount: 0,
          balance: 0,
          sources: []
        };
      }
      aggregated[key].assignedAmount += assignedAmount;
      const sourceLabel = `${a.incomeCategory} (${a.percentage}%)`;
      if (!aggregated[key].sources.includes(sourceLabel)) {
        aggregated[key].sources.push(sourceLabel);
      }
    });

    return Object.values(aggregated).map(fund => {
      fund.consumedAmount = fundExpenses[fund.fundName] || 0;
      fund.balance = fund.assignedAmount - fund.consumedAmount;
      return fund;
    }).sort((a, b) => a.fundName.localeCompare(b.fundName));
  }, [data.allocations, data.transactions, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Resumen Financiero</h1>
        
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80 mb-2">
            <DollarSign className="w-4 h-4 mr-1 text-cyan-400" /> Balance Total
          </div>
          <span className="text-3xl font-bold text-white font-mono tracking-tight">{formatCurrency(metrics.balance)}</span>
        </div>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80 mb-2">
            <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-400" /> Ingresos
          </div>
          <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">{formatCurrency(metrics.income)}</span>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80 mb-2">
            <ArrowDownRight className="w-4 h-4 mr-1 text-rose-400" /> Gastos
          </div>
          <span className="text-3xl font-bold text-rose-400 font-mono tracking-tight">-{formatCurrency(metrics.expense)}</span>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Flujo de Caja Reciente</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 14, fontWeight: 500 }}
                />
                <Bar dataKey="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Tendencia de Balance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `$${val.toLocaleString('es-CO')}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 14, fontWeight: 500 }}
                />
                <Line type="monotone" dataKey="Ingresos" stroke="#34d399" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#020617' }} activeDot={{ r: 6, fill: '#34d399' }} />
                <Line type="monotone" dataKey="Gastos" stroke="#fb7185" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#020617' }} activeDot={{ r: 6, fill: '#fb7185' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribución Actual */}
      {allocationSummary.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <LayoutGrid className="w-5 h-5 mr-2 text-indigo-400" /> Estado de Distribución Mensual
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allocationSummary.map((a, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300",
                  a.balance < 0 
                    ? "bg-rose-500/15 border-rose-500/40 shadow-[0_0_15px_rgba(239,68,68,0.12)]" 
                    : Math.abs(a.balance) < 0.01
                      ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                      : "bg-black/20 border-white/5"
                )}
              >
                 <div className="mb-2">
                   <div className="flex flex-wrap gap-1 mb-2">
                     {a.sources.map((s, i) => (
                       <span key={i} className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">
                         {s}
                       </span>
                     ))}
                   </div>
                   <h4 className="text-base font-bold text-white leading-tight">{a.fundName}</h4>
                 </div>
                 <div className="mt-3 flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Asignado</p>
                      <p className="text-sm font-bold text-slate-300 font-mono leading-none">{formatCurrency(a.assignedAmount)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Consumido</p>
                      <p className="text-sm font-bold text-rose-400 font-mono leading-none">-{formatCurrency(a.consumedAmount)}</p>
                    </div>
                    <div className="flex justify-between items-end mt-1 pt-2 border-t border-white/5">
                      <p className="text-[11px] uppercase tracking-widest font-bold leading-none text-slate-400">Saldo</p>
                      <p className={cn("text-lg font-bold font-mono leading-none", a.balance < 0 ? "text-rose-400" : "text-emerald-400")}>{formatCurrency(a.balance)}</p>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-rose-200 flex items-center mb-4">
            <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mr-3 animate-pulse border border-rose-500/40">
              <AlertCircle className="w-4 h-4" />
            </div>
            Alertas de Presupuesto
          </h3>
          <div className="space-y-3 pl-11">
            {alerts.map((alert, i) => {
              const catObj = data.categories.expense.find(c => c.name === alert.category);
              return (
                <div key={i} className="flex justify-between items-center text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    {catObj && <LucideIcon name={catObj.icon} className="w-4 h-4 text-rose-400" />}
                    <span className="text-rose-100 font-medium">{alert.category}</span>
                  </div>
                  <span className="text-rose-200 opacity-80 font-mono">
                    {formatCurrency(alert.spent)} / {formatCurrency(alert.budget)}
                    <span className="ml-2 font-bold text-rose-400">({alert.percentage.toFixed(0)}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

