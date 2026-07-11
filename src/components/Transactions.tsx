import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

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

export function Transactions() {
  const { data, addTransaction, deleteTransaction, updateTransaction } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editFund, setEditFund] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const startEditing = (t: any) => {
    setEditingId(t.id);
    setEditCategory(t.category || '');
    setEditFund(t.allocationFund || '');
    setEditDate(t.date || '');
    setEditDescription(t.description || '');
    setEditAmount(t.amount?.toString() || '0');
  };

  const handleSave = async (id: string) => {
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor, ingresa un monto válido mayor a 0.");
      return;
    }

    await updateTransaction(id, {
      category: editCategory,
      allocationFund: editFund || undefined,
      date: editDate,
      description: editDescription,
      amount: numAmount
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationFund, setAllocationFund] = useState('');

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7);
  });
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFund, setFilterFund] = useState('');

  // Get unique fund names
  const uniqueFunds = useMemo(() => {
    return Array.from(new Set(data.allocations.map(a => a.fundName.trim()))).sort((a, b) => (a as string).localeCompare(b as string));
  }, [data.allocations]);

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

  const filteredTransactions = useMemo(() => {
    return [...data.transactions]
      .filter(t => {
        const matchMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
        const matchCategory = filterCategory === '' || t.category === filterCategory;
        const matchFund = filterFund === '' || t.allocationFund === filterFund;
        return matchMonth && matchCategory && matchFund;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, selectedMonth, filterCategory, filterFund]);

  const filterTotal = useMemo(() => {
    return (selectedMonth || filterCategory || filterFund) ? filteredTransactions.reduce((acc, t) => acc + t.amount, 0) : 0;
  }, [filteredTransactions, selectedMonth, filterCategory, filterFund]);

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
                const sorted = [...data.categories[t]].sort((a, b) => a.name.localeCompare(b.name));
                setCategory(sorted[0]?.name || '');
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
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20 font-mono tracking-wide mt-1 animate-pulse">
                {formatCurrency(Number(amount))} COP
              </div>
            )}
          </div>

          <div className="space-y-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Categoría</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
              >
                <option value="" className="bg-slate-800">Ninguno</option>
                {[...data.categories[type]].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
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

      <div className="flex flex-col gap-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        {/* Fila Superior: Mes y Total Filtrado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Mes:</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-44 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors cursor-pointer [color-scheme:dark]"
            >
              <option value="all" className="bg-slate-800">Todos los meses</option>
              {availableMonths.map(month => (
                <option key={month} value={month} className="bg-slate-800">{formatMonthYear(month)}</option>
              ))}
            </select>
          </div>
          
          {(filterCategory || filterFund) && (
            <div className="text-right w-full sm:w-auto">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Monto Total Filtrado</p>
              <p className="text-2xl font-bold text-white font-mono">{formatCurrency(filterTotal)}</p>
            </div>
          )}
        </div>

        {/* Sección de Botones de Categorías */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Categoría:</label>
            {filterCategory && (
              <button 
                onClick={() => setFilterCategory('')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer",
                filterCategory === ''
                  ? "bg-white text-slate-900 border-white font-semibold shadow-lg shadow-white/10"
                  : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:border-white/20"
              )}
            >
              Todas
            </button>
            {Array.from(new Map([...data.categories.expense, ...data.categories.income].map(c => [c.name, c])).values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(cat => {
                const isSelected = filterCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setFilterCategory(cat.name)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "bg-indigo-500 text-white border-indigo-400 font-semibold shadow-lg shadow-indigo-500/30 scale-[1.02]"
                        : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    <LucideIcon name={cat.icon} className="w-3.5 h-3.5" />
                    {cat.name}
                  </button>
                );
              })
            }
          </div>
        </div>

        {/* Sección de Botones de Rubros */}
        {uniqueFunds.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Rubro:</label>
              {filterFund && (
                <button 
                  onClick={() => setFilterFund('')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterFund('')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer",
                  filterFund === ''
                    ? "bg-white text-slate-900 border-white font-semibold shadow-lg shadow-white/10"
                    : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                Todos
              </button>
              {uniqueFunds.map(fund => {
                const isSelected = filterFund === fund;
                return (
                  <button
                    key={fund}
                    onClick={() => setFilterFund(fund)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "bg-indigo-500 text-white border-indigo-400 font-semibold shadow-lg shadow-indigo-500/30 scale-[1.02]"
                        : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {fund}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
            {filteredTransactions.length === 0 ? (
               <tr>
               <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                 No hay transacciones registradas.
               </td>
             </tr>
            ) : filteredTransactions.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <tr key={t.id} className={cn("transition-colors", isEditing ? "bg-indigo-500/5 hover:bg-indigo-500/10" : "hover:bg-white/5")}>
                  {/* Fecha */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[130px]"
                      />
                    ) : (
                      t.date
                    )}
                  </td>

                  {/* Descripción */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descripción"
                        className="bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[180px]"
                      />
                    ) : (
                      t.description || '-'
                    )}
                  </td>
                  
                  {/* Categoría */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[180px]"
                      >
                        <option value="" className="bg-slate-800">Ninguna</option>
                        {[...data.categories[t.type]].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                          <option key={cat.name} value={cat.name} className="bg-slate-800">{cat.name}</option>
                        ))}
                      </select>
                    ) : (
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
                    )}
                  </td>

                  {/* Rubro */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                    {isEditing ? (
                      <select
                        value={editFund}
                        onChange={(e) => setEditFund(e.target.value)}
                        className="bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[180px]"
                      >
                        <option value="" className="bg-slate-800">Ninguno</option>
                        {uniqueFunds.map(fund => (
                          <option key={fund} value={fund} className="bg-slate-800">{fund}</option>
                        ))}
                      </select>
                    ) : t.allocationFund ? (
                      <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">
                        {t.allocationFund}
                      </span>
                    ) : '-'}
                  </td>

                  {/* Monto */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 mr-1 text-sm font-bold font-mono">
                          {t.type === 'income' ? '+' : '-'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-24 text-right font-mono font-bold"
                        />
                      </div>
                    ) : (
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    )}
                  </td>
                  
                  {/* Acciones */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSave(t.id)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 p-2 rounded-lg hover:bg-emerald-500/20 cursor-pointer"
                          title="Guardar cambios"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-slate-400 hover:text-rose-400 transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => startEditing(t)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 p-2 rounded-lg hover:bg-indigo-500/20 cursor-pointer"
                          title="Editar transacción"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteTransaction(t.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer bg-white/5 p-2 rounded-lg hover:bg-rose-500/10"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 border-none" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
