import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Allocations } from './components/Allocations';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { hasSupabaseConfig } from './lib/supabase';
import { Menu, Wallet } from 'lucide-react';

function Layout() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { session } = useFinance();

  // Si no hay sesión y el usuario hace clic en "Vincular", mostramos el Auth
  if (showAuth && !session) {
    return <Auth onLogin={() => setShowAuth(false)} />;
  }

  return (
    <div className="h-screen bg-[#020617] text-slate-100 font-sans relative overflow-hidden flex flex-col md:flex-row">
      {/* Decorative Background Mesh Elements */}
      <div className="fixed top-[-150px] left-[-150px] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-100px] right-[100px] w-[400px] h-[400px] bg-rose-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[-100px] w-[300px] h-[300px] bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Family Finance</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-white/10"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onShowAuth={() => setShowAuth(true)} 
      />

      <main className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8 relative z-10 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto pb-10">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'transactions' && <Transactions />}
          {currentTab === 'budgets' && <Budgets />}
          {currentTab === 'allocations' && <Allocations />}
          {currentTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <Layout />
    </FinanceProvider>
  );
}

