import React from 'react';
import { Home, PieChart, Receipt, Settings, Wallet, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'transactions', label: 'Transacciones', icon: Receipt },
    { id: 'budgets', label: 'Presupuestos', icon: PieChart },
  ];

  return (
    <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 text-slate-300 flex flex-col h-screen fixed top-0 left-0 z-20">
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-3">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Family Finance</h1>
          <p className="text-[10px] uppercase tracking-[2px] opacity-50 mt-0.5">Gestión Familiar</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
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

      <div className="p-4 border-t border-white/10 bg-white/5 space-y-2">
        <button className="flex items-center w-full px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <Settings className="w-5 h-5 mr-3 opacity-70" />
          Configuración
        </button>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-400/80 hover:text-white hover:bg-rose-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 opacity-80" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
