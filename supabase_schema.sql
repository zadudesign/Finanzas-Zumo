-- Esquema de Base de Datos Completo para Supabase (PostgreSQL)
-- Diseñado para Finanzas Familiares y Hybrid Design

-- 1. Tabla de Transacciones (Ingresos y Gastos)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  allocation_fund TEXT, -- Campo para vincular con Fondos (Inversión, Obligaciones)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTA: Si tu tabla 'transactions' ya existe en Supabase y falla por la columna 'allocation_fund',
-- ejecuta la siguiente línea en tu SQL Editor:
-- ALTER TABLE transactions ADD COLUMN IF NOT EXISTS allocation_fund TEXT;


-- 2. Tabla de Presupuestos
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  month VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, category, month)
);


-- 3. Tabla de Categorías (Iconos y montos de presupuesto vinculados)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  amount DECIMAL(12, 2),
  month VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name, type)
);


-- 4. Tabla de Reglas de Distribución (Allocations)
CREATE TABLE IF NOT EXISTS allocations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  income_category TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. Tabla de Elementos Especiales para Fondos (Inversión y Obligaciones)
CREATE TABLE IF NOT EXISTS special_fund_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  fund_type TEXT NOT NULL CHECK (fund_type IN ('Inversión', 'Obligaciones')),
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- Habilitar RLS (Row Level Security) en todas las tablas
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_fund_items ENABLE ROW LEVEL SECURITY;


-- Políticas de Seguridad (RLS) - Permiten que cada usuario acceda solo a sus propios datos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own transactions') THEN
    CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own budgets') THEN
    CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own categories') THEN
    CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own allocations') THEN
    CREATE POLICY "Users can manage their own allocations" ON allocations FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own special fund items') THEN
    CREATE POLICY "Users can manage their own special fund items" ON special_fund_items FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;
