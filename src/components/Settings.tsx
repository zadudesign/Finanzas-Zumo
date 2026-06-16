import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { 
  User, Database, ShieldCheck, Tag, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  Wallet, TrendingUp, ShoppingBag, PlusCircle, Home, Utensils, Car, Activity, 
  Play, Book, CreditCard, Coffee, Gift, Heart, Plane, Smartphone, Tool, Briefcase,
  Zap, DollarSign, PieChart, Search
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

// Lista de iconos sugeridos para el picker
const SUGGESTED_ICONS = [
  // Finanzas
  'Tag', 'Wallet', 'TrendingUp', 'TrendingDown', 'ShoppingBag', 'ShoppingCart', 'CreditCard', 'DollarSign', 'Coins', 'PiggyBank', 'Receipt', 'Banknote',
  // Comida
  'Utensils', 'Coffee', 'Beer', 'Wine', 'Pizza', 'Apple',
  // Transporte
  'Car', 'Bike', 'Bus', 'Train', 'Plane', 'Ship', 'Fuel',
  // Hogar y Servicios
  'Home', 'Zap', 'Droplet', 'Wifi', 'Phone', 'Lightbulb', 'Wrench',
  // Entretenimiento
  'Play', 'Music', 'Camera', 'Gamepad', 'Tv', 'Film', 'Ticket', 'Headphones',
  // Salud
  'Activity', 'Heart', 'Stethoscope', 'Pill', 'Dumbbell', 'Scissors',
  // Personal
  'Gift', 'Shirt', 'Watch', 'Glasses', 'Gem',
  // Educación y Trabajo
  'Book', 'GraduationCap', 'Briefcase', 'PenTool', 'Monitor', 'Laptop', 'Smartphone', 'Search'
];

/**
 * Componente para renderizar iconos de Lucide dinámicamente
 */
export function LucideIcon({ name, className }: { name: string, className?: string }) {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
}

export function Settings() {
  const { data, addCategory, deleteCategory, resetDatabase } = useFinance();
  const [session, setSession] = useState<any>(null);
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [activeCatType, setActiveCatType] = useState<'income' | 'expense'>('expense');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (hasSupabaseConfig) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error && error.message?.includes('Refresh Token')) supabase.auth.signOut();
        else setSession(session);
      }).catch(() => {});
    }
  }, []);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(activeCatType, { name: newCatName.trim(), icon: selectedIcon });
    setNewCatName('');
    setSelectedIcon('Tag');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-8">Configuración del Sistema</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Perfil y Estado (Sin cambios mayores, solo visual) */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
              <User className="w-4 h-4 mr-2" /> Cuenta de Usuario
            </h3>
            
            {session ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold text-xl">
                    {session.user.email?.[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{session.user.email}</p>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Sesión Activa</p>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <p className="text-[10px] text-emerald-200">Datos protegidos por cifrado de extremo a extremo.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-4">No has iniciado sesión en la nube.</p>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
                  <Database className="w-4 h-4 text-amber-400" />
                  <p className="text-[10px] text-amber-200">Tus datos se guardan solo en este navegador.</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
              <Database className="w-4 h-4 mr-2" /> Infraestructura
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Base de Datos</span>
                <span className={cn("font-bold", hasSupabaseConfig ? "text-emerald-400" : "text-rose-400")}>
                  {hasSupabaseConfig ? "Supabase Cloud" : "Local Storage"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Moneda Primaria</span>
                <span className="text-indigo-400 font-bold">COP ($)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Versión App</span>
                <span className="text-slate-400">v1.3.0-glass</span>
              </div>
            </div>
          </div>
        </div>

        {/* Maestro de Categorías (solo para administradores) */}
        {session && (
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center">
                    <Tag className="w-5 h-5 mr-3 text-cyan-400" /> Administrador de Categorías
                  </h3>
                  <p className="text-sm text-slate-400">Define nombres e iconos para tus flujos de dinero.</p>
                </div>
                
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setActiveCatType('income')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      activeCatType === 'income' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <ArrowUpRight className="w-3 h-3" /> Ingresos
                  </button>
                  <button 
                    onClick={() => setActiveCatType('expense')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      activeCatType === 'expense' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <ArrowDownRight className="w-3 h-3" /> Gastos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nueva Categoría</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="w-12 h-12 bg-black/20 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                          >
                            <LucideIcon name={selectedIcon} className="w-6 h-6" />
                          </button>
                          <input 
                            type="text"
                            placeholder="Nombre (ej: Gimnasio)"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-black/30 transition-colors"
                          />
                        </div>

                        {showIconPicker && (
                          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                            {SUGGESTED_ICONS.map(iconName => (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  setSelectedIcon(iconName);
                                  setShowIconPicker(false);
                                }}
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                  selectedIcon === iconName ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <LucideIcon name={iconName} className="w-5 h-5" />
                              </button>
                            ))}
                          </div>
                        )}

                        <button type="submit" className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                          Crear Categoría
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl">
                    <p className="text-[11px] text-indigo-300/80 leading-relaxed italic">
                      "Usa iconos descriptivos para identificar tus consumos de un vistazo en el dashboard."
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl border border-white/5 p-2 h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 gap-1">
                    {data.categories[activeCatType].map(cat => (
                      <div 
                        key={cat.name} 
                        className="flex justify-between items-center px-4 py-3 rounded-xl hover:bg-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            activeCatType === 'income' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            <LucideIcon name={cat.icon} className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-medium text-slate-200">{cat.name}</span>
                        </div>
                        <button 
                          onClick={() => deleteCategory(activeCatType, cat.name)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zona de Peligro */}
        {session && (
          <div className="lg:col-span-3">
            <div className="bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest flex items-center mb-1">
                  <Trash2 className="w-4 h-4 mr-2" /> Zona de Peligro
                </h3>
                <p className="text-sm text-slate-400">
                  Limpiar la base de datos es una acción que no se puede deshacer. Todos tus datos en la nube (transacciones, categorías y metas de presupuesto) serán borrados permanentemente.
                </p>
              </div>
              <button 
                onClick={async () => {
                  if (window.confirm('¿Estás MÁS QUE SEGURO de que deseas borrar todos tus datos de forma permanente? Esta acción borrará la BBDD.')) {
                    await resetDatabase();
                    alert('Base de datos limpiada. Puedes empezar desde cero.');
                  }
                }}
                className="shrink-0 px-6 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Limpiar Base de Datos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
