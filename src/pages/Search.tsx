import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../store';
import { PageHeader, Card, Badge, SearchInput } from '../components/ui';
import { Search, FolderKanban, Users, Wrench, AlertTriangle, ClipboardList, Settings, BarChart3 } from 'lucide-react';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  const results = useMemo(() => {
    if (!activeQuery) return { projects: [], people: [], equipment: [], problems: [], actionPlans: [], maintenance: [], nonConformities: [] };
    const q = activeQuery.toLowerCase();
    return {
      projects: db.getProjects().filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
      people: db.getPeople().filter(p => p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)),
      equipment: db.getEquipment().filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)),
      problems: db.getProblems().filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
      actionPlans: db.getActionPlans().filter(a => a.what.toLowerCase().includes(q) || a.why.toLowerCase().includes(q)),
      maintenance: db.getMaintenanceRecords().filter(m => m.description.toLowerCase().includes(q)),
      nonConformities: db.getNonConformities().filter(n => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)),
    };
  }, [activeQuery]);

  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  const handleSearch = (value: string) => {
    setQuery(value);
    setActiveQuery(value);
  };

  const categories = [
    { key: 'projects', label: 'Projetos', icon: FolderKanban, color: 'blue', link: '/projects' },
    { key: 'people', label: 'Pessoas', icon: Users, color: 'green', link: '/people' },
    { key: 'equipment', label: 'Equipamentos', icon: Wrench, color: 'orange', link: '/equipment' },
    { key: 'problems', label: 'Problemas', icon: AlertTriangle, color: 'yellow', link: '/problems' },
    { key: 'actionPlans', label: 'Planos 5W2H', icon: ClipboardList, color: 'purple', link: '/action-plans' },
    { key: 'maintenance', label: 'Manutenções', icon: Settings, color: 'red', link: '/maintenance' },
    { key: 'nonConformities', label: 'Não Conformidades', icon: BarChart3, color: 'gray', link: '/quality' },
  ];

  return (
    <div>
      <PageHeader title="Pesquisa Global" subtitle="Encontre qualquer registro no sistema" />

      <div className="mb-6">
        <SearchInput value={query} onChange={handleSearch} placeholder="Pesquisar projetos, pessoas, equipamentos, problemas..." />
      </div>

      {!activeQuery ? (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Digite algo para pesquisar em todo o sistema</p>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Nenhum resultado encontrado para "{activeQuery}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{total} resultado(s) para "{activeQuery}"</p>

          {categories.map(cat => {
            const items = (results as any)[cat.key] as any[];
            if (items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-700">{cat.label}</h3>
                  <Badge color={cat.color}>{items.length}</Badge>
                  <Link to={cat.link} className="text-xs text-blue-600 hover:underline ml-auto">Ver todos →</Link>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 5).map((item: any) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name || item.title || item.what || 'Registro'}</p>
                          <p className="text-xs text-gray-500">{item.description || item.code || item.sector || ''}</p>
                        </div>
                        {item.status && <Badge color="gray">{item.status}</Badge>}
                      </div>
                    </Card>
                  ))}
                  {items.length > 5 && <p className="text-xs text-gray-500 text-center">+{items.length - 5} mais resultado(s)</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
