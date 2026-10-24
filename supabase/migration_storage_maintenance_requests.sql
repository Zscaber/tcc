-- ====================================================================
-- MIGRAÇÃO: BUCKET DE STORAGE PARA FOTOS DE SOLICITAÇÕES DE MANUTENÇÃO
-- Execute no painel SQL do Supabase (SQL Editor)
-- ====================================================================

-- 1. Criar o bucket 'maintenance-requests' se ainda não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-requests',
  'maintenance-requests',
  true,
  5242880, -- Limite de 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Habilitar RLS na tabela de objetos do storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política de Inserção: Usuários autenticados podem enviar imagens
DROP POLICY IF EXISTS "Solicitacoes - Upload de fotos autenticado" ON storage.objects;
CREATE POLICY "Solicitacoes - Upload de fotos autenticado" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'maintenance-requests'
    AND auth.role() = 'authenticated'
  );

-- 4. Política de Leitura: Leitura das fotos para visualização nas solicitações
DROP POLICY IF EXISTS "Solicitacoes - Leitura de fotos" ON storage.objects;
CREATE POLICY "Solicitacoes - Leitura de fotos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'maintenance-requests'
  );

-- 5. Política de Exclusão: Solicitante (proprietário) ou gestores/técnicos podem excluir
DROP POLICY IF EXISTS "Solicitacoes - Exclusao de fotos" ON storage.objects;
CREATE POLICY "Solicitacoes - Exclusao de fotos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'maintenance-requests'
    AND (
      auth.uid() = owner
      OR public.get_auth_user_role() IN ('admin', 'manager', 'technician')
    )
  );
