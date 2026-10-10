import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { PageHeader, Button, Card, Select, Input, Badge } from '../components/ui';
import { FileText, Download, Printer, Filter, Calendar, CheckCircle2, Eye } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('maintenance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const reportTypes = [
    { id: 'maintenance', label: 'Ordens de Manutenção' },
    { id: 'equipment', label: 'Parque de Equipamentos' },
    { id: 'problems', label: 'Problemas & Ocorrências' },
    { id: 'gut', label: 'Matriz GUT (Priorização)' },
    { id: 'actionplans', label: 'Planos de Ação 5W2H' },
    { id: 'quality', label: 'Qualidade & Não Conformidades' },
    { id: 'projects', label: 'Projetos Industriais' },
    { id: 'history', label: 'Histórico de Auditoria' },
  ];

  // Helper to filter dates
  const isWithinDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.split('T')[0];
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // Compile datasets with filters
  const reportData = useMemo(() => {
    const people = db.getPeople();
    const equipmentList = db.getEquipment();
    const problemList = db.getProblems();

    switch (reportType) {
      case 'maintenance': {
        let records = db.getMaintenanceRecords();
        if (statusFilter) records = records.filter(r => r.status === statusFilter);
        records = records.filter(r => isWithinDateRange(r.date || r.deadline));

        const headers = ['Equipamento', 'Código Eq.', 'Tipo', 'Descrição', 'Data', 'Prazo', 'Status', 'Custo (R$)', 'Problema Vinculado', 'Plano 5W2H'];
        const rows = records.map(m => {
          const eq = equipmentList.find(e => e.id === m.equipmentId);
          const pr = problemList.find(p => p.id === m.problemId);
          return [
            eq?.name || 'N/A',
            eq?.code || 'N/A',
            m.type,
            m.description,
            m.date || '',
            m.deadline || '',
            m.status,
            String(m.cost || 0),
            pr?.title || 'Direto',
            m.actionPlanId ? 'Vinculado' : 'Não',
          ];
        });
        return { headers, rows, count: records.length };
      }

      case 'equipment': {
        let list = db.getEquipment();
        if (statusFilter) list = list.filter(e => e.status === statusFilter);
        list = list.filter(e => isWithinDateRange(e.nextMaintenance || e.createdAt));

        const headers = ['Nome', 'Código', 'Tipo', 'Setor', 'Criticidade', 'Fabricante', 'Modelo', 'Status', 'Próx. Manutenção'];
        const rows = list.map(e => [
          e.name,
          e.code,
          e.type,
          e.sector,
          e.criticality ? e.criticality.toUpperCase() : 'MÉDIA',
          e.manufacturer || '',
          e.model || '',
          e.status,
          e.nextMaintenance || '',
        ]);
        return { headers, rows, count: list.length };
      }

      case 'problems': {
        let probs = db.getProblems();
        if (statusFilter) probs = probs.filter(p => p.status === statusFilter);
        probs = probs.filter(p => isWithinDateRange(p.identificationDate || p.createdAt));

        const headers = ['Título', 'Categoria', 'Setor', 'Status', 'Data Identificação', 'Equipamento', 'Criado Em'];
        const rows = probs.map(p => {
          const eq = equipmentList.find(e => e.id === p.equipmentId);
          return [
            p.title,
            p.category,
            p.sector,
            p.status,
            p.identificationDate || '',
            eq?.name || 'Geral',
            p.createdAt ? p.createdAt.split('T')[0] : '',
          ];
        });
        return { headers, rows, count: probs.length };
      }

      case 'gut': {
        const guts = db.getGutAnalyses();
        const headers = ['Problema', 'Gravidade (G)', 'Urgência (U)', 'Tendência (T)', 'Pontuação (G×U×T)', 'Classificação'];
        const rows = guts.map(g => {
          const pr = problemList.find(p => p.id === g.problemId);
          return [
            pr?.title || 'Problema',
            String(g.gravity),
            String(g.urgency),
            String(g.tendency),
            String(g.score),
            g.classification,
          ];
        });
        return { headers, rows, count: guts.length };
      }

      case 'actionplans': {
        let plans = db.getActionPlans();
        if (statusFilter) plans = plans.filter(p => p.status === statusFilter);
        plans = plans.filter(p => isWithinDateRange(p.when || p.createdAt));

        const headers = ['What (O que)', 'Why (Por que)', 'Where (Onde)', 'When (Quando)', 'Who (Quem)', 'How (Como)', 'How Much (Quanto)', 'Status'];
        const rows: string[][] = plans.map(a => {
          const whoNames = (a.who || []).map(wId => people.find(pe => pe.id === wId)?.name || wId).join(', ');
          return [
            a.what,
            a.why,
            a.where,
            a.when,
            whoNames,
            a.how,
            a.howMuch,
            a.status,
          ];
        });
        return { headers, rows, count: plans.length };
      }

      case 'quality': {
        let ncs = db.getNonConformities();
        if (statusFilter) ncs = ncs.filter(n => n.status === statusFilter);
        ncs = ncs.filter(n => isWithinDateRange(n.identificationDate || n.createdAt));

        const headers = ['Título', 'Setor', 'Severidade', 'Causa Raiz', 'Status', 'Data Identificação', 'Evidência'];
        const rows = ncs.map(n => [
          n.title,
          n.sector || 'Geral',
          n.severity ? n.severity.toUpperCase() : 'MÉDIA',
          n.cause,
          n.status,
          n.identificationDate || '',
          n.evidence || '',
        ]);
        return { headers, rows, count: ncs.length };
      }

      case 'projects': {
        let projs = db.getProjects();
        if (statusFilter) projs = projs.filter(p => p.status === statusFilter);
        projs = projs.filter(p => isWithinDateRange(p.startDate || p.deadline));

        const headers = ['Nome', 'Código', 'Setor', 'Responsável', 'Status', 'Início', 'Prazo Final'];
        const rows = projs.map(p => [
          p.name,
          p.code,
          p.sector,
          people.find(pe => pe.id === p.responsibleId)?.name || '',
          p.status,
          p.startDate,
          p.deadline,
        ]);
        return { headers, rows, count: projs.length };
      }

      case 'history': {
        let hist = db.getHistory();
        hist = hist.filter(h => isWithinDateRange(h.createdAt));

        const headers = ['Data/Hora', 'Ação', 'Módulo/Entidade', 'ID Registro', 'Detalhes'];
        const rows = hist.map(h => [
          new Date(h.createdAt).toLocaleString('pt-BR'),
          h.action,
          h.entity,
          h.entityId,
          h.details,
        ]);
        return { headers, rows, count: hist.length };
      }

      default:
        return { headers: [], rows: [], count: 0 };
    }
  }, [reportType, startDate, endDate, statusFilter]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const { headers, rows } = reportData;
    const sanitizedRows = rows.map(r =>
      r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')
    );
    const csvContent = [headers.map(h => `"${h}"`).join(';'), ...sanitizedRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print / PDF Handler
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios & Exportação"
        subtitle="Extração e documentação executiva dos dados operacionais e de manutenção"
      />

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Parameters Selection */}
        <Card className="p-5 lg:col-span-2 space-y-4 shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
            <Filter size={16} className="text-blue-600" /> Parâmetros do Relatório
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Tipo de Relatório"
                value={reportType}
                onChange={e => {
                  setReportType(e.target.value);
                  setStatusFilter('');
                }}
              >
                {reportTypes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Filtrar por Período</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-xs"
                />
                <span className="text-xs text-gray-400">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Badge color="blue">
                {reportData.count} registro(s) no escopo
              </Badge>
              {(startDate || endDate || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setStatusFilter('');
                  }}
                  className="text-xs text-gray-500"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handlePrintPDF}>
                <Printer size={16} className="inline mr-1.5" /> Imprimir / PDF
              </Button>
              <Button onClick={handleExportCSV}>
                <Download size={16} className="inline mr-1.5" /> Exportar CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Format & Info Card */}
        <Card className="p-5 space-y-4 shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">
            Formatos & Auditoria
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <FileText size={22} className="text-green-600" />
              <div>
                <p className="text-xs font-bold text-green-900">Formato CSV / Excel</p>
                <p className="text-[11px] text-green-700">Com separador ponto e vírgula e codificação UTF-8 com BOM.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <Printer size={22} className="text-blue-600" />
              <div>
                <p className="text-xs font-bold text-blue-900">Impressão & PDF</p>
                <p className="text-[11px] text-blue-700">Layout profissional formatado para impressão ou salvar em PDF.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Data Table Preview */}
      <Card className="p-5 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">
              Pré-visualização do Relatório: {reportTypes.find(r => r.id === reportType)?.label}
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            Exibindo até 20 linhas de prévia
          </span>
        </div>

        {reportData.count === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-xs">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  {reportData.headers.map((h, i) => (
                    <th key={i} className="p-2.5 border-b border-slate-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportData.rows.slice(0, 20).map((row, rIndex) => (
                  <tr key={rIndex} className="hover:bg-slate-50 transition-colors">
                    {row.map((cell, cIndex) => (
                      <td key={cIndex} className="p-2.5 text-gray-700 max-w-xs truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData.count > 20 && (
          <p className="text-center text-xs text-gray-500 mt-3">
            + {reportData.count - 20} registro(s) adicionais serão incluídos na exportação completa.
          </p>
        )}
      </Card>
    </div>
  );
}
