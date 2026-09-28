import React, { useState, useMemo } from 'react';
import { db, isDateOverdue, getOverdueDaysText, isDateUpcoming } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Card, StatCard, PageHeader, Select, Badge, Button } from '../components/ui';
import { FolderKanban, Wrench, AlertTriangle, ClipboardList, Settings, Bell, ShieldAlert, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
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
    return statuses.map(s => ({ name: labels[s], value: projects.filter(p => p.status === s).length })).filter(d => d.value > 0);
  }, [projects]);

  const equipmentStatusData = useMemo(() => {
    const statuses = ['operating', 'maintenance', 'stopped', 'out_of_service'];
    const labels: Record<string, string> = { operating: 'Em Operação', maintenance: 'Em Manutenção', stopped: 'Parado', out_of_service: 'Fora de Uso' };
    return statuses.map(s => ({ name: labels[s], value: filteredEquipment.filter(e => e.status === s).length }));
  }, [filteredEquipment]);

  const productionData = useMemo(() => {
    const activities = db.getProductionActivities();
    return [
      { name: 'Pendentes', value: activities.filter(a => a.status === 'pending').length },
      { name: 'Em Andamento', value: activities.filter(a => a.status === 'in_progress').length },
      { name: 'Concluídas', value: activities.filter(a => a.status === 'completed').length },
      { name: 'Atrasadas', value: activities.filter(a => a.status === 'overdue' || isDateOverdue(a.deadline, a.status)).length },
    ];
  }, []);

  const qualityData = useMemo(() => {
    return [
      { name: 'Identificados', value: filteredProblems.filter(p => p.status === 'identified').length },
      { name: 'Em Análise', value: filteredProblems.filter(p => p.status === 'analyzing' || p.status === 'treating').length },
      { name: 'Resolvidos', value: filteredProblems.filter(p => p.status === 'resolved').length },
      { name: 'Não Conformidades', value: filteredNonConformities.length },
      { name: 'Planos 5W2H', value: filteredActionPlans.length },
    ];
  }, [filteredProblems, filteredNonConformities, filteredActionPlans]);

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
                  <p className="text-lg font-bold text-amber-600">{filteredEquipment.filter(e => e.status === 'maintenance').length}</p>
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
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
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
                  {projectStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
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
              <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
