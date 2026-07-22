import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, cn } from '../lib/utils';
import { LayoutGrid, Plus, Trash2, PieChart, Coins, ArrowRightLeft } from 'lucide-react';
import { LucideIcon } from './Settings';

export function Allocations() {
  const { data, addAllocation, deleteAllocation, addTransaction } = useFinance();

  const sortedIncomeCategories = useMemo(() => {
    return [...data.categories.income].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.categories.income]);

  const [selectedIncomeCat, setSelectedIncomeCat] = useState('');

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
    
    return Array.from(monthsSet).sort().reverse();
  }, [data.transactions]);

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

  useEffect(() => {
    if (sortedIncomeCategories.length > 0 && (!selectedIncomeCat || !sortedIncomeCategories.some(c => c.name === selectedIncomeCat))) {
      setSelectedIncomeCat(sortedIncomeCategories[0].name);
    }
  }, [sortedIncomeCategories, selectedIncomeCat]);

  const [fundName, setFundName] = useState('');
  const [percentage, setPercentage] = useState('');

  // Fund to fund transfer states
  const [transferOrigin, setTransferOrigin] = useState('');
  const [transferDestination, setTransferDestination] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Totals calculation
  const allocationsForCategory = data.allocations
    .filter(a => a.incomeCategory === selectedIncomeCat)
    .sort((a, b) => a.fundName.localeCompare(b.fundName));
  const currentTotalPercent = allocationsForCategory.reduce((acc, a) => acc + a.percentage, 0);

  // Calculate total income for the selected category in the selected month
  const totalIncomeForCategoryMonth = useMemo(() => {
    return data.transactions
      .filter(t => t.type === 'income' && t.category === selectedIncomeCat && (selectedMonth === 'all' || t.date.startsWith(selectedMonth)))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [data.transactions, selectedIncomeCat, selectedMonth]);

  // Unique list of all active funds for transfers
  const allUniqueFunds = useMemo<string[]>(() => {
    return Array.from(new Set(data.allocations.map(a => a.fundName.trim()))).sort((a: string, b: string) => a.localeCompare(b));
  }, [data.allocations]);

  // Calculate actual total balances for each fund (cumulative or filtered by selected month)
  const fundBalances = useMemo(() => {
    const incomeByCat: Record<string, number> = {};
    data.transactions.forEach(t => {
      if (t.type === 'income' && (selectedMonth === 'all' || t.date.startsWith(selectedMonth))) {
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
      }
    });

    const fundExpenses: Record<string, number> = {};
    data.transactions.forEach(t => {
      if (t.allocationFund && (selectedMonth === 'all' || t.date.startsWith(selectedMonth))) {
        if (t.type === 'expense') {
          fundExpenses[t.allocationFund] = (fundExpenses[t.allocationFund] || 0) + t.amount;
        } else if (t.type === 'income') {
          fundExpenses[t.allocationFund] = (fundExpenses[t.allocationFund] || 0) - t.amount;
        }
      }
    });

    const balances: Record<string, number> = {};
    data.allocations.forEach(a => {
      const key = a.fundName.trim();
      balances[key] = 0;
    });

    data.allocations.forEach(a => {
      const incomeForCat = incomeByCat[a.incomeCategory] || 0;
      const assignedAmount = (incomeForCat * a.percentage) / 100;
      const key = a.fundName.trim();
      balances[key] += assignedAmount;
    });

    Object.keys(balances).forEach(key => {
      balances[key] -= (fundExpenses[key] || 0);
    });

    return balances;
  }, [data.allocations, data.transactions, selectedMonth]);

  // Auto-set transfer source and destination
  useEffect(() => {
    if (allUniqueFunds.length > 0) {
      if (!transferOrigin || !allUniqueFunds.includes(transferOrigin)) {
        setTransferOrigin(allUniqueFunds[0]);
      }
    } else {
      setTransferOrigin('');
    }
  }, [allUniqueFunds, transferOrigin]);

  useEffect(() => {
    const filteredDestinations = allUniqueFunds.filter(f => f !== transferOrigin);
    if (filteredDestinations.length > 0) {
      if (!transferDestination || !filteredDestinations.includes(transferDestination)) {
        setTransferDestination(filteredDestinations[0]);
      }
    } else {
      setTransferDestination('');
    }
  }, [allUniqueFunds, transferOrigin, transferDestination]);

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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferOrigin || !transferDestination || !transferAmount || isNaN(Number(transferAmount))) {
      return;
    }
    const amountNum = Number(transferAmount);
    if (amountNum <= 0) {
      alert('El monto a transferir debe ser mayor a cero.');
      return;
    }

    const originBalance = fundBalances[transferOrigin] || 0;
    if (amountNum > originBalance) {
      const confirmOverdraft = window.confirm(
        `El rubro de origen "${transferOrigin}" tiene un saldo de ${formatCurrency(originBalance)}, que es menor al monto de transferencia solicitado (${formatCurrency(amountNum)}). ¿Deseas proceder de todos modos?`
      );
      if (!confirmOverdraft) return;
    }

    let transactionDate = new Date().toISOString().split('T')[0];
    if (selectedMonth !== 'all') {
      const currentCalMonth = new Date().toISOString().substring(0, 7);
      if (selectedMonth !== currentCalMonth) {
        // Establecer al primer día del mes seleccionado
        transactionDate = `${selectedMonth}-01`;
      }
    }

    try {
      // 1. Transaction to subtract from Origin (positive value in database representing outflow)
      await addTransaction({
        type: 'expense',
        amount: amountNum,
        category: 'Transferencias',
        description: `[Transferencia] De ${transferOrigin} a ${transferDestination}`,
        date: transactionDate,
        allocationFund: transferOrigin
      });

      // 2. Transaction to add to Destination (positive income representing inflow to destination)
      await addTransaction({
        type: 'income',
        amount: amountNum,
        category: '',
        description: `[Transferencia] De ${transferOrigin} a ${transferDestination}`,
        date: transactionDate,
        allocationFund: transferDestination
      });

      setTransferAmount('');
      alert(`Transferencia de ${formatCurrency(amountNum)} realizada exitosamente de "${transferOrigin}" a "${transferDestination}".`);
    } catch (err) {
      console.error('Error during transfer:', err);
      alert('Ocurrió un error al realizar la transferencia.');
    }
  };

  const selectedOriginBalance = fundBalances[transferOrigin] || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <LayoutGrid className="w-8 h-8 mr-3 text-emerald-400" /> Distribución
          </h2>
          <p className="text-slate-400 mt-1">Divide tus ingresos en diferentes rubros automáticamente.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-80">Mes vigente:</label>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Formularios */}
        <div className="space-y-6">
          
          {/* Panel Formulario - Crear Regla */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
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
                  {sortedIncomeCategories.map(cat => (
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
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Agregar Rubro
              </button>
            </form>
          </div>

          {/* Panel Formulario - Transferir entre Rubros */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center">
                <ArrowRightLeft className="w-6 h-6 mr-2 text-amber-400" /> Transferir Fondos
              </h3>
              <p className="text-xs text-slate-400">Traspasa dinero directamente desde un rubro a otro.</p>
            </div>

            {allUniqueFunds.length < 2 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                <p className="text-xs text-amber-300">Se necesitan al menos 2 rubros registrados para habilitar las transferencias.</p>
              </div>
            ) : (
              <form onSubmit={handleTransfer} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rubro Origen</label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Saldo: {formatCurrency(selectedOriginBalance)}
                    </span>
                  </div>
                  <select 
                    value={transferOrigin} 
                    onChange={(e) => setTransferOrigin(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                  >
                    {allUniqueFunds.map(fund => (
                      <option key={fund} value={fund} className="bg-slate-900 text-slate-200">
                        {fund} ({formatCurrency(fundBalances[fund] || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rubro Destino</label>
                  <select 
                    value={transferDestination} 
                    onChange={(e) => setTransferDestination(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                  >
                    {allUniqueFunds.filter(f => f !== transferOrigin).map(fund => (
                      <option key={fund} value={fund} className="bg-slate-900 text-slate-200">
                        {fund} ({formatCurrency(fundBalances[fund] || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monto a Transferir</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 50000"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-600"
                  />
                  {transferAmount && !isNaN(Number(transferAmount)) && Number(transferAmount) > 0 && (
                    <div className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20 font-mono tracking-wide mt-1 animate-pulse">
                      {formatCurrency(Number(transferAmount))} COP
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 text-sm"
                >
                  Confirmar Transferencia
                </button>
              </form>
            )}
          </div>

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
                const fundKey = a.fundName.trim();
                const currentBalance = fundBalances[fundKey] || 0;
                
                // Calcular el consumido para este rubro específico en el mes seleccionado
                const consumedAmount = data.transactions
                  .filter(t => t.type === 'expense' && t.allocationFund === fundKey && (selectedMonth === 'all' || t.date.startsWith(selectedMonth)))
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <div 
                    key={a.id} 
                    className={cn(
                      "backdrop-blur-xl border rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 group relative flex flex-col justify-between",
                      currentBalance < 0 
                        ? "bg-rose-500/15 border-rose-500/40 shadow-[0_0_15px_rgba(239,68,68,0.12)]" 
                        : Math.abs(currentBalance) < 0.01
                          ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                          : "bg-white/5 border-white/10"
                    )}
                  >
                    <div>
                      <button 
                        onClick={() => deleteAllocation(a.id)}
                        className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-rose-400 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg mb-2">
                          {a.percentage}%
                        </span>
                        <h4 className="text-lg font-bold text-white leading-tight pr-8">{a.fundName}</h4>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Asignado de {selectedIncomeCat}</p>
                        <p className="text-sm font-bold text-slate-300 font-mono leading-none">{formatCurrency(assignedAmount)}</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Consumido</p>
                        <p className="text-sm font-bold text-rose-400 font-mono leading-none">-{formatCurrency(consumedAmount)}</p>
                      </div>
                      <div className="flex justify-between items-end mt-1 pt-2 border-t border-white/10">
                        <p className="text-xs uppercase tracking-widest font-bold text-slate-400 leading-none">Saldo Rubro</p>
                        <p className={cn("text-base font-bold font-mono leading-none", currentBalance < 0 ? "text-rose-400" : "text-emerald-400")}>
                          {formatCurrency(currentBalance)}
                        </p>
                      </div>
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

