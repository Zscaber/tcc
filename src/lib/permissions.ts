import { User, UserRole, Problem } from '../types';

/**
 * Matriz de Permissões e Regras de Negócio do Manutenção Flexível
 * 
 * Roles:
 * - admin: Acesso total (CRUD irrestrito em todos os módulos e gerenciamento de usuários).
 * - manager (Gestor): Gestão de projetos, aprovação de problemas, criação de 5W2H, acompanhamento.
 * - technician (Técnico): Análise técnica, Matriz GUT, Planos 5W2H, Execução/Registro de Manutenção.
 * - employee (Funcionário): Consulta e registro de solicitações/problemas (edita apenas os próprios em fase inicial).
 * - student (Aluno): Consulta educacional e registro de problemas/solicitações (edita apenas os próprios em fase inicial).
 */

export const Permissions = {
  // 1. USUÁRIOS
  canManageUsers: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 2. PROJETOS
  canCreateProject: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canEditProject: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canDeleteProject: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 3. PESSOAS / COLABORADORES
  canManagePeople: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canDeletePeople: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 4. EQUIPAMENTOS
  canCreateEquipment: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canEditEquipment: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canDeleteEquipment: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 5. PROBLEMAS & SOLICITAÇÕES
  canCreateProblem: (_user: User | null): boolean => {
    // Todos os usuários autenticados podem registrar problemas/solicitações
    return !!_user;
  },
  canEditProblem: (user: User | null, problem?: Problem): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager' || user.role === 'technician') {
      return true;
    }
    // Funcionário e Aluno só podem editar o próprio problema e apenas se estiver na fase inicial ("identified")
    if (user.role === 'employee' || user.role === 'student') {
      if (!problem) return true; // criação
      const isOwner = problem.responsibleId === user.id || !problem.responsibleId;
      const isInitialStage = problem.status === 'identified';
      return isOwner && isInitialStage;
    }
    return false;
  },
  canDeleteProblem: (user: User | null): boolean => {
    return user?.role === 'admin';
  },
  canChangeProblemTechnicalStatus: (user: User | null): boolean => {
    // Apenas Admin, Gestor e Técnico podem aprovar ou mudar status para análise/tratamento/resolvido
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },

  // 6. MATRIZ GUT
  canManageGut: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canDeleteGut: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 7. PLANOS DE AÇÃO 5W2H
  canCreate5W2H: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canEdit5W2H: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canDelete5W2H: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 8. MANUTENÇÃO
  canCreateMaintenance: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canEditMaintenance: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canDeleteMaintenance: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 9. CRONOGRAMA
  canManageSchedule: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canDeleteSchedule: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 10. PRODUÇÃO & QUALIDADE
  canManageProduction: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canDeleteProduction: (user: User | null): boolean => {
    return user?.role === 'admin';
  },
  canManageQuality: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },
  canDeleteQuality: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 11. MAPA DE ÁREAS (LAYOUT)
  canManageAreaMaps: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager';
  },
  canDeleteAreaMaps: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 12. EXCLUSÃO GENÉRICA
  canDeleteAny: (user: User | null): boolean => {
    return user?.role === 'admin';
  },

  // 13. SOLICITAÇÕES DE MANUTENÇÃO
  /** Todos os perfis autenticados podem abrir solicitações */
  canCreateRequest: (user: User | null): boolean => !!user,

  /** Solicitante pode ver apenas as próprias; técnico/gestor/admin veem todas */
  canViewAllRequests: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },

  /** Apenas técnico, gestor e admin podem alterar status */
  canManageRequest: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';
  },

  /** Solicitante pode cancelar a própria enquanto ainda pendente */
  canCancelOwnRequest: (user: User | null, requesterId: string, status: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager' || user.role === 'technician') return true;
    return user.id === requesterId && status === 'pending';
  },

  /** Admin pode excluir */
  canDeleteRequest: (user: User | null): boolean => user?.role === 'admin',
};
