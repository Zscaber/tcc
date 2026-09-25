import React, { useState } from 'react';
import { db } from '../store';
import { PageHeader, Button, Card, Select } from '../components/ui';
import { FileText, Download } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('projects');

  const generateCSV = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    switch (reportType) {
      case 'projects': {
        const projects = db.getProjects();
        const people = db.getPeople();
        generateCSV(
          ['Nome', 'Código', 'Setor', 'Responsável', 'Status', 'Início', 'Prazo'],
          projects.map(p => [p.name, p.code, p.sector, people.find(pe => pe.id === p.responsibleId)?.name || '', p.status, p.startDate, p.deadline]),
          'projetos.csv'
        );
        break;
      }
      case 'equipment': {
        const equipment = db.getEquipment();
        generateCSV(
          ['Nome', 'Código', 'Tipo', 'Fabricante', 'Modelo', 'Setor', 'Status', 'Próx. Manutenção'],
          equipment.map(e => [e.name, e.code, e.type, e.manufacturer, e.model, e.sector, e.status, e.nextMaintenance]),
          'equipamentos.csv'
        );
        break;
      }
      case 'problems': {
        const problems = db.getProblems();
        generateCSV(
          ['Título', 'Categoria', 'Status', 'Setor', 'Data Identificação'],
          problems.map(p => [p.title, p.category, p.status, p.sector, p.identificationDate]),
          'problemas.csv'
        );
        break;
      }
      case 'gut': {
        const guts = db.getGutAnalyses();
        const problems = db.getProblems();
        generateCSV(
          ['Problema', 'Gravidade', 'Urgência', 'Tendência', 'Pontuação', 'Classificação'],
          guts.map(g => [problems.find(p => p.id === g.problemId)?.title || '', String(g.gravity), String(g.urgency), String(g.tendency), String(g.score), g.classification]),
          'matriz_gut.csv'
        );
        break;
      }
      case 'actionplans': {
        const plans = db.getActionPlans();
        generateCSV(
          ['What', 'Why', 'Where', 'When', 'How Much', 'Status'],
          plans.map(a => [a.what, a.why, a.where, a.when, a.howMuch, a.status]),
          'planos_5w2h.csv'
        );
        break;
      }
      case 'maintenance': {
        const records = db.getMaintenanceRecords();
        const equipment = db.getEquipment();
        generateCSV(
          ['Equipamento', 'Tipo', 'Descrição', 'Data', 'Prazo', 'Status', 'Custo'],
          records.map(m => [equipment.find(e => e.id === m.equipmentId)?.name || '', m.type, m.description, m.date, m.deadline, m.status, String(m.cost)]),
          'manutencoes.csv'
        );
        break;
      }
      case 'quality': {
        const ncs = db.getNonConformities();
        generateCSV(
          ['Título', 'Descrição', 'Causa', 'Status', 'Data'],
          ncs.map(n => [n.title, n.description, n.cause, n.status, n.identificationDate]),
          'qualidade.csv'
        );
        break;
      }
    }
  };

  const reportTypes = [
    { id: 'projects', label: 'Projetos' },
    { id: 'equipment', label: 'Equipamentos' },
    { id: 'problems', label: 'Problemas' },
    { id: 'gut', label: 'Matriz GUT' },
    { id: 'actionplans', label: 'Planos 5W2H' },
    { id: 'maintenance', label: 'Manutenção' },
    { id: 'quality', label: 'Qualidade' },
  ];

  // Preview data
  const getPreview = () => {
    switch (reportType) {
      case 'projects': return db.getProjects().length;
      case 'equipment': return db.getEquipment().length;
      case 'problems': return db.getProblems().length;
      case 'gut': return db.getGutAnalyses().length;
      case 'actionplans': return db.getActionPlans().length;
      case 'maintenance': return db.getMaintenanceRecords().length;
      case 'quality': return db.getNonConformities().length;
      default: return 0;
    }
  };

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportação de dados do sistema" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Gerar Relatório</h3>
          <div className="space-y-4">
            <Select label="Tipo de Relatório" value={reportType} onChange={e => setReportType(e.target.value)}>
              {reportTypes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
            <p className="text-sm text-gray-500">{getPreview()} registro(s) encontrado(s)</p>
            <Button onClick={handleExport} className="w-full"><Download size={16} className="inline mr-2" /> Exportar CSV</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Formatos Disponíveis</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <FileText size={20} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">CSV</p>
                <p className="text-xs text-green-600">Compatível com Excel e planilhas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
              <FileText size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">PDF</p>
                <p className="text-xs text-gray-500">Disponível em versão futura</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
              <FileText size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Excel (XLSX)</p>
                <p className="text-xs text-gray-500">Disponível em versão futura</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
