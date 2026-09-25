import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Card, StatCard, PageHeader, Select } from '../components/ui';
import { FolderKanban, Wrench, AlertTriangle, ClipboardList, Settings, Bell, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [filterProject, setFilterProject] = useState('');
  const [filterSector, setFilterSector] = useState('');

  const projects = db.getProjects();
  const equipment = db.getEquipment();
  const problems = db.getProblems();
  const actionPlans = db.getActionPlans();
  const maintenanceRecords = db.getMaintenanceRecords();
  const notifications = db.getNotifications(user?.id);

  const filteredProjects = projects.filter(p => (!filterProject || p.id === filterProject) && (!filterSector || p.sector === filterSector));

  // Stats
  const stats = useMemo(() => ({
    activeProjects: projects.filter(p => p.status === 'in_progress').length,
    totalEquipment: equipment.length,
    openProblems: problems.filter(p => p.status !== 'resolved' && p.status !== 'cancelled').length,
    activePlans: actionPlans.filter(a => a.status === 'in_progress' || a.status === 'pending').length,
    overdueMaintenance: maintenanceRecords.filter(m => m.status === 'overdue' || (m.deadline && new Date(m.deadline) < new Date() && m.status !== 'completed')).length,
    unreadNotifications: notifications.filter(n => !n.read).length,
  }), [projects, equipment, problems, actionPlans, maintenanceRecords, notifications]);

  // Charts data
  const projectStatusData = useMemo(() => {
    const statuses = ['planning', 'in_progress', 'paused', 'completed', 'cancelled'];
    const labels: Record<string, string> = { planning: 'Planejamento', in_progress: 'Em Andamento', paused: 'Pausado', completed: 'Concluído', cancelled: 'Cancelado' };
    return statuses.map(s => ({ name: labels[s], value: projects.filter(p => p.status === s).length }));
  }, [projects]);

  const equipmentStatusData = useMemo(() => {
    const statuses = ['operating', 'maintenance', 'stopped', 'out_of_service'];
    const labels: Record<string, string> = { operating: 'Em Operação', maintenance: 'Em Manutenção', stopped: 'Parado', out_of_service: 'Fora de Uso' };
    return statuses.map(s => ({ name: labels[s], value: equipment.filter(e => e.status === s).length }));
  }, [equipment]);

  const productionData = useMemo(() => {
    const activities = db.getProductionActivities();
    return [
      { name: 'Pendentes', value: activities.filter(a => a.status === 'pending').length },
      { name: 'Em Andamento', value: activities.filter(a => a.status === 'in_progress').length },
      { name: 'Concluídas', value: activities.filter(a => a.status === 'completed').length },
      { name: 'Atrasadas', value: activities.filter(a => a.status === 'overdue').length },
    ];
  }, []);

  const qualityData = useMemo(() => {
    const ncs = db.getNonConformities();
    return [
      { name: 'Identificados', value: problems.filter(p => p.status === 'identified').length },
      { name: 'Críticos', value: problems.filter(p => p.status === 'analyzing' || p.status === 'treating').length },
      { name: 'Resolvidos', value: problems.filter(p => p.status === 'resolved').length },
      { name: 'Não Conformidades', value: ncs.length },
      { name: 'Planos de Ação', value: actionPlans.length },
    ];
  }, [problems, actionPlans]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const sectors = [...new Set(projects.map(p => p.sector).filter(Boolean))];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do sistema" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-48">
          <option value="">Todos os projetos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="w-48">
          <option value="">Todos os setores</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard title="Projetos Ativos" value={stats.activeProjects} icon={<FolderKanban size={20} />} color="blue" />
        <StatCard title="Equipamentos" value={stats.totalEquipment} icon={<Wrench size={20} />} color="green" />
        <StatCard title="Problemas Abertos" value={stats.openProblems} icon={<AlertTriangle size={20} />} color="yellow" />
        <StatCard title="Planos de Ação" value={stats.activePlans} icon={<ClipboardList size={20} />} color="purple" />
        <StatCard title="Manut. Atrasadas" value={stats.overdueMaintenance} icon={<Settings size={20} />} color="red" />
        <StatCard title="Alertas" value={stats.unreadNotifications} icon={<Bell size={20} />} color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Projects by status */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Projetos por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={projectStatusData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {projectStatusData.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Equipment status */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status dos Equipamentos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={equipmentStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Production */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Produção - Atividades</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Quality */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Qualidade - Indicadores</h3>
          <ResponsiveContainer width="100%" height={250}>
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

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Últimas Notificações</h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`p-3 rounded-lg border ${n.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                <p className="text-xs text-gray-500">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma notificação</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Manutenções Próximas</h3>
          <div className="space-y-2">
            {maintenanceRecords.filter(m => m.status !== 'completed' && m.status !== 'cancelled').slice(0, 5).map(m => {
              const eq = db.getEquipmentById(m.equipmentId);
              return (
                <div key={m.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">{eq?.name || 'Equipamento'}</p>
                  <p className="text-xs text-gray-500">{m.description} — Prazo: {m.deadline || 'N/A'}</p>
                </div>
              );
            })}
            {maintenanceRecords.filter(m => m.status !== 'completed' && m.status !== 'cancelled').length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma manutenção pendente</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
