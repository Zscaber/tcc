import React, { useState, useMemo } from 'react';
import { db, isDateOverdue, getOverdueDaysText, isDateUpcoming } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Card, EmptyState, Badge } from '../components/ui';
import {
  Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle, CheckCircle,
  Wrench, ShieldAlert, ClipboardList, ArrowRight, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(db.getNotifications(user?.id));
  const [filterTab, setFilterTab] = useState<'all' | 'system' | 'unread' | 'read'>('all');

  const maintenanceRecords = db.getMaintenanceRecords();
  const equipment = db.getEquipment();
  const problems = db.getProblems();
  const gutAnalyses = db.getGutAnalyses();
  const actionPlans = db.getActionPlans();
  const nonConformities = db.getNonConformities();

  // 1. Live System-Generated Realtime Alerts
  const systemAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      message: string;
      type: 'error' | 'warning' | 'info';
      source: string;
      createdAt: string;
      targetPath: string;
      actionLabel: string;
    }> = [];

    // Overdue Maintenances
    maintenanceRecords.forEach(m => {
      if (m.status !== 'completed' && m.status !== 'cancelled' && isDateOverdue(m.deadline, m.status)) {
        const eq = equipment.find(e => e.id === m.equipmentId);
        const overdueDays = getOverdueDaysText(m.deadline);
        alerts.push({
          id: `sys-maint-overdue-${m.id}`,
          title: `Manutenção Atrasada: ${eq?.name || 'Equipamento'}`,
          message: `${m.description} — Prazo era ${m.deadline} (${overdueDays || 'Vencida'}). Requer intervenção imediata.`,
          type: 'error',
          source: 'Manutenção',
          createdAt: m.date || new Date().toISOString(),
          targetPath: '/maintenance',
          actionLabel: 'Ver no Módulo Manutenção',
        });
      }
    });

    // Critical GUT Problems (score >= 40 or 'Crítico')
    problems.forEach(pr => {
      if (pr.status !== 'resolved' && pr.status !== 'cancelled') {
        const gut = gutAnalyses.find(g => g.problemId === pr.id);
        if (gut && (gut.classification === 'Crítico' || (gut.score && gut.score >= 40))) {
          alerts.push({
            id: `sys-prob-critical-${pr.id}`,
            title: `Problema com Alta Criticidade: ${pr.title}`,
            message: `Setor: ${pr.sector || 'Geral'} | Pontuação GUT: ${gut.score} (${gut.classification}). Plano de ação necessário.`,
            type: 'error',
            source: 'Problemas / GUT',
            createdAt: pr.identificationDate || pr.createdAt || new Date().toISOString(),
            targetPath: '/problems',
            actionLabel: 'Ver no Módulo Problemas',
          });
        }
      }
    });

    // Overdue Action Plans (5W2H)
    actionPlans.forEach(ap => {
      if (ap.status !== 'completed' && ap.status !== 'cancelled' && isDateOverdue(ap.when, ap.status)) {
        const overdueDays = getOverdueDaysText(ap.when);
        alerts.push({
          id: `sys-ap-overdue-${ap.id}`,
          title: `Plano de Ação 5W2H Atrasado: ${ap.what}`,
          message: `Local: ${ap.where} | Vencimento previsto: ${ap.when} (${overdueDays || 'Vencido'}).`,
          type: 'warning',
          source: 'Plano 5W2H',
          createdAt: ap.createdAt || new Date().toISOString(),
          targetPath: '/action-plans',
          actionLabel: 'Ver no Módulo 5W2H',
        });
      }
    });

    // High / Critical Severity NonConformities
    nonConformities.forEach(nc => {
      if (nc.status !== 'resolved' && nc.status !== 'cancelled' && (nc.severity === 'critica' || nc.severity === 'alta')) {
        alerts.push({
          id: `sys-nc-severe-${nc.id}`,
          title: `Não Conformidade Crítica: ${nc.title}`,
          message: `Setor: ${nc.sector || 'Geral'} | Causa: ${nc.cause || 'Em averiguação'} | Severidade: ${nc.severity?.toUpperCase()}`,
          type: 'error',
          source: 'Qualidade',
          createdAt: nc.identificationDate || nc.createdAt || new Date().toISOString(),
          targetPath: '/quality',
          actionLabel: 'Ver no Módulo Qualidade',
        });
      }
    });

    // Upcoming Maintenances in 7 days
    maintenanceRecords.forEach(m => {
      if (m.status !== 'completed' && m.status !== 'cancelled' && !isDateOverdue(m.deadline, m.status) && isDateUpcoming(m.deadline, 7)) {
        const eq = equipment.find(e => e.id === m.equipmentId);
        alerts.push({
          id: `sys-maint-upcoming-${m.id}`,
          title: `Manutenção Próxima: ${eq?.name || 'Equipamento'}`,
          message: `${m.description} — Agendada para ${m.deadline}. Prepare ferramentas e insumos.`,
          type: 'info',
          source: 'Manutenção',
          createdAt: m.date || new Date().toISOString(),
          targetPath: '/maintenance',
          actionLabel: 'Ver Manutenção',
        });
      }
    });

    return alerts;
  }, [maintenanceRecords, equipment, problems, gutAnalyses, actionPlans, nonConformities]);

  const markRead = (id: string) => {
    db.markNotificationRead(id);
    setNotifications(db.getNotifications(user?.id));
  };

  const markAllRead = () => {
    if (user?.id) {
      db.markAllNotificationsRead(user.id);
      setNotifications(db.getNotifications(user?.id));
    }
  };

  const unreadStored = notifications.filter(n => !n.read);
  const readStored = notifications.filter(n => n.read);

  const getNotificationTargetPath = (relatedEntity?: string): string => {
    switch (relatedEntity) {
      case 'maintenance': return '/maintenance';
      case 'problem': return '/problems';
      case 'gut': return '/gut';
      case 'actionPlan': return '/action-plans';
      case 'equipment': return '/equipment';
      case 'project': return '/projects';
      case 'quality':
      case 'nonConformity': return '/quality';
      case 'production': return '/production';
      case 'area_map':
      case 'layout': return '/layout';
      default: return '/dashboard';
    }
  };

  const icons = { warning: AlertTriangle, info: Info, error: AlertCircle, success: CheckCircle };
  const colors = {
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    success: 'text-green-600 bg-green-50 border-green-200'
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Notificações & Alertas"
        subtitle={`${systemAlerts.length} alerta(s) de sistema e ${unreadStored.length} mensagem(ns) não lida(s)`}
        actions={
          unreadStored.length > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              <CheckCheck size={16} className="inline mr-1" /> Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Todas ({systemAlerts.length + notifications.length})
        </button>
        <button
          onClick={() => setFilterTab('system')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filterTab === 'system'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <ShieldAlert size={14} /> Alertas do Sistema ({systemAlerts.length})
        </button>
        <button
          onClick={() => setFilterTab('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'unread'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Não lidas ({unreadStored.length})
        </button>
        <button
          onClick={() => setFilterTab('read')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'read'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Lidas ({readStored.length})
        </button>
      </div>

      {/* SECTION 1: SYSTEM ALERTS */}
      {(filterTab === 'all' || filterTab === 'system') && systemAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              Alertas Ativos do Sistema ({systemAlerts.length})
            </h3>
            <span className="text-xs text-gray-500">Monitoramento em tempo real</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systemAlerts.map(alert => {
              const Icon = icons[alert.type] || Info;
              return (
                <Card
                  key={alert.id}
                  className={`p-4 border-l-4 transition-all hover:shadow-md cursor-pointer group ${
                    alert.type === 'error'
                      ? 'border-l-red-500 bg-red-50/40 hover:bg-red-50/70 border-red-200'
                      : alert.type === 'warning'
                      ? 'border-l-amber-500 bg-amber-50/40 hover:bg-amber-50/70 border-amber-200'
                      : 'border-l-blue-500 bg-blue-50/40 hover:bg-blue-50/70 border-blue-200'
                  }`}
                  onClick={() => navigate(alert.targetPath)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg border ${colors[alert.type]}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                            {alert.source}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-800 group-hover:text-blue-700">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <div className="self-center">
                      <div className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 group-hover:text-blue-600 group-hover:border-blue-300 transition-all">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: USER STORED NOTIFICATIONS */}
      {(filterTab === 'all' || filterTab === 'unread' || filterTab === 'read') && (
        <div className="space-y-4">
          {filterTab === 'all' && (
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 pt-2">
              <Bell size={18} className="text-blue-600" />
              Histórico de Notificações
            </h3>
          )}

          {/* Unread Section */}
          {(filterTab === 'all' || filterTab === 'unread') && unreadStored.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Não lidas ({unreadStored.length})</p>
              {unreadStored.map(n => {
                const Icon = icons[n.type] || Info;
                const targetPath = getNotificationTargetPath(n.relatedEntity);
                return (
                  <Card key={n.id} className="p-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        onClick={() => targetPath && navigate(targetPath)}
                      >
                        <div className={`p-2 rounded-lg border ${colors[n.type]}`}><Icon size={18} /></div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-800 hover:text-blue-600">{n.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span>{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                            {n.relatedEntity && (
                              <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                Módulo: {n.relatedEntity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {n.relatedEntity && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600"
                            onClick={() => navigate(targetPath)}
                          >
                            Acessar <ArrowRight size={12} className="inline ml-1" />
                          </Button>
                        )}
                        <button
                          onClick={() => markRead(n.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200"
                          title="Marcar como lida"
                        >
                          <Check size={16} className="text-green-600" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Read Section */}
          {(filterTab === 'all' || filterTab === 'read') && readStored.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lidas ({readStored.length})</p>
              {readStored.map(n => {
                const Icon = icons[n.type] || Info;
                const targetPath = getNotificationTargetPath(n.relatedEntity);
                return (
                  <Card key={n.id} className="p-3.5 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        onClick={() => targetPath && navigate(targetPath)}
                      >
                        <div className={`p-2 rounded-lg border ${colors[n.type]}`}><Icon size={16} /></div>
                        <div>
                          <h4 className="font-medium text-xs text-gray-800">{n.title}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      {n.relatedEntity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-500 hover:text-blue-600"
                          onClick={() => navigate(targetPath)}
                        >
                          Ver <ArrowRight size={12} className="inline ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {systemAlerts.length === 0 && notifications.length === 0 && (
            <EmptyState
              icon={<Bell size={48} />}
              title="Nenhuma notificação"
              description="Você não possui notificações ou alertas pendentes no momento."
            />
          )}
        </div>
      )}
    </div>
  );
}
