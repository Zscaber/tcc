import React, { useState } from 'react';
import { db } from '../store';
import { PageHeader, Card, EmptyState, SearchInput, Select } from '../components/ui';
import { History, User, Clock } from 'lucide-react';

export default function HistoryPage() {
  const [history] = useState(db.getHistory());
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const users = db.getUsers();
  const people = db.getPeople();

  const entities = [...new Set(history.map(h => h.entity))];

  const filtered = history.filter(h => {
    const matchSearch = !search || h.action.toLowerCase().includes(search.toLowerCase()) || h.details.toLowerCase().includes(search.toLowerCase());
    const matchEntity = !filterEntity || h.entity === filterEntity;
    return matchSearch && matchEntity;
  });

  const getUserName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    if (u) return u.name;
    const p = people.find(p => p.id === userId);
    return p?.name || 'Sistema';
  };

  const entityLabels: Record<string, string> = {
    project: 'Projeto', person: 'Pessoa', equipment: 'Equipamento', problem: 'Problema',
    gut: 'GUT', actionPlan: 'Plano 5W2H', maintenance: 'Manutenção', production: 'Produção',
    nonConformity: 'Não Conformidade', user: 'Usuário', system: 'Sistema',
  };

  return (
    <div>
      <PageHeader title="Histórico / Auditoria" subtitle="Registro de ações do sistema" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar no histórico..." />
        <Select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-48">
          <option value="">Todas entidades</option>
          {entities.map(e => <option key={e} value={e}>{entityLabels[e] || e}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<History size={48} />} title="Nenhum registro" description="O histórico de ações aparecerá aqui." />
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map(h => (
            <Card key={h.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg"><History size={16} className="text-gray-500" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{h.action}</p>
                  <p className="text-xs text-gray-500">{h.details}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User size={12} /> {getUserName(h.userId)}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{entityLabels[h.entity] || h.entity}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length > 100 && <p className="text-center text-sm text-gray-500 py-2">Mostrando 100 de {filtered.length} registros</p>}
        </div>
      )}
    </div>
  );
}
