import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { Card, PageHeader, StatCard, Badge, Select } from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  Users, Wrench, CheckCircle2, AlertCircle, Clock, XCircle,
  TrendingUp, Activity, BarChart3, AlertTriangle,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  scheduled: '#a855f7',
  overdue: '#ef4444',
  cancelled: '#6b7280',
};

const CRITICALITY_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  operating: 'Em Operação',
  maintenance: 'Em Manutenção',
  stopped: 'Parado',
  out_of_service: 'Fora de Uso',
};

const EQUIPMENT_STATUS_COLOR: Record<string, string> = {
  operating: '#22c55e',
  maintenance: '#f59e0b',
  stopped: '#f97316',
  out_of_service: '#ef4444',
};

function EmptyData({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <p className="text-sm text-gray-500 italic">{message}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-gray-800 mb-3 mt-6 first:mt-0">{children}</h2>;
}

// ─── Aba Funcionários ─────────────────────────────────────────────────────────

function PersonnelTab({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const people = db.getPeople();
  const allRecords = db.getMaintenanceRecords();

  // filter by period (use createdAt or date)
  const records = useMemo(() => {
    return allRecords.filter(r => {
      const d = r.date || r.createdAt;
      if (!d) return true;
      const day = d.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [allRecords, dateFrom, dateTo]);

  // build per-person stats
  const personStats = useMemo(() => {
    const map = new Map<string, {
      id: string; name: string; position: string;
      total: number; completed: number; in_progress: number;
      overdue: number; scheduled: number; cancelled: number;
    }>();

    records.forEach(r => {
      if (!r.responsibleId) return;
      const person = people.find(p => p.id === r.responsibleId);
      if (!person) return;
      if (!map.has(r.responsibleId)) {
        map.set(r.responsibleId, {
          id: r.responsibleId,
          name: person.name,
          position: person.position,
          total: 0, completed: 0, in_progress: 0,
          overdue: 0, scheduled: 0, cancelled: 0,
        });
      }
      const entry = map.get(r.responsibleId)!;
      entry.total++;
      if (r.status === 'completed') entry.completed++;
      else if (r.status === 'in_progress') entry.in_progress++;
      else if (r.status === 'overdue') entry.overdue++;
      else if (r.status === 'scheduled') entry.scheduled++;
      else if (r.status === 'cancelled') entry.cancelled++;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records, people]);

  const recordsWithResponsible = records.filter(r => r.responsibleId);
  const hasData = recordsWithResponsible.length > 0 && personStats.length > 0;

  // chart data
  const chartData = personStats.map(p => ({
    name: p.name.split(' ')[0], // first name for brevity
    fullName: p.name,
    concluídas: p.completed,
    'Em andamento': p.in_progress,
    atrasadas: p.overdue,
    programadas: p.scheduled,
    canceladas: p.cancelled,
  }));

  // deadline compliance
  const deadlineRecords = records.filter(
    r => r.deadline && (r.status === 'completed' || r.status === 'overdue'),
  );
  const hasDeadlineData = deadlineRecords.length > 0;

  const complianceByPerson = useMemo(() => {
    if (!hasDeadlineData) return [];
    const map = new Map<string, { name: string; onTime: number; late: number }>();
    deadlineRecords.forEach(r => {
      if (!r.responsibleId) return;
      const person = people.find(p => p.id === r.responsibleId);
      if (!person) return;
      if (!map.has(r.responsibleId)) {
        map.set(r.responsibleId, { name: person.name, onTime: 0, late: 0 });
      }
      const entry = map.get(r.responsibleId)!;
      if (r.status === 'completed') {
        // completed is on-time if deadline >= date
        const onTime = !r.date || !r.deadline || r.date <= r.deadline;
        if (onTime) entry.onTime++;
        else entry.late++;
      } else {
        // overdue
        entry.late++;
      }
    });
    return Array.from(map.values()).map(e => ({
      name: e.name,
      taxa: e.onTime + e.late > 0 ? Math.round((e.onTime / (e.onTime + e.late)) * 100) : 0,
      noPrazo: e.onTime,
      atrasadas: e.late,
    }));
  }, [deadlineRecords, people, hasDeadlineData]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Responsáveis com tarefas"
          value={personStats.length}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Total de ordens"
          value={recordsWithResponsible.length}
          icon={<Activity size={20} />}
          color="purple"
        />
        <StatCard
          title="Concluídas"
          value={records.filter(r => r.status === 'completed').length}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />
        <StatCard
          title="Atrasadas"
          value={records.filter(r => r.status === 'overdue').length}
          icon={<AlertCircle size={20} />}
          color="red"
        />
      </div>

      {/* Distribuição de carga */}
      <SectionTitle>Distribuição de Carga por Responsável</SectionTitle>

      {!hasData ? (
        <EmptyData message="Dados insuficientes: nenhum registro de manutenção possui responsável atribuído no período selecionado." />
      ) : (
        <>
          {/* Bar Chart */}
          <Card className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">Ordens por responsável</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="concluídas" stackId="a" fill={STATUS_COLORS.completed} name="Concluídas" />
                <Bar dataKey="Em andamento" stackId="a" fill={STATUS_COLORS.in_progress} name="Em andamento" />
                <Bar dataKey="atrasadas" stackId="a" fill={STATUS_COLORS.overdue} name="Atrasadas" />
                <Bar dataKey="programadas" stackId="a" fill={STATUS_COLORS.scheduled} name="Programadas" />
                <Bar dataKey="canceladas" stackId="a" fill={STATUS_COLORS.cancelled} name="Canceladas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Detailed table */}
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Concluídas</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Atrasadas</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Em andamento</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Taxa %</th>
                </tr>
              </thead>
              <tbody>
                {personStats.map(p => {
                  const taxa = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.position || '—'}</td>
                      <td className="px-3 py-3 text-center font-semibold">{p.total}</td>
                      <td className="px-3 py-3 text-center text-green-600 font-medium">{p.completed}</td>
                      <td className="px-3 py-3 text-center text-red-600 font-medium">{p.overdue}</td>
                      <td className="px-3 py-3 text-center text-blue-600 font-medium">{p.in_progress}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${taxa >= 70 ? 'text-green-600' : taxa >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {taxa}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Cumprimento de Prazos */}
      <SectionTitle>Cumprimento de Prazos por Responsável</SectionTitle>

      {!hasDeadlineData ? (
        <EmptyData message="Dados insuficientes para calcular cumprimento de prazos: são necessários registros com deadline preenchido e status 'concluído' ou 'atrasado'." />
      ) : complianceByPerson.length === 0 ? (
        <EmptyData message="Nenhum responsável identificado nos registros com deadline." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Responsável</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">No Prazo</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Atrasadas</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Taxa de Cumprimento</th>
              </tr>
            </thead>
            <tbody>
              {complianceByPerson.map((p, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-3 py-3 text-center text-green-600 font-medium">{p.noPrazo}</td>
                  <td className="px-3 py-3 text-center text-red-600 font-medium">{p.atrasadas}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold ${p.taxa >= 70 ? 'text-green-600' : p.taxa >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.taxa}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── Aba Máquinas ─────────────────────────────────────────────────────────────

function MachinesTab({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const [filterSector, setFilterSector] = useState('');
  const [filterCriticality, setFilterCriticality] = useState('');

  const allEquipment = db.getEquipment();
  const allRecords = db.getMaintenanceRecords();
  const allProblems = db.getProblems();
  const allRequests = db.getMaintenanceRequests();

  const sectors = useMemo(() => {
    const s = new Set<string>();
    allEquipment.forEach(e => e.sector && s.add(e.sector));
    return Array.from(s).sort();
  }, [allEquipment]);

  const criticalities = useMemo(() => {
    const s = new Set<string>();
    allEquipment.forEach(e => e.criticality && s.add(e.criticality));
    return Array.from(s);
  }, [allEquipment]);

  // filter equipment
  const equipment = useMemo(() => {
    return allEquipment.filter(e => {
      if (filterSector && e.sector !== filterSector) return false;
      if (filterCriticality && e.criticality !== filterCriticality) return false;
      return true;
    });
  }, [allEquipment, filterSector, filterCriticality]);

  // filter records by period
  const records = useMemo(() => {
    return allRecords.filter(r => {
      const d = r.date || r.createdAt;
      if (!d) return true;
      const day = d.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [allRecords, dateFrom, dateTo]);

  const problems = useMemo(() => {
    return allProblems.filter(p => {
      const day = p.createdAt?.slice(0, 10) ?? '';
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [allProblems, dateFrom, dateTo]);

  const requests = useMemo(() => {
    return allRequests.filter(r => {
      const day = r.createdAt?.slice(0, 10) ?? '';
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [allRequests, dateFrom, dateTo]);

  // Status summary
  const statusSummary = useMemo(() => ({
    operating: equipment.filter(e => e.status === 'operating').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    stopped: equipment.filter(e => e.status === 'stopped').length,
    out_of_service: equipment.filter(e => e.status === 'out_of_service').length,
  }), [equipment]);

  const statusPieData = Object.entries(statusSummary)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: EQUIPMENT_STATUS_LABEL[k], value: v, color: EQUIPMENT_STATUS_COLOR[k] }));

  // Occurrences per equipment (top 10)
  const occurrenceData = useMemo(() => {
    return equipment
      .map(eq => {
        const maintCount = records.filter(r => r.equipmentId === eq.id).length;
        const probCount = problems.filter(p => p.equipmentId === eq.id).length;
        const reqCount = requests.filter(r => r.equipmentId === eq.id).length;
        return {
          id: eq.id,
          name: eq.name,
          code: eq.code,
          sector: eq.sector,
          status: eq.status,
          criticality: eq.criticality,
          maintCount,
          probCount,
          reqCount,
          total: maintCount + probCount + reqCount,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [equipment, records, problems, requests]);

  const hasOccurrences = occurrenceData.some(o => o.total > 0);

  // Reincidence: equipment with more than 1 corrective maintenance record
  const reincidentEquipment = useMemo(() => {
    return equipment.filter(eq => {
      const correctiveCount = records.filter(
        r => r.equipmentId === eq.id && r.type === 'corrective',
      ).length;
      const probCount = problems.filter(
        p => p.equipmentId === eq.id && p.category === 'maintenance',
      ).length;
      return correctiveCount > 1 || probCount > 1;
    });
  }, [equipment, records, problems]);

  return (
    <div className="space-y-6">
      {/* Sub-filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            label="Setor"
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
          >
            <option value="">Todos os setores</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="w-48">
          <Select
            label="Criticidade"
            value={filterCriticality}
            onChange={e => setFilterCriticality(e.target.value)}
          >
            <option value="">Todas</option>
            {criticalities.map(c => (
              <option key={c} value={c}>{CRITICALITY_LABEL[c] ?? c}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Status Operacional */}
      <SectionTitle>Status Operacional</SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Em Operação"
          value={statusSummary.operating}
          icon={<CheckCircle2 size={20} />}
          color="green"
        />
        <StatCard
          title="Em Manutenção"
          value={statusSummary.maintenance}
          icon={<Wrench size={20} />}
          color="yellow"
        />
        <StatCard
          title="Parados"
          value={statusSummary.stopped}
          icon={<Clock size={20} />}
          color="orange"
        />
        <StatCard
          title="Fora de Uso"
          value={statusSummary.out_of_service}
          icon={<XCircle size={20} />}
          color="red"
        />
      </div>

      {equipment.length === 0 ? (
        <EmptyData message="Nenhum equipamento encontrado com os filtros selecionados." />
      ) : (
        <>
          {statusPieData.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">Distribuição de status</p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {/* Histórico de Ocorrências */}
      <SectionTitle>Histórico de Ocorrências (Top 10 Equipamentos)</SectionTitle>

      {!hasOccurrences ? (
        <EmptyData message="Nenhuma ocorrência encontrada para os equipamentos no período selecionado." />
      ) : (
        <>
          <Card className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase">Ocorrências por equipamento</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={occurrenceData.filter(o => o.total > 0).map(o => ({
                  name: o.name.length > 18 ? o.name.slice(0, 16) + '…' : o.name,
                  fullName: o.name,
                  'Manutenções': o.maintCount,
                  'Problemas': o.probCount,
                  'Solicitações': o.reqCount,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || _l}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Manutenções" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Problemas" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Solicitações" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equipamento</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Setor</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Criticidade</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Manutenções</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Problemas</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Solicitações</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {occurrenceData.map(eq => (
                  <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div>{eq.name}</div>
                      <div className="text-xs text-gray-400">{eq.code}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{eq.sector || '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge color={
                        eq.status === 'operating' ? 'green' :
                        eq.status === 'maintenance' ? 'yellow' :
                        eq.status === 'stopped' ? 'orange' : 'red'
                      }>
                        {EQUIPMENT_STATUS_LABEL[eq.status] ?? eq.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {eq.criticality ? (
                        <Badge color={
                          eq.criticality === 'critica' ? 'red' :
                          eq.criticality === 'alta' ? 'orange' :
                          eq.criticality === 'media' ? 'yellow' : 'gray'
                        }>
                          {CRITICALITY_LABEL[eq.criticality]}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-blue-600">{eq.maintCount}</td>
                    <td className="px-3 py-3 text-center font-medium text-amber-600">{eq.probCount}</td>
                    <td className="px-3 py-3 text-center font-medium text-purple-600">{eq.reqCount}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-800">{eq.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Reincidência */}
      <SectionTitle>Reincidência de Ocorrências</SectionTitle>

      {reincidentEquipment.length === 0 ? (
        <EmptyData message="Nenhuma reincidência identificada no período. Equipamentos com mais de 1 manutenção corretiva ou problema de manutenção aparecem aqui." />
      ) : (
        <Card className="overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs text-gray-500">
              Equipamentos com <strong>mais de 1 manutenção corretiva</strong> ou <strong>mais de 1 problema de manutenção</strong> no período.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equipamento</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Setor</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Corretivas</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Problemas Manutenção</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Criticidade</th>
              </tr>
            </thead>
            <tbody>
              {reincidentEquipment.map(eq => {
                const correctiveCount = records.filter(
                  r => r.equipmentId === eq.id && r.type === 'corrective',
                ).length;
                const probCount = problems.filter(
                  p => p.equipmentId === eq.id && p.category === 'maintenance',
                ).length;
                return (
                  <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        {eq.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{eq.sector || '—'}</td>
                    <td className="px-3 py-3 text-center font-bold text-orange-600">{correctiveCount}</td>
                    <td className="px-3 py-3 text-center font-bold text-red-600">{probCount}</td>
                    <td className="px-3 py-3 text-center">
                      {eq.criticality ? (
                        <Badge color={
                          eq.criticality === 'critica' ? 'red' :
                          eq.criticality === 'alta' ? 'orange' :
                          eq.criticality === 'media' ? 'yellow' : 'gray'
                        }>
                          {CRITICALITY_LABEL[eq.criticality]}
                        </Badge>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* MTTR/MTBF notice */}
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <BarChart3 size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500">
            <strong>MTTR, MTBF e Disponibilidade</strong> não são calculados pois o sistema não registra
            datas/horas de início e fim de parada reais nos equipamentos. Para habilitar esses indicadores,
            seria necessário registrar o tempo de falha e tempo de reparo em cada ocorrência.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'personnel' | 'machines';

export default function Performance() {
  const [activeTab, setActiveTab] = useState<Tab>('personnel');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Análise de Desempenho"
        subtitle="Funcionários e máquinas industriais"
      />

      {/* Period filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline pb-2"
            >
              Limpar filtro
            </button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'personnel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} />
          Funcionários
        </button>
        <button
          onClick={() => setActiveTab('machines')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'machines' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Wrench size={16} />
          Máquinas
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'personnel' ? (
        <PersonnelTab dateFrom={dateFrom} dateTo={dateTo} />
      ) : (
        <MachinesTab dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </div>
  );
}
