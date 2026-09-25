import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../store';
import { PageHeader, Card, StatusBadge, Badge } from '../components/ui';
import { ArrowLeft, FolderKanban, Wrench, AlertTriangle, ClipboardList, Users, Settings } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = db.getProjectById(id || '');
  const people = db.getPeople();

  if (!project) return <div className="text-center py-12 text-gray-500">Projeto não encontrado</div>;

  const problems = db.getProblems().filter(p => p.projectId === id);
  const actionPlans = db.getActionPlans().filter(a => a.projectId === id);
  const equipment = db.getEquipment();
  const maintenance = db.getMaintenanceRecords();
  const team = people.filter(p => project.teamIds.includes(p.id));
  const responsible = people.find(p => p.id === project.responsibleId);

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Voltar aos Projetos
      </Link>

      <PageHeader title={project.name} subtitle={`${project.code} — ${project.sector}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-3">Informações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Status:</span> <StatusBadge status={project.status} /></div>
            <div><span className="text-gray-500">Responsável:</span> <span className="font-medium">{responsible?.name || '—'}</span></div>
            <div><span className="text-gray-500">Início:</span> <span className="font-medium">{project.startDate || '—'}</span></div>
            <div><span className="text-gray-500">Prazo:</span> <span className="font-medium">{project.deadline || '—'}</span></div>
          </div>
          {project.description && <p className="mt-3 text-sm text-gray-600">{project.description}</p>}
          {project.notes && <p className="mt-2 text-sm text-gray-500 italic">{project.notes}</p>}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Equipe</h3>
          <div className="space-y-2">
            {team.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold">{p.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.position}</p>
                </div>
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-gray-500">Nenhum membro</p>}
          </div>
        </Card>
      </div>

      {/* Related items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-yellow-500" /><h4 className="font-medium text-gray-700">Problemas</h4></div>
          <p className="text-2xl font-bold text-gray-800">{problems.length}</p>
          <Link to={`/problems?project=${id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ver problemas →</Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><ClipboardList size={18} className="text-purple-500" /><h4 className="font-medium text-gray-700">Planos 5W2H</h4></div>
          <p className="text-2xl font-bold text-gray-800">{actionPlans.length}</p>
          <Link to={`/action-plans?project=${id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ver planos →</Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-blue-500" /><h4 className="font-medium text-gray-700">Equipe</h4></div>
          <p className="text-2xl font-bold text-gray-800">{team.length}</p>
          <Link to="/people" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ver pessoas →</Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Settings size={18} className="text-green-500" /><h4 className="font-medium text-gray-700">Manutenções</h4></div>
          <p className="text-2xl font-bold text-gray-800">{maintenance.filter(m => equipment.some(e => e.id === m.equipmentId)).length}</p>
          <Link to="/maintenance" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ver manutenções →</Link>
        </Card>
      </div>
    </div>
  );
}
