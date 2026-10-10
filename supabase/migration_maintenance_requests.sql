-- ====================================================================
-- MIGRAÇÃO: TABELA DE SOLICITAÇÕES DE MANUTENÇÃO
-- Execute no painel SQL do Supabase (SQL Editor)
-- ====================================================================

-- 14. TABELA DE SOLICITAÇÕES DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  location TEXT,
  equipment_id TEXT,
  requester_id TEXT NOT NULL,            -- auth.uid() do solicitante
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'approved', 'rejected', 'completed')),
  notes TEXT,                            -- observações do responsável técnico
  rejection_reason TEXT,                 -- motivo de rejeição
  linked_problem_id TEXT,                -- vínculo com problema gerado
  photo_url TEXT,                        -- URL de foto (extensível)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_requests_requester ON maintenance_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_sector ON maintenance_requests(sector);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON maintenance_requests(created_at DESC);

-- RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Solicitante vê apenas as próprias; técnico/gestor/admin veem todas
DROP POLICY IF EXISTS "Solicitacoes - Leitura" ON maintenance_requests;
CREATE POLICY "Solicitacoes - Leitura" ON maintenance_requests
  FOR SELECT USING (
    requester_id = auth.uid()::text
    OR public.get_auth_user_role() IN ('admin', 'manager', 'technician')
  );

-- Qualquer usuário autenticado pode criar
DROP POLICY IF EXISTS "Solicitacoes - Insercao" ON maintenance_requests;
CREATE POLICY "Solicitacoes - Insercao" ON maintenance_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solicitante pode atualizar apenas a própria enquanto pendente;
-- técnico/gestor/admin podem sempre atualizar
DROP POLICY IF EXISTS "Solicitacoes - Atualizacao" ON maintenance_requests;
CREATE POLICY "Solicitacoes - Atualizacao" ON maintenance_requests
  FOR UPDATE USING (
    public.get_auth_user_role() IN ('admin', 'manager', 'technician')
    OR (requester_id = auth.uid()::text AND status = 'pending')
  );

-- Apenas admin pode excluir
DROP POLICY IF EXISTS "Solicitacoes - Exclusao" ON maintenance_requests;
CREATE POLICY "Solicitacoes - Exclusao" ON maintenance_requests
  FOR DELETE USING (public.get_auth_user_role() = 'admin');

-- Grants (caso necessário, a linha geral já cobre, mas explicitamos)
GRANT ALL ON maintenance_requests TO anon, authenticated, service_role;
