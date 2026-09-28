import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { PageHeader, Card, EmptyState, SearchInput, Select, Button, Input, Badge } from '../components/ui';
import { History, User, Clock, Filter, X, Calendar, Layers, ShieldCheck } from 'lucide-react';

export default function HistoryPage() {
  const [history] = useState(db.getHistory());
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const users = db.getUsers();
  const people = db.getPeople();

  const entities = useMemo(() => {
    return Array.from(new Set(history.map(h => h.entity)));
  }, [history]);

  const uniqueUsers = useMemo(() => {
    const ids = Array.from(new Set(history.map(h => h.userId)));
    return ids.map(id => {
      const u = users.find(user => user.id === id);
      const p = people.find(person => person.id === id);
      return {
        id,
        name: u?.name || p?.name || (id === 'sys' ? 'Sistema' : id),
      };
    });
  }, [history, users, people]);

  const entityLabels: Record<string, string> = {
    project: 'Projetos',
    person: 'Pessoas',
    equipment: 'Equipamentos',
    problem: 'Problemas',
    gut: 'Matriz GUT',
    actionPlan: 'Planos 5W2H',
    maintenance: 'Manutenção',
    production: 'Produção',
    nonConformity: 'Não Conformidades',
    user: 'Usuários',
    system: 'Sistema',
    area_map: 'Mapa de Áreas',
    layout: 'Layouts / Áreas',
  };

  const actionTypes = [
    { value: '', label: 'Todas as Ações' },
    { value: 'criad', label: 'Criação / Cadastro' },
    { value: 'salv', label: 'Salvo / Registro' },
    { value: 'edit', label: 'Edição / Atualização' },
    { value: 'atualiz', label: 'Atualização de Dados' },
    { value: 'exclu', label: 'Exclusão / Remoção' },
    { value: 'status', label: 'Mudança de Status' },
  ];

  const filtered = useMemo(() => {
    return history.filter(h => {
      // 1. Text Search
      const matchSearch = !search ||
        h.action.toLowerCase().includes(search.toLowerCase()) ||
        h.details.toLowerCase().includes(search.toLowerCase());

      // 2. Entity
      const matchEntity = !filterEntity || h.entity === filterEntity;

      // 3. User
      const matchUser = !filterUser || h.userId === filterUser;

      // 4. Action Type
      const matchActionType = !filterActionType ||
        h.action.toLowerCase().includes(filterActionType.toLowerCase());

      // 5. Date Range
      let matchDate = true;
      if (startDate || endDate) {
        const itemDateStr = h.createdAt ? h.createdAt.split('T')[0] : '';
        if (startDate && itemDateStr < startDate) matchDate = false;
        if (endDate && itemDateStr > endDate) matchDate = false;
      }

      return matchSearch && matchEntity && matchUser && matchActionType && matchDate;
    });
  }, [history, search, filterEntity, filterUser, filterActionType, startDate, endDate]);

  const getUserName = (userId: string) => {
    const u = users.find(user => user.id === userId);
    if (u) return u.name;
    const p = people.find(person => person.id === userId);
    if (p) return p.name;
    return userId === 'sys' ? 'Sistema' : 'Usuário';
  };

  const hasActiveFilters = !!(search || filterEntity || filterUser || filterActionType || startDate || endDate);

  const clearFilters = () => {
    setSearch('');
    setFilterEntity('');
    setFilterUser('');
    setFilterActionType('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico & Auditoria"
        subtitle="Rastreabilidade completa de todas as operações realizadas no sistema"
      />

      {/* Filter Controls Bar */}
      <Card className="p-4 shadow-sm border border-gray-200">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Pesquisar por ação, detalhes ou termo..."
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Select
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                className="w-full sm:w-44 text-xs"
              >
                <option value="">Todos os Módulos</option>
                {entities.map(e => (
                  <option key={e} value={e}>
                    {entityLabels[e] || e}
                  </option>
                ))}
              </Select>

              <Select
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="w-full sm:w-44 text-xs"
              >
                <option value="">Todos os Usuários</option>
                {uniqueUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>

              <Select
                value={filterActionType}
                onChange={e => setFilterActionType(e.target.value)}
                className="w-full sm:w-44 text-xs"
              >
                {actionTypes.map(at => (
                  <option key={at.value} value={at.value}>
                    {at.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Date Range Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Calendar size={14} /> Período:
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-xs py-1 px-2 w-36"
                />
                <span className="text-xs text-gray-400">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-xs py-1 px-2 w-36"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge color="blue">
                {filtered.length} registro(s) encontrado(s)
              </Badge>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-600">
                  <X size={14} className="inline mr-1" /> Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<History size={48} />}
          title="Nenhum registro correspondente"
          description="Tente ajustar os filtros ou a busca para localizar registros do histórico."
        />
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map(h => {
            const isDelete = h.action.toLowerCase().includes('exclu') || h.action.toLowerCase().includes('remov');
            const isCreate = h.action.toLowerCase().includes('cri') || h.action.toLowerCase().includes('cadastr') || h.action.toLowerCase().includes('adicion');
            const isSave = h.action.toLowerCase().includes('salv') || h.action.toLowerCase().includes('edit') || h.action.toLowerCase().includes('atualiz');

            return (
              <Card
                key={h.id}
                className={`p-3.5 hover:border-gray-300 transition-colors border-l-4 ${
                  isDelete ? 'border-l-red-500' : isCreate ? 'border-l-green-500' : isSave ? 'border-l-blue-500' : 'border-l-gray-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isDelete
                        ? 'bg-red-50 text-red-600'
                        : isCreate
                        ? 'bg-green-50 text-green-600'
                        : isSave
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <History size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{h.action}</p>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        {entityLabels[h.entity] || h.entity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{h.details}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1 text-gray-600">
                        <User size={12} className="text-gray-400" /> {getUserName(h.userId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(h.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length > 100 && (
            <p className="text-center text-xs text-gray-500 py-3 bg-gray-50 rounded-lg border border-gray-200">
              Mostrando os 100 registros mais recentes de um total de {filtered.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
