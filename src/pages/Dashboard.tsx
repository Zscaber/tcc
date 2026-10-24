import React, { useState, useMemo } from 'react';
import { db, isDateOverdue, getOverdueDaysText, isDateUpcoming } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Card, StatCard, PageHeader, Select, Badge, Button, StatusBadge } from '../components/ui';
import { FolderKanban, Wrench, AlertTriangle, ClipboardList, Settings, Bell, ShieldAlert, ArrowRight, CheckCircle2, Clock, Shield, Briefcase, HardHat, User, GraduationCap, Activity, CheckCircle, AlertCircle, XCircle, TrendingUp, Users, Calendar, Inbox } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterProject, setFilterProject] = useState('');
  const [filterSector, setFilterSector] = useState('');

  const projects = db.getProjects();
  const equipment = db.getEquipment();
  const problems = db.getProblems();
  const gutAnalyses = db.getGutAnalyses();
  const actionPlans = db.getActionPlans();
  const maintenanceRecords = db.getMaintenanceRecords();
  const nonConformities = db.getNonConformities();
  const notifications = db.getNotifications(user?.id);
  const maintenanceRequests = db.getMaintenanceRequests();
  const people = db.getPeople();
  const productionActivities = db.getProductionActivities();

  // Sectors list
  const sectors = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => p.sector && set.add(p.sector));
    equipment.forEach(e => e.sector && set.add(e.sector));
    problems.forEach(pr => pr.sector && set.add(pr.sector));
    return Array.from(set);
  }, [projects, equipment, problems]);

  // Filtered Datasets
  const filteredEquipment = useMemo(() => {
    return equipment.filter(e => {
      const matchSector = !filterSector || e.sector === filterSector;
      return matchSector;
    });
  }, [equipment, filterSector]);

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchProject = !filterProject || p.projectId === filterProject;
      const matchSector = !filterSector || p.sector === filterSector;
      return matchProject && matchSector;
    });
  }, [problems, filterProject, filterSector]);

  const filteredActionPlans = useMemo(() => {
    return actionPlans.filter(a => {
      const matchProject = !filterProject || a.projectId === filterProject;
      const eq = equipment.find(e => e.id === a.equipmentId);
      const matchSector = !filterSector || (eq && eq.sector === filterSector);
      return matchProject && matchSector;
    });
  }, [actionPlans, equipment, filterProject, filterSector]);

  const filteredMaintenance = useMemo(() => {
    return maintenanceRecords.filter(m => {
      const eq = equipment.find(e => e.id === m.equipmentId);
      const matchSector = !filterSector || (eq && eq.sector === filterSector);
      const prj = eq ? projects.find(p => p.sector === eq.sector) : null;
      const matchProject = !filterProject || (prj && prj.id === filterProject);
      return matchSector && matchProject;
    });
  }, [maintenanceRecords, equipment, projects, filterProject, filterSector]);

  const filteredNonConformities = useMemo(() => {
    return nonConformities.filter(n => {
      const matchProject = !filterProject || n.projectId === filterProject;
      const matchSector = !filterSector || n.sector === filterSector;
      return matchProject && matchSector;
    });
  }, [nonConformities, filterProject, filterSector]);

  // Stats
  const stats = useMemo(() => ({
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    totalEquipment: filteredEquipment.length,
    openProblems: filteredProblems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled').length,
    activePlans: filteredActionPlans.filter(a => a.status === 'in_progress' || a.status === 'pending' || a.status === 'overdue').length,
    overdueMaintenance: filteredMaintenance.filter(m => m.status === 'overdue' || isDateOverdue(m.deadline, m.status)).length,
    unreadNotifications: notifications.filter(n => !n.read).length,
  }), [projects, filteredEquipment, filteredProblems, filteredActionPlans, filteredMaintenance, notifications]);

  // Seção Atenção Necessária (Derived from Live System Data)
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'danger' | 'warning' | 'info';
      badgeText: string;
      targetPath: string;
    }> = [];

    // 1. Manutenções Atrasadas
    filteredMaintenance.forEach(m => {
      if (m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status)) {
        const eq = equipment.find(e => e.id === m.equipmentId);
        const overdueDays = getOverdueDaysText(m.deadline);
        items.push({
          id: `maint-${m.id}`,
          title: `Manutenção Atrasada: ${eq?.name || 'Equipamento'}`,
          subtitle: `${m.description} — Prazo era: ${m.deadline || 'N/A'} (${overdueDays || 'Atrasada'})`,
          type: 'danger',
          badgeText: 'Manutenção Atrasada',
          targetPath: '/maintenance',
        });
      }
    });

    // 2. Problemas Críticos / GUT Elevado
    filteredProblems.forEach(pr => {
      const gut = gutAnalyses.find(g => g.problemId === pr.id);
      if (pr.status !== 'resolved' && pr.status !== 'cancelled' && (gut?.classification === 'Crítico' || (gut?.score && gut.score >= 40))) {
        items.push({
          id: `prob-${pr.id}`,
          title: `Problema Crítico: ${pr.title}`,
          subtitle: `Setor: ${pr.sector || 'Geral'} | Pontuação GUT: ${gut?.score || 0} (${gut?.classification || 'Crítico'})`,
          type: 'danger',
          badgeText: 'Problema Crítico',
          targetPath: '/problems',
        });
      }
    });

    // 3. Planos 5W2H Atrasados
    filteredActionPlans.forEach(ap => {
      if (ap.status !== 'completed' && ap.status !== 'cancelled' && isDateOverdue(ap.when, ap.status)) {
        const overdueDays = getOverdueDaysText(ap.when);
        items.push({
          id: `ap-${ap.id}`,
          title: `Plano 5W2H Atrasado: ${ap.what}`,
          subtitle: `Onde: ${ap.where} | Vencimento: ${ap.when} (${overdueDays || 'Atrasado'})`,
          type: 'warning',
          badgeText: 'Plano 5W2H Atrasado',
          targetPath: '/action-plans',
        });
      }
    });

    // 4. Manutenções Próximas (em até 7 dias)
    filteredMaintenance.forEach(m => {
      if (m.status !== 'completed' && m.status !== 'cancelled' && !isDateOverdue(m.deadline, m.status) && isDateUpcoming(m.deadline, 7)) {
        const eq = equipment.find(e => e.id === m.equipmentId);
        items.push({
          id: `upmaint-${m.id}`,
          title: `Manutenção Próxima: ${eq?.name || 'Equipamento'}`,
          subtitle: `${m.description} — Agendada para: ${m.deadline}`,
          type: 'info',
          badgeText: 'Manutenção Próxima',
          targetPath: '/maintenance',
        });
      }
    });

    // 5. Não Conformidades Críticas
    filteredNonConformities.forEach(nc => {
      if (nc.status !== 'resolved' && nc.status !== 'cancelled' && (nc.severity === 'critica' || nc.severity === 'alta')) {
        items.push({
          id: `nc-${nc.id}`,
          title: `Não Conformidade (${nc.severity.toUpperCase()}): ${nc.title}`,
          subtitle: `Causa: ${nc.cause || 'Em análise'} | Setor: ${nc.sector || 'Geral'}`,
          type: 'danger',
          badgeText: 'Não Conformidade',
          targetPath: '/quality',
        });
      }
    });

    return items;
  }, [filteredMaintenance, filteredProblems, filteredActionPlans, filteredNonConformities, equipment, gutAnalyses]);

  // Chart dataset processing
  const projectStatusData = useMemo(() => {
    const statuses = ['planning', 'in_progress', 'paused', 'completed', 'cancelled'];
    const labels: Record<string, string> = { planning: 'Planejamento', in_progress: 'Em Andamento', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' };
    const colors: Record<string, string> = {
      planning: '#3B82F6',    // Azul (planejamento)
      in_progress: '#06B6D4', // Azul-ciano (em andamento)
      paused: '#F59E0B',      // Âmbar (pausado)
      completed: '#10B981',   // Verde (concluído)
      cancelled: '#6B7280',   // Cinza (cancelado)
    };
    return statuses.map(s => ({
      name: labels[s],
      value: projects.filter(p => p.status === s).length,
      fill: colors[s],
    })).filter(d => d.value > 0);
  }, [projects]);

  const equipmentStatusData = useMemo(() => {
    const statuses = ['operating', 'maintenance', 'stopped', 'out_of_service'];
    const labels: Record<string, string> = { operating: 'Em Operação', maintenance: 'Em Manutenção', stopped: 'Parado', out_of_service: 'Fora de Uso' };
    const colors: Record<string, string> = {
      operating: '#10B981',      // Verde (operacional)
      maintenance: '#3B82F6',    // Azul (manutenção preventiva/corretiva em curso)
      stopped: '#F59E0B',        // Âmbar (parado necessitando atenção)
      out_of_service: '#6B7280', // Cinza (inativo / fora de uso)
    };
    return statuses.map(s => ({
      name: labels[s],
      value: filteredEquipment.filter(e => e.status === s).length,
      fill: colors[s],
    }));
  }, [filteredEquipment]);

  const productionData = useMemo(() => {
    const activities = db.getProductionActivities();
    return [
      { name: 'Pendentes', value: activities.filter(a => a.status === 'pending').length, fill: '#F59E0B' },    // Âmbar (aguardando)
      { name: 'Em Andamento', value: activities.filter(a => a.status === 'in_progress').length, fill: '#3B82F6' }, // Azul (em andamento)
      { name: 'Concluídas', value: activities.filter(a => a.status === 'completed').length, fill: '#10B981' },   // Verde (concluído)
      { name: 'Atrasadas', value: activities.filter(a => a.status === 'overdue' || isDateOverdue(a.deadline, a.status)).length, fill: '#EF4444' }, // Vermelho (atrasado)
    ];
  }, []);

  const qualityData = useMemo(() => {
    return [
      { name: 'Identificados', value: filteredProblems.filter(p => p.status === 'identified').length, fill: '#F59E0B' }, // Âmbar (identificado / atenção)
      { name: 'Em Análise', value: filteredProblems.filter(p => p.status === 'analyzing' || p.status === 'treating').length, fill: '#3B82F6' }, // Azul (em andamento)
      { name: 'Resolvidos', value: filteredProblems.filter(p => p.status === 'resolved').length, fill: '#10B981' },     // Verde (resolvido)
      { name: 'Não Conformidades', value: filteredNonConformities.length, fill: '#EF4444' },                            // Vermelho (não conformidade crítica/grave)
      { name: 'Planos 5W2H', value: filteredActionPlans.length, fill: '#8B5CF6' },                                      // Roxo (categoria de planos de ação)
    ];
  }, [filteredProblems, filteredNonConformities, filteredActionPlans]);

  // ── Identificação Confiável do Usuário na Tabela de Pessoas (People) ──
  const userPerson = useMemo(() => {
    if (!user) return null;
    return people.find(p => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase())) || null;
  }, [people, user]);

  // ── Indicadores Específicos: Administrador (Admin) ──
  const adminMetrics = useMemo(() => {
    const totalMaint = filteredMaintenance.length;
    const completedMaint = filteredMaintenance.filter(m => m.status === 'completed').length;
    const overdueMaint = filteredMaintenance.filter(m => m.status === 'overdue' || isDateOverdue(m.deadline, m.status)).length;
    const inProgressMaint = filteredMaintenance.filter(m => m.status === 'in_progress' || m.status === 'scheduled').length;
    const resolutionRate = totalMaint > 0 ? Math.round((completedMaint / totalMaint) * 100) : null;

    const totalReq = maintenanceRequests.length;
    const openReq = maintenanceRequests.filter(r => r.status === 'pending' || r.status === 'analyzing').length;
    const resolvedReq = maintenanceRequests.filter(r => r.status === 'approved' || r.status === 'completed').length;

    const totalEq = filteredEquipment.length;
    const operatingEq = filteredEquipment.filter(e => e.status === 'operating').length;
    const abnormalEq = filteredEquipment.filter(e => e.status !== 'operating').length;
    const availabilityRate = totalEq > 0 ? Math.round((operatingEq / totalEq) * 100) : null;

    return {
      totalMaintenance: totalMaint,
      completedMaintenance: completedMaint,
      overdueMaintenance: overdueMaint,
      inProgressMaintenance: inProgressMaint,
      completionRate: resolutionRate,
      totalRequests: totalReq,
      openRequests: openReq,
      resolvedRequests: resolvedReq,
      totalEquipment: totalEq,
      operatingEquipment: operatingEq,
      abnormalEquipment: abnormalEq,
      operationalAvailability: availabilityRate,
    };
  }, [filteredMaintenance, maintenanceRequests, filteredEquipment]);

  // ── Indicadores Específicos: Gerente (Manager) ──
  const managerMetrics = useMemo(() => {
    const pendingMaint = filteredMaintenance.filter(m => m.status === 'scheduled' || m.status === 'in_progress').length;
    const overdueMaint = filteredMaintenance.filter(m => m.status === 'overdue' || isDateOverdue(m.deadline, m.status)).length;
    const completedMaint = filteredMaintenance.filter(m => m.status === 'completed').length;
    const totalEvaluated = completedMaint + overdueMaint;
    const onTimeRate = totalEvaluated > 0 ? Math.round((completedMaint / totalEvaluated) * 100) : null;
    const pendingReq = maintenanceRequests.filter(r => r.status === 'pending' || r.status === 'analyzing').length;

    // Equipamentos que mais precisam de atenção
    const criticalEqs = filteredEquipment.filter(e => {
      const isCritical = e.criticality === 'critica' || e.criticality === 'alta';
      const isAbnormal = e.status === 'maintenance' || e.status === 'stopped' || e.status === 'out_of_service';
      const hasOverdue = filteredMaintenance.some(m => m.equipmentId === e.id && (m.status === 'overdue' || isDateOverdue(m.deadline, m.status)));
      return isCritical && (isAbnormal || hasOverdue);
    });

    // Distribuição de atividades por responsável técnico
    const teamDistributionMap: Record<string, { person: { id: string; name: string }; count: number }> = {};
    filteredMaintenance.forEach(m => {
      if (m.responsibleId) {
        const p = people.find(person => person.id === m.responsibleId);
        const name = p?.name || `ID: ${m.responsibleId.slice(0, 8)}`;
        if (!teamDistributionMap[m.responsibleId]) {
          teamDistributionMap[m.responsibleId] = { person: { id: m.responsibleId, name }, count: 0 };
        }
        teamDistributionMap[m.responsibleId].count++;
      }
    });
    const responsibleCounts = Object.values(teamDistributionMap).sort((a, b) => b.count - a.count).slice(0, 4);

    return {
      pendingMaint,
      overdueMaintenance: overdueMaint,
      completedMaint,
      slaRate: onTimeRate,
      pendingRequests: pendingReq,
      criticalEquipmentInAlert: criticalEqs.length,
      responsibleCounts,
    };
  }, [filteredMaintenance, filteredEquipment, people, maintenanceRequests]);

  // ── Indicadores Específicos: Técnico (Technician) ──
  const technicianMetrics = useMemo(() => {
    if (!user) return { totalAssigned: 0, myTasks: [], pending: 0, inProgress: 0, completed: 0, overdue: 0, upcoming: 0 };
    const pId = userPerson?.id;
    // Identificação confiável por ID do usuário ou ID da pessoa vinculada por email
    const myTasks = filteredMaintenance.filter(m => m.responsibleId === user.id || (pId && m.responsibleId === pId));
    
    const pending = myTasks.filter(m => m.status === 'scheduled').length;
    const inProgress = myTasks.filter(m => m.status === 'in_progress').length;
    const completed = myTasks.filter(m => m.status === 'completed').length;
    const overdue = myTasks.filter(m => m.status === 'overdue' || isDateOverdue(m.deadline, m.status)).length;
    
    const upcoming = myTasks.filter(m =>
      m.status !== 'completed' &&
      m.status !== 'cancelled' &&
      !isDateOverdue(m.deadline, m.status) &&
      isDateUpcoming(m.deadline, 15)
    ).length;

    return {
      totalAssigned: myTasks.length,
      myTasks,
      pending,
      inProgress,
      completed,
      overdue,
      upcoming,
    };
  }, [filteredMaintenance, user, userPerson]);

  // ── Indicadores Específicos: Funcionário (Employee) ──
  const employeeMetrics = useMemo(() => {
    if (!user) return { totalRequests: 0, myRequests: [], pending: 0, analyzing: 0, approved: 0, completed: 0, rejected: 0 };
    // Identificação confiável por requesterId === user.id
    const myRequests = maintenanceRequests.filter(r => r.requesterId === user.id);
    
    const pending = myRequests.filter(r => r.status === 'pending').length;
    const analyzing = myRequests.filter(r => r.status === 'analyzing').length;
    const approved = myRequests.filter(r => r.status === 'approved').length;
    const completed = myRequests.filter(r => r.status === 'completed').length;
    const rejected = myRequests.filter(r => r.status === 'rejected').length;

    return {
      totalRequests: myRequests.length,
      myRequests,
      pending,
      analyzing,
      approved,
      completed,
      rejected,
    };
  }, [maintenanceRequests, user]);

  // ── Indicadores Específicos: Aluno (Student) ──
  const studentMetrics = useMemo(() => {
    if (!user) return { myRequests: [], availableMachines: 0, totalMachines: 0, availabilityRate: null, practicalActivities: 0 };
    // Solicitações acadêmicas do próprio aluno
    const myRequests = maintenanceRequests.filter(r => r.requesterId === user.id);
    
    const totalMachines = filteredEquipment.length;
    const availableMachines = filteredEquipment.filter(e => e.status === 'operating').length;
    const availabilityRate = totalMachines > 0 ? Math.round((availableMachines / totalMachines) * 100) : null;
    const practicalActivities = productionActivities.filter(a => a.status === 'in_progress').length;

    return {
      myRequests,
      availableMachines,
      totalMachines,
      availabilityRate,
      practicalActivities,
    };
  }, [maintenanceRequests, filteredEquipment, productionActivities, user]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard de Gestão Industrial" subtitle="Indicadores em tempo real e atenção necessária" />

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <Select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-56 text-xs">
          <option value="">Todos os Projetos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="w-56 text-xs">
          <option value="">Todos os Setores</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        {(filterProject || filterSector) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterProject(''); setFilterSector(''); }}>
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Projetos Ativos" value={stats.activeProjects} icon={<FolderKanban size={20} />} color="blue" />
        <StatCard title="Equipamentos" value={stats.totalEquipment} icon={<Wrench size={20} />} color="green" />
        <StatCard title="Problemas Abertos" value={stats.openProblems} icon={<AlertTriangle size={20} />} color="yellow" />
        <StatCard title="Planos de Ação" value={stats.activePlans} icon={<ClipboardList size={20} />} color="purple" />
        <StatCard title="Manut. Atrasadas" value={stats.overdueMaintenance} icon={<Settings size={20} />} color="red" />
        <StatCard title="Alertas Ativos" value={stats.unreadNotifications} icon={<Bell size={20} />} color="orange" />
      </div>
      {/* Seção de Indicadores por Perfil */}
      {user && (
        <Card className="p-5 shadow-sm bg-gradient-to-r from-gray-50 to-white border border-gray-200">
          {/* Header da Seção de Perfil */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                user.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                user.role === 'technician' ? 'bg-amber-100 text-amber-700' :
                user.role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {user.role === 'admin' && <Shield size={22} />}
                {user.role === 'manager' && <Briefcase size={22} />}
                {user.role === 'technician' && <HardHat size={22} />}
                {user.role === 'student' && <GraduationCap size={22} />}
                {user.role === 'employee' && <User size={22} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 text-base">
                    {user.role === 'admin' && 'Painel Executivo — Administrador'}
                    {user.role === 'manager' && 'Painel Tático — Gestão Operacional'}
                    {user.role === 'technician' && 'Minha Fila de Trabalho — Manutenção'}
                    {user.role === 'student' && 'Ambiente Prático — Aluno'}
                    {user.role === 'employee' && 'Minhas Solicitações — Colaborador'}
                  </h3>
                  <Badge color={
                    user.role === 'admin' ? 'purple' :
                    user.role === 'manager' ? 'blue' :
                    user.role === 'technician' ? 'yellow' :
                    user.role === 'student' ? 'green' : 'gray'
                  }>
                    {user.role === 'admin' ? 'Administrador' :
                     user.role === 'manager' ? 'Gestor' :
                     user.role === 'technician' ? 'Técnico' :
                     user.role === 'student' ? 'Aluno' : 'Colaborador'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user.role === 'admin' && 'Métricas globais consolidadas e integridade do parque fabril'}
                  {user.role === 'manager' && 'Acompanhamento de prazos, triagem de solicitações e criticidade'}
                  {user.role === 'technician' && 'Ordens de serviço atribuídas ao seu usuário e cronograma de intervenções'}
                  {user.role === 'student' && 'Disponibilidade de equipamentos para práticas didáticas e chamados próprios'}
                  {user.role === 'employee' && 'Acompanhamento direto do ciclo de vida das suas solicitações de reparo'}
                </p>
              </div>
            </div>

            {/* Ações Rápidas por Perfil */}
            <div className="flex items-center gap-2">
              {user.role === 'technician' && (
                <Link to="/maintenance">
                  <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                    <Wrench size={14} /> Minhas Ordens
                  </Button>
                </Link>
              )}
              {(user.role === 'employee' || user.role === 'student') && (
                <Link to="/requests">
                  <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                    <Inbox size={14} /> Minhas Solicitações
                  </Button>
                </Link>
              )}
              {user.role === 'manager' && (
                <Link to="/requests">
                  <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                    <Inbox size={14} /> Triagem de Solicitações
                  </Button>
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/reports">
                  <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                    <Activity size={14} /> Relatórios Globais
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Conteúdo Dinâmico por Perfil */}
          <div className="pt-4">
            {/* ADMIN */}
            {user.role === 'admin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Disponibilidade Operacional */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Disponibilidade Operacional</span>
                  {adminMetrics.operationalAvailability !== null ? (
                    <div className="text-xl font-bold text-gray-800 mt-1 flex items-baseline gap-1.5">
                      <span className="text-emerald-600">{adminMetrics.operationalAvailability}%</span>
                      <span className="text-[11px] font-normal text-gray-500">
                        ({adminMetrics.operatingEquipment} de {adminMetrics.totalEquipment} operando)
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400 font-normal">Nenhum equipamento cadastrado</span>
                    </div>
                  )}
                </div>

                {/* 2. Fluxo de Solicitações */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Fluxo de Solicitações</span>
                  {adminMetrics.totalRequests > 0 ? (
                    <div className="text-xl font-bold text-gray-800 mt-1 flex items-baseline gap-1.5">
                      <span>{adminMetrics.openRequests} / {adminMetrics.totalRequests}</span>
                      <span className="text-xs font-normal text-amber-600">em aberto</span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400 font-normal">Nenhuma solicitação registrada</span>
                    </div>
                  )}
                </div>

                {/* 3. Taxa de Conclusão */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Taxa de Conclusão</span>
                  {adminMetrics.completionRate !== null ? (
                    <div className="text-xl font-bold text-gray-800 mt-1 flex items-baseline gap-1.5">
                      <span className="text-emerald-600">{adminMetrics.completionRate}%</span>
                      <span className="text-[11px] font-normal text-gray-500">
                        ({adminMetrics.completedMaintenance} de {adminMetrics.totalMaintenance} concluídas)
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400 font-normal">Sem manutenções para calcular</span>
                    </div>
                  )}
                </div>

                {/* 4. Status de Manutenções */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Status de Manutenções</span>
                  {adminMetrics.totalMaintenance > 0 ? (
                    <div className="text-xl font-bold text-gray-800 mt-1 flex items-center gap-3">
                      <span className="text-blue-600 text-sm font-semibold">
                        {adminMetrics.inProgressMaintenance} <span className="text-[11px] font-normal text-gray-500">em andamento</span>
                      </span>
                      <span className="text-red-600 text-sm font-semibold">
                        {adminMetrics.overdueMaintenance} <span className="text-[11px] font-normal text-gray-500">atrasadas</span>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400 font-normal">Nenhuma manutenção registrada</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MANAGER */}
            {user.role === 'manager' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Solicitações Pendentes</span>
                    <div className="text-xl font-bold text-amber-600 mt-1 flex items-baseline gap-1">
                      <span>{managerMetrics.pendingRequests}</span>
                      <span className="text-[11px] font-normal text-gray-500">aguardando análise</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Manutenções Atrasadas (Equipe)</span>
                    <div className="text-xl font-bold text-red-600 mt-1 flex items-baseline gap-1">
                      <span>{managerMetrics.overdueMaintenance}</span>
                      <span className="text-[11px] font-normal text-gray-500">fora do prazo</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Cumprimento de Prazos (SLA)</span>
                    <div className="text-xl font-bold text-gray-800 mt-1">
                      {managerMetrics.slaRate !== null ? (
                        <span className={managerMetrics.slaRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                          {managerMetrics.slaRate}% <span className="text-[11px] font-normal text-gray-500">no prazo</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-normal">Dados insuficientes</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Equipamentos Críticos em Alerta</span>
                    <div className="text-xl font-bold text-gray-800 mt-1 flex items-baseline gap-1">
                      <span className={managerMetrics.criticalEquipmentInAlert > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {managerMetrics.criticalEquipmentInAlert}
                      </span>
                      <span className="text-[11px] font-normal text-gray-500">em parada ou manutenção</span>
                    </div>
                  </div>
                </div>

                {managerMetrics.responsibleCounts.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mr-2">
                      <Users size={14} className="text-gray-500" /> Carga da Equipe:
                    </span>
                    {managerMetrics.responsibleCounts.map(({ person, count }) => (
                      <span key={person.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-700 border border-gray-200">
                        <span className="font-medium">{person.name}:</span>
                        <span className="font-bold text-blue-600">{count} {count === 1 ? 'ordem' : 'ordens'}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TECHNICIAN */}
            {user.role === 'technician' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Minhas Ordens Atribuídas</span>
                  <div className="text-xl font-bold text-gray-800 mt-1">{technicianMetrics.totalAssigned}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Em Andamento</span>
                  <div className="text-xl font-bold text-blue-600 mt-1">{technicianMetrics.inProgress}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Pendentes / Agendadas</span>
                  <div className="text-xl font-bold text-amber-600 mt-1">{technicianMetrics.pending}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Atrasadas</span>
                  <div className="text-xl font-bold text-red-600 mt-1">{technicianMetrics.overdue}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Próximos 15 Dias</span>
                  <div className="text-xl font-bold text-purple-600 mt-1">{technicianMetrics.upcoming}</div>
                </div>
              </div>
            )}

            {/* EMPLOYEE */}
            {user.role === 'employee' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Minhas Solicitações</span>
                  <div className="text-xl font-bold text-gray-800 mt-1">{employeeMetrics.totalRequests}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Aguardando Triagem</span>
                  <div className="text-xl font-bold text-amber-600 mt-1">
                    {employeeMetrics.pending + employeeMetrics.analyzing}
                    <span className="text-[10px] text-gray-400 font-normal block">
                      {employeeMetrics.pending} novas, {employeeMetrics.analyzing} em análise
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Aprovadas / Em Reparo</span>
                  <div className="text-xl font-bold text-blue-600 mt-1">{employeeMetrics.approved}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Concluídas</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{employeeMetrics.completed}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 col-span-2 sm:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Rejeitadas</span>
                  <div className="text-xl font-bold text-gray-500 mt-1">{employeeMetrics.rejected}</div>
                </div>
              </div>
            )}

            {/* STUDENT */}
            {user.role === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Minhas Solicitações de Reparo</span>
                  <div className="text-xl font-bold text-blue-600 mt-1 flex items-baseline gap-1">
                    <span>{studentMetrics.myRequests.length}</span>
                    <span className="text-[11px] font-normal text-gray-500">abertas por você</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Máquinas Aptas para Prática</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-1">
                    <span>{studentMetrics.availableMachines}</span>
                    <span className="text-[11px] font-normal text-gray-500">de {studentMetrics.totalMachines} ativas</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Taxa de Disponibilidade</span>
                  <div className="text-xl font-bold text-gray-800 mt-1">
                    {studentMetrics.availabilityRate !== null ? (
                      <span className="text-emerald-600">{studentMetrics.availabilityRate}% <span className="text-[11px] font-normal text-gray-500">operacionais</span></span>
                    ) : (
                      <span className="text-xs text-gray-400 font-normal">Dados insuficientes</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">Atividades Práticas Ativas</span>
                  <div className="text-xl font-bold text-purple-600 mt-1 flex items-baseline gap-1">
                    <span>{studentMetrics.practicalActivities}</span>
                    <span className="text-[11px] font-normal text-gray-500">em andamento no laboratório</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}


      {/* Seção ATENÇÃO NECESSÁRIA (Data-Driven Alerts) */}
      <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Atenção Necessária</h3>
              <p className="text-xs text-gray-500">Situações críticas, atrasos e manutenções pendentes de intervenção imediata</p>
            </div>
          </div>
          <Badge color={attentionItems.length > 0 ? 'red' : 'green'}>
            {attentionItems.length} {attentionItems.length === 1 ? 'item pendente' : 'itens pendentes'}
          </Badge>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-6 text-center bg-green-50/60 rounded-xl border border-green-200">
            <CheckCircle2 size={32} className="text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-900 text-sm">Tudo em Ordem!</p>
            <p className="text-xs text-green-700 mt-0.5">Nenhuma manutenção atrasada, problema crítico ou pendência urgente identificada no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {attentionItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(item.targetPath)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  item.type === 'danger'
                    ? 'bg-red-50/70 border-red-200 hover:border-red-400 hover:bg-red-50'
                    : item.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                    : 'bg-blue-50/70 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="space-y-1 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <Badge color={item.type === 'danger' ? 'red' : item.type === 'warning' ? 'yellow' : 'blue'}>
                      {item.badgeText}
                    </Badge>
                  </div>
                  <p className="font-bold text-xs text-gray-800 group-hover:text-blue-700">{item.title}</p>
                  <p className="text-[11px] text-gray-600">{item.subtitle}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Adaptive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status dos Equipamentos */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-between">
            <span>Status dos Equipamentos</span>
            <span className="text-xs font-normal text-gray-500">Total: {filteredEquipment.length}</span>
          </h3>
          {filteredEquipment.length < 3 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-xs text-gray-500 font-medium">Resumo do Parque Industrial:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500">Em Operação</p>
                  <p className="text-lg font-bold text-green-600">{filteredEquipment.filter(e => e.status === 'operating').length}</p>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500">Em Manutenção</p>
                  <p className="text-lg font-bold text-blue-600">{filteredEquipment.filter(e => e.status === 'maintenance').length}</p>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={equipmentStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {equipmentStatusData.map((entry, index) => (
                    <Cell key={`cell-eq-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Status dos Projetos */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-between">
            <span>Status dos Projetos</span>
            <span className="text-xs font-normal text-gray-500">Total: {projects.length}</span>
          </h3>
          {projectStatusData.length < 2 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-xs text-gray-500 font-medium">Resumo dos Projetos:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500">Em Andamento</p>
                  <p className="text-lg font-bold text-blue-600">{projects.filter(p => p.status === 'in_progress').length}</p>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500">Concluídos</p>
                  <p className="text-lg font-bold text-green-600">{projects.filter(p => p.status === 'completed').length}</p>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={projectStatusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-prj-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Produção */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Produção - Atividades</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {productionData.map((entry, index) => (
                  <Cell key={`cell-prod-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Qualidade */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Qualidade e Ocorrências</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={qualityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-qual-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
