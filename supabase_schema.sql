-- Esquema de Base de Datos para Supabase (PostgreSQL)
-- Diseñado para Finanzas Familiares

-- 1. Tabla de Transacciones (Ingresos y Gastos)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Presupuestos
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  month VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, category, month)
);

-- Políticas de Seguridad (RLS - Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Políticas para transacciones
CREATE POLICY "Users can manage their own transactions" 
ON transactions FOR ALL USING (auth.uid() = user_id);

-- Políticas para presupuestos
CREATE POLICY "Users can manage their own budgets" 
ON budgets FOR ALL USING (auth.uid() = user_id);
