import React, { useState, useEffect } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { supabase, hasSupabaseConfig } from './lib/supabase';

function Layout() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (hasSupabaseConfig) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error && error.message.includes('Refresh Token')) supabase.auth.signOut();
        else setSession(session);
      }).catch(() => {});
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
      return () => subscription.unsubscribe();
    }
  }, []);

  // Si no hay sesión y el usuario hace clic en "Vincular", mostramos el Auth
  if (showAuth && !session) {
    return <Auth onLogin={() => setShowAuth(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-hidden flex">
      {/* Decorative Background Mesh Elements */}
      <div className="fixed top-[-150px] left-[-150px] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-100px] right-[100px] w-[400px] h-[400px] bg-rose-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[-100px] w-[300px] h-[300px] bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onShowAuth={() => setShowAuth(true)} />
      <main className="flex-1 ml-64 p-8 relative z-10 h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto pb-10">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'transactions' && <Transactions />}
          {currentTab === 'budgets' && <Budgets />}
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

