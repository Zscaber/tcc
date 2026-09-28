-- ====================================================================
-- SCHEMA SQL: SISTEMA DE GESTÃO DE MANUTENÇÃO FLEXÍVEL
-- Banco de Dados: PostgreSQL (Supabase)
-- ====================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIOS (Vinculada ao Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'technician', 'employee', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE PESSOAS / COLABORADORES
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE PROJETOS INDUSTRIAIS
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  sector TEXT,
  responsible_id TEXT,
  team_ids JSONB DEFAULT '[]'::jsonb,
  start_date TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'paused', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  sector TEXT,
  location TEXT,
  responsible_id TEXT,
  status TEXT DEFAULT 'operating' CHECK (status IN ('operating', 'maintenance', 'stopped', 'out_of_service')),
  criticality TEXT DEFAULT 'media' CHECK (criticality IN ('baixa', 'media', 'alta', 'critica')),
  acquisition_date TEXT,
  last_maintenance TEXT,
  next_maintenance TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE PROBLEMAS / FALHAS
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'maintenance' CHECK (category IN ('maintenance', 'production', 'quality', 'safety', 'other')),
  project_id TEXT,
  equipment_id TEXT,
  sector TEXT,
  responsible_id TEXT,
  identification_date TEXT,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'analyzing', 'treating', 'resolved', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA MATRIZ GUT
CREATE TABLE IF NOT EXISTS gut_analyses (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  gravity INT NOT NULL CHECK (gravity BETWEEN 1 AND 5),
  urgency INT NOT NULL CHECK (urgency BETWEEN 1 AND 5),
  tendency INT NOT NULL CHECK (tendency BETWEEN 1 AND 5),
  score INT NOT NULL,
  classification TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA PLANOS DE AÇÃO 5W2H
CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  what TEXT NOT NULL,
  why TEXT,
  where_loc TEXT,
  when_date TEXT,
  who JSONB DEFAULT '[]'::jsonb,
  how TEXT,
  how_much TEXT,
  problem_id TEXT,
  equipment_id TEXT,
  project_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA ORDENS DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  problem_id TEXT,
  action_plan_id TEXT,
  type TEXT DEFAULT 'preventive' CHECK (type IN ('preventive', 'corrective', 'predictive', 'other')),
  description TEXT NOT NULL,
  responsible_id TEXT,
  date TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  notes TEXT,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA ATIVIDADES DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS production_activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  equipment_id TEXT,
  sector TEXT,
  responsible_id TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA NÃO CONFORMIDADES (QUALIDADE)
CREATE TABLE IF NOT EXISTS non_conformities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cause TEXT,
  responsible_id TEXT,
  project_id TEXT,
  equipment_id TEXT,
  sector TEXT,
  severity TEXT DEFAULT 'media' CHECK (severity IN ('baixa', 'media', 'alta', 'critica')),
  problem_id TEXT,
  action_plan_id TEXT,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'analyzing', 'treating', 'resolved', 'cancelled')),
  evidence TEXT,
  identification_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA MAPAS DE ÁREAS (LAYOUT 2D)
CREATE TABLE IF NOT EXISTS layouts (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  width_meters NUMERIC DEFAULT 20,
  length_meters NUMERIC DEFAULT 15,
  background_image TEXT,
  general_photos JSONB DEFAULT '[]'::jsonb,
  elements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT FALSE,
  related_entity TEXT,
  related_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABELA DE HISTÓRICO E AUDITORIA
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_equipment_sector ON equipment(sector);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_problems_equipment ON problems(equipment_id);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_action_plans_problem ON action_plans(problem_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA E ACESSO
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE gut_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para Usuários Autenticados
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso Total Autenticado" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Acesso Total Autenticado" ON %I FOR ALL USING (auth.role() = ''authenticated'');', tbl);
  END LOOP;
END $$;

-- Permitir leitura pública ou anônima quando necessário para perfis de login
CREATE POLICY "Leitura de Perfis" ON profiles FOR SELECT USING (true);

-- ====================================================================
-- TRIGGER: CRIAÇÃO AUTOMÁTICA DE PERFIL NO SIGNUP DO SUPABASE AUTH
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- PERMISSÕES / GRANTS PARA AS ROLES DO SUPABASE
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

