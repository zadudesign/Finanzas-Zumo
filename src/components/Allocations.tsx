import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { LayoutGrid, Plus, Trash2, PieChart, Coins } from 'lucide-react';
import { LucideIcon } from './Settings';

export function Allocations() {
  const { data, addAllocation, deleteAllocation } = useFinance();
  const [selectedIncomeCat, setSelectedIncomeCat] = useState(data.categories.income[0]?.name || '');
  const [fundName, setFundName] = useState('');
  const [percentage, setPercentage] = useState('');

  const currentMonth = new Date().toISOString().substring(0, 7);

  // Totals calculation
  const allocationsForCategory = data.allocations
    .filter(a => a.incomeCategory === selectedIncomeCat)
    .sort((a, b) => a.fundName.localeCompare(b.fundName));
  const currentTotalPercent = allocationsForCategory.reduce((acc, a) => acc + a.percentage, 0);

  // Calculate total income for the selected category in the current month
  const totalIncomeForCategoryMonth = useMemo(() => {
    return data.transactions
      .filter(t => t.type === 'income' && t.category === selectedIncomeCat && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [data.transactions, selectedIncomeCat, currentMonth]);

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundName.trim() || !percentage || isNaN(Number(percentage))) return;
    const num = Number(percentage);
    if (num <= 0 || currentTotalPercent + num > 100) {
      alert('El porcentaje no es válido o supera el 100% total.');
      return;
    }
    addAllocation({
      incomeCategory: selectedIncomeCat,
      fundName: fundName.trim(),
      percentage: num
    });
    setFundName('');
    setPercentage('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <LayoutGrid className="w-8 h-8 mr-3 text-emerald-400" /> Distribución
          </h2>
          <p className="text-slate-400 mt-1">Divide tus ingresos en diferentes rubros automáticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel Formulario */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center">
              <PieChart className="w-6 h-6 mr-2 text-indigo-400" /> Crear Regla
            </h3>
            <p className="text-xs text-slate-400">Selecciona una fuente de ingreso y asignale un rubro con porcentaje.</p>
          </div>

          <form onSubmit={handleAddAllocation} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fuente de Ingreso</label>
              <select 
                value={selectedIncomeCat} 
                onChange={(e) => setSelectedIncomeCat(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                {data.categories.income.map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-slate-900 text-slate-200">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Rubro</label>
              <input 
                type="text" 
                placeholder="Ej: Ahorro Vacaciones"
                value={fundName}
                onChange={e => setFundName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Porcentaje (%) - Disponible: {100 - currentTotalPercent}%</label>
              <input 
                type="number" 
                placeholder="Ej: 20"
                min="1"
                max={100 - currentTotalPercent}
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-600"
              />
            </div>

            <button 
              type="submit" 
              disabled={data.categories.income.length === 0 || currentTotalPercent >= 100}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agregar Rubro
            </button>
          </form>

        </div>

        {/* Panel Vista de Distribución */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Ingreso de {selectedIncomeCat} este mes</p>
              <h4 className="text-2xl font-bold text-white">{formatCurrency(totalIncomeForCategoryMonth)}</h4>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rubros Asignados ({currentTotalPercent}%)</h3>
            {allocationsForCategory.length === 0 && (
              <div className="text-center p-8 bg-black/20 rounded-3xl border border-white/5 border-dashed">
                <p className="text-sm text-slate-500">No hay rubros de distribución para este ingreso.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocationsForCategory.map(a => {
                const assignedAmount = (totalIncomeForCategoryMonth * a.percentage) / 100;
                return (
                  <div key={a.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group relative">
                    <button 
                      onClick={() => deleteAllocation(a.id)}
                      className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-rose-400 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg mb-2">
                        {a.percentage}%
                      </span>
                      <h4 className="text-lg font-bold text-white leading-tight pr-8">{a.fundName}</h4>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Monto Asignado</p>
                      <p className="text-xl font-bold text-emerald-400">{formatCurrency(assignedAmount)}</p>
                    </div>
                  </div>
                );
              })}
              
              {currentTotalPercent < 100 && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 border-dashed flex flex-col justify-center items-center opacity-60">
                     <span className="text-lg font-bold text-slate-500 mb-1">No asignado ({100 - currentTotalPercent}%)</span>
                     <p className="text-emerald-400/50 font-bold">{formatCurrency((totalIncomeForCategoryMonth * (100 - currentTotalPercent)) / 100)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
