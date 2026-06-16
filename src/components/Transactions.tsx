import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2 } from 'lucide-react';

import { LucideIcon } from './Settings';

export function Transactions() {
  const { data, addTransaction, deleteTransaction } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationFund, setAllocationFund] = useState('');

  // Get unique fund names
  const uniqueFunds = Array.from(new Set(data.allocations.map(a => a.fundName.trim())));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    addTransaction({
      type,
      amount: Number(amount),
      category,
      description,
      date,
      allocationFund: allocationFund || undefined
    });
    
    setAmount('');
    setDescription('');
    setAllocationFund('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Transacciones</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Registro
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-5 items-end">
          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Tipo</label>
            <select 
              value={type} 
              onChange={(e) => {
                const t = e.target.value as TransactionType;
                setType(t);
                setCategory(data.categories[t][0]?.name || '');
              }}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
            >
              <option value="expense" className="bg-slate-800">Gasto</option>
              <option value="income" className="bg-slate-800">Ingreso</option>
            </select>
          </div>
          
          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Monto</label>
            <input 
              type="number" 
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors placeholder-slate-600"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Categoría</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
              >
                <option value="" className="bg-slate-800">Ninguno</option>
                {data.categories[type].map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-slate-800">{cat.name}</option>
                ))}
              </select>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Fecha</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Descripción</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Compra supermercado"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors placeholder-slate-600"
            />
          </div>

          {uniqueFunds.length > 0 && (
            <div className="space-y-2 lg:col-span-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 opacity-80 whitespace-nowrap overflow-hidden text-ellipsis block">Distribución (Opcional)</label>
              <select 
                value={allocationFund} 
                onChange={(e) => setAllocationFund(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
              >
                <option value="" className="bg-slate-800">Ninguno</option>
                {uniqueFunds.map(fund => (
                  <option key={fund} value={fund} className="bg-slate-800">{fund}</option>
                ))}
              </select>
            </div>
          )}

          <div className="lg:col-span-1">
            <button type="submit" className="w-full px-4 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
              Guardar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full min-w-[700px]">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rubro</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.transactions.length === 0 ? (
               <tr>
               <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                 No hay transacciones registradas.
               </td>
             </tr>
            ) : data.transactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{t.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">{t.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/5 text-slate-300">
                    {(() => {
                      if (!t.category) {
                        return <>Ninguno</>;
                      }
                      const catObj = [...data.categories.income, ...data.categories.expense].find(c => c.name === t.category);
                      return (
                        <>
                          {catObj && <LucideIcon name={catObj.icon} className="w-3 h-3 mr-2" />}
                          {t.category}
                        </>
                      );
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                  {t.allocationFund ? (
                    <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">
                      {t.allocationFund}
                    </span>
                  ) : '-'}
                </td>
                <td className={cn(
                  "px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-right",
                  t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => deleteTransaction(t.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer bg-white/5 p-2 rounded-lg hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4 ml-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
