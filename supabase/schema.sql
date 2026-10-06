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
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA E CONTROLE DE ACESSO POR ROLE
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

-- Helper function to fetch the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. PROFILES
DROP POLICY IF EXISTS "Leitura de Perfis" ON profiles;
DROP POLICY IF EXISTS "Perfis - Leitura Autenticada" ON profiles;
DROP POLICY IF EXISTS "Perfis - Atualizacao Admin ou Proprio" ON profiles;
DROP POLICY IF EXISTS "Perfis - Exclusao Apenas Admin" ON profiles;

CREATE POLICY "Perfis - Leitura Autenticada" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Perfis - Atualizacao Admin ou Proprio" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.get_auth_user_role() = 'admin'
  );

CREATE POLICY "Perfis - Exclusao Apenas Admin" ON profiles
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 2. PROBLEMAS & SOLICITAÇÕES
DROP POLICY IF EXISTS "Problemas - Leitura" ON problems;
DROP POLICY IF EXISTS "Problemas - Insercao" ON problems;
DROP POLICY IF EXISTS "Problemas - Atualizacao" ON problems;
DROP POLICY IF EXISTS "Problemas - Exclusao" ON problems;

CREATE POLICY "Problemas - Leitura" ON problems
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Problemas - Insercao" ON problems
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Problemas - Atualizacao" ON problems
  FOR UPDATE USING (
    public.get_auth_user_role() IN ('admin', 'manager', 'technician')
    OR (responsible_id = auth.uid()::text AND status = 'identified')
  );

CREATE POLICY "Problemas - Exclusao" ON problems
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 3. MATRIZ GUT
DROP POLICY IF EXISTS "GUT - Leitura" ON gut_analyses;
DROP POLICY IF EXISTS "GUT - Insercao e Atualizacao" ON gut_analyses;
DROP POLICY IF EXISTS "GUT - Exclusao" ON gut_analyses;

CREATE POLICY "GUT - Leitura" ON gut_analyses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "GUT - Insercao e Atualizacao" ON gut_analyses
  FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager', 'technician'));

CREATE POLICY "GUT - Exclusao" ON gut_analyses
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 4. PLANOS DE AÇÃO 5W2H
DROP POLICY IF EXISTS "5W2H - Leitura" ON action_plans;
DROP POLICY IF EXISTS "5W2H - Insercao e Atualizacao" ON action_plans;
DROP POLICY IF EXISTS "5W2H - Exclusao" ON action_plans;

CREATE POLICY "5W2H - Leitura" ON action_plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "5W2H - Insercao e Atualizacao" ON action_plans
  FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager', 'technician'));

CREATE POLICY "5W2H - Exclusao" ON action_plans
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 5. ORDENS DE MANUTENÇÃO
DROP POLICY IF EXISTS "Manutencao - Leitura" ON maintenance_records;
DROP POLICY IF EXISTS "Manutencao - Insercao e Atualizacao" ON maintenance_records;
DROP POLICY IF EXISTS "Manutencao - Exclusao" ON maintenance_records;

CREATE POLICY "Manutencao - Leitura" ON maintenance_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Manutencao - Insercao e Atualizacao" ON maintenance_records
  FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager', 'technician'));

CREATE POLICY "Manutencao - Exclusao" ON maintenance_records
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 6. EQUIPAMENTOS, PROJETOS, PESSOAS, PRODUÇÃO, QUALIDADE, LAYOUTS
DROP POLICY IF EXISTS "Equipamentos - Modificacao" ON equipment;
CREATE POLICY "Equipamentos - Leitura" ON equipment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Equipamentos - Modificacao" ON equipment FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager'));
CREATE POLICY "Equipamentos - Exclusao" ON equipment FOR DELETE USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Projetos - Leitura" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Projetos - Modificacao" ON projects FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager'));
CREATE POLICY "Projetos - Exclusao" ON projects FOR DELETE USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Pessoas - Leitura" ON people FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Pessoas - Modificacao" ON people FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager'));
CREATE POLICY "Pessoas - Exclusao" ON people FOR DELETE USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Producao - Leitura" ON production_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Producao - Modificacao" ON production_activities FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager'));
CREATE POLICY "Producao - Exclusao" ON production_activities FOR DELETE USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Qualidade - Leitura" ON non_conformities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualidade - Modificacao" ON non_conformities FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager', 'technician'));
CREATE POLICY "Qualidade - Exclusao" ON non_conformities FOR DELETE USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Layouts - Leitura" ON layouts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Layouts - Modificacao" ON layouts FOR ALL USING (public.get_auth_user_role() IN ('admin', 'manager'));
CREATE POLICY "Layouts - Exclusao" ON layouts FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- 7. NOTIFICAÇÕES & HISTÓRICO
CREATE POLICY "Notificacoes - Visualizacao Propria" ON notifications FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Notificacoes - Modificacao Propria" ON notifications FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Notificacoes - Insercao" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Historico - Leitura" ON history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Historico - Insercao" ON history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Historico - Exclusao Apenas Admin" ON history FOR DELETE USING (public.get_auth_user_role() = 'admin');

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

