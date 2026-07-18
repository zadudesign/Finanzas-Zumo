import React from 'react';
import { Home, PieChart, Receipt, Settings, Wallet, LogOut, Database, CloudOff, LayoutGrid, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase, hasSupabaseConfig, clearSupabaseKeys } from '../lib/supabase';
import { useFinance } from '../context/FinanceContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onShowAuth: () => void;
}

export function Sidebar({ currentTab, setCurrentTab, isOpen, onClose, onShowAuth }: SidebarProps) {
  const { session } = useFinance();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'transactions', label: 'Transacciones', icon: Receipt },
    { id: 'budgets', label: 'Presupuestos', icon: PieChart },
    { id: 'allocations', label: 'Distribución', icon: LayoutGrid }
  ];

  const handleTabSelect = (tabId: string) => {
    setCurrentTab(tabId);
    onClose();
  };

  return (
    <aside className={cn(
      "w-64 bg-[#0a0f24]/95 md:bg-white/5 backdrop-blur-xl border-r border-white/10 text-slate-300 flex flex-col h-screen fixed top-0 left-0 z-40 overflow-y-auto",
      "transition-transform duration-300 ease-in-out md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-3">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Family Finance</h1>
            <div className="flex items-center mt-0.5">
              {hasSupabaseConfig && session ? (
                <span className="flex items-center text-[8px] uppercase tracking-wider text-emerald-400 font-bold">
                  <Database className="w-2 h-2 mr-1" /> Sincronizado
                </span>
              ) : (
                <span className="flex items-center text-[8px] uppercase tracking-wider text-amber-400 font-bold">
                  <CloudOff className="w-2 h-2 mr-1" /> Solo Local
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Close Button on Mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer"
          title="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleTabSelect(item.id)}
            className={cn(
              "w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
              currentTab === item.id 
                ? "bg-white/10 text-white border border-white/10 shadow-sm" 
                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 mr-3", 
              currentTab === item.id ? "text-indigo-400" : "opacity-70"
            )} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 bg-white/5 space-y-2.5">
        {!session && hasSupabaseConfig && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-1">
            <p className="text-[10px] text-indigo-300 font-semibold mb-1.5 text-center tracking-wide uppercase">Solo Local</p>
            <button 
              onClick={() => {
                onShowAuth();
                onClose();
              }}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              Vincular Supabase
            </button>
          </div>
        )}

        <button 
          onClick={() => handleTabSelect('settings')}
          className={cn(
            "flex items-center w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer",
            currentTab === 'settings' 
              ? "bg-white/10 text-white border border-white/10 shadow-sm" 
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          )}
        >
          <Settings className={cn("w-5 h-5 mr-3 transition-opacity", currentTab === 'settings' ? "opacity-100" : "opacity-70")} />
          Configuración
        </button>

        {session && (
          <button 
            onClick={() => {
              supabase.auth.signOut().catch(() => {});
              clearSupabaseKeys();
              onClose();
            }}
            className="flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-400/80 hover:text-white hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 opacity-80" />
            Cerrar Sesión
          </button>
        )}
      </div>
    </aside>
  );
}
