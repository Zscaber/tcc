import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import {
  PageHeader,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  StatusBadge,
  SearchInput,
  EmptyState,
  Card,
  showToast,
  ConfirmDialog,
  Badge,
} from '../components/ui';
import {
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  BarChart3,
  ClipboardList,
  Settings,
  Wrench,
  Info,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Problem, ProblemCategory, ProblemStatus } from '../types';
import { Permissions } from '../lib/permissions';

export default function Problems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project') || '';
  const [items, setItems] = useState(db.getProblems());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Problem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const people = db.getPeople();
  const projects = db.getProjects();
  const equipment = db.getEquipment();
  const gutAnalyses = db.getGutAnalyses();
  const actionPlans = db.getActionPlans();
  const maintenanceRecords = db.getMaintenanceRecords();

  const emptyForm = {
    title: '',
    description: '',
    category: 'maintenance' as ProblemCategory,
    projectId: projectFilter,
    equipmentId: '',
    sector: '',
    responsibleId: user?.role === 'employee' || user?.role === 'student' ? user.id : '',
    identificationDate: new Date().toISOString().split('T')[0],
    status: 'identified' as ProblemStatus,
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(p => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Problem) => {
    if (!Permissions.canEditProblem(user, p)) {
      showToast('error', 'Você não tem permissão para editar este problema.');
      return;
    }
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description,
      category: p.category,
      projectId: p.projectId,
      equipmentId: p.equipmentId,
      sector: p.sector,
      responsibleId: p.responsibleId,
      identificationDate: p.identificationDate,
      status: p.status,
      notes: p.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      showToast('error', 'Título é obrigatório');
      return;
    }

    if (editing) {
      if (!Permissions.canEditProblem(user, editing)) {
        showToast('error', 'Operação não permitida para o seu perfil');
        return;
      }
      db.updateProblem(editing.id, form);
      db.addHistory({
        userId: user!.id,
        action: 'Problema atualizado',
        entity: 'problem',
        entityId: editing.id,
        details: form.title,
      });
      showToast('success', 'Problema atualizado');
    } else {
      const newProblem = db.createProblem(form);
      db.addHistory({
        userId: user!.id,
        action: 'Problema registrado',
        entity: 'problem',
        entityId: newProblem.id,
        details: form.title,
      });
      showToast('success', 'Problema registrado');
    }
    setItems(db.getProblems());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!Permissions.canDeleteProblem(user)) {
      showToast('error', 'Apenas administradores podem excluir problemas');
      return;
    }
    const p = db.getProblemById(id);
    db.deleteProblem(id);
    db.addHistory({
      userId: user!.id,
      action: 'Problema excluído',
      entity: 'problem',
      entityId: id,
      details: p?.title || '',
    });
    setItems(db.getProblems());
    showToast('success', 'Problema excluído');
  };

  const categoryLabels: Record<string, string> = {
    maintenance: 'Manutenção',
    production: 'Produção',
    quality: 'Qualidade',
    safety: 'Segurança',
    other: 'Outro',
  };

  const isTechnicalUser = Permissions.canChangeProblemTechnicalStatus(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problemas e Ocorrências"
        subtitle="Registro e acompanhamento integrado à Matriz GUT, Planos 5W2H e Manutenções"
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} className="inline mr-1" /> Novo Problema
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar problemas..." />
        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-40 text-xs"
        >
          <option value="">Todos status</option>
          <option value="identified">Identificado</option>
          <option value="analyzing">Em Análise</option>
          <option value="treating">Em Tratamento</option>
          <option value="resolved">Resolvido</option>
          <option value="cancelled">Cancelado</option>
        </Select>
        <Select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="w-40 text-xs"
        >
          <option value="">Todas categorias</option>
          <option value="maintenance">Manutenção</option>
          <option value="production">Produção</option>
          <option value="quality">Qualidade</option>
          <option value="safety">Segurança</option>
          <option value="other">Outro</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title="Nenhum problema registrado"
          description="Registre o primeiro problema para começar o acompanhamento e análise."
          action={<Button onClick={openCreate}>Registrar Problema</Button>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const gut = gutAnalyses.find(g => g.problemId === p.id);
            const ap = actionPlans.find(a => a.problemId === p.id);
            const maint = maintenanceRecords.find(m => m.problemId === p.id);
            const eq = equipment.find(e => e.id === p.equipmentId);
            const proj = projects.find(pr => pr.id === p.projectId);

            const canEditThis = Permissions.canEditProblem(user, p);
            const canDeleteThis = Permissions.canDeleteProblem(user);

            return (
              <Card
                key={p.id}
                className="p-5 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Info Column */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-base">{p.title}</h3>
                      <StatusBadge status={p.status} />
                      <Badge color="blue">{categoryLabels[p.category] || p.category}</Badge>
                      {gut && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            gut.score >= 60
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          GUT Score: {gut.score} ({gut.classification})
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                      {eq && (
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <Wrench size={13} className="text-blue-600" /> Equipamento: {eq.name} (
                          {eq.code})
                        </span>
                      )}
                      {proj && <span>Projeto: {proj.name}</span>}
                      {p.sector && <span>Setor: {p.sector}</span>}
                      <span>
                        Responsável: {people.find(pe => pe.id === p.responsibleId)?.name || '—'}
                      </span>
                      <span>Identificado em: {p.identificationDate}</span>
                    </div>

                    {/* Integrated Records Bar */}
                    <div className="pt-3 flex flex-wrap gap-2 border-t border-gray-100 mt-2">
                      {/* GUT Status & Button */}
                      {gut ? (
                        <button
                          onClick={() => navigate(`/gut`)}
                          className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors flex items-center gap-1"
                        >
                          <BarChart3 size={13} /> GUT: {gut.score} ({gut.classification}) — Ver
                          Análise
                        </button>
                      ) : Permissions.canManageGut(user) ? (
                        <button
                          onClick={() => navigate(`/gut?problem=${p.id}`)}
                          className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <BarChart3 size={13} /> + Criar Análise GUT
                        </button>
                      ) : null}

                      {/* 5W2H Status & Button */}
                      {ap ? (
                        <button
                          onClick={() => navigate(`/action-plans`)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <ClipboardList size={13} /> Plano 5W2H: {ap.what} — Ver Plano
                        </button>
                      ) : Permissions.canCreate5W2H(user) ? (
                        <button
                          onClick={() => navigate(`/action-plans?problem=${p.id}`)}
                          className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <ClipboardList size={13} /> + Criar Plano 5W2H
                        </button>
                      ) : null}

                      {/* Maintenance Status & Button */}
                      {maint ? (
                        <button
                          onClick={() => navigate(`/maintenance`)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1"
                        >
                          <Settings size={13} /> Manutenção: {maint.description} — Ver Manutenção
                        </button>
                      ) : Permissions.canCreateMaintenance(user) ? (
                        <button
                          onClick={() => navigate(`/maintenance`)}
                          className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <Settings size={13} /> + Agendar Manutenção
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                    {canEditThis && (
                      <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                        <Edit2 size={14} className="inline mr-1" /> Editar
                      </Button>
                    )}
                    {canDeleteThis && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(p.id)}>
                        <Trash2 size={14} className="text-red-500 inline mr-1" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Problema' : 'Novo Problema / Solicitação'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Título *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Vazamento de óleo, Desalinhamento, Ruído excessivo..."
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Descrição detalhada"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Descreva o que ocorreu, sintomas e impactos observados..."
            />
          </div>

          <Select
            label="Categoria"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as ProblemCategory })}
          >
            <option value="maintenance">Manutenção</option>
            <option value="production">Produção</option>
            <option value="quality">Qualidade</option>
            <option value="safety">Segurança</option>
            <option value="other">Outro</option>
          </Select>

          {/* Status - only technical users can change to analyzing/treating/resolved */}
          {isTechnicalUser ? (
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as ProblemStatus })}
            >
              <option value="identified">Identificado (Aguardando análise)</option>
              <option value="analyzing">Em Análise Técnica</option>
              <option value="treating">Em Tratamento / 5W2H</option>
              <option value="resolved">Resolvido / Concluído</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <StatusBadge status={form.status} />
                <span className="text-[11px] text-gray-500 font-normal">
                  (Apenas Gestores/Técnicos podem alterar o status de atendimento)
                </span>
              </div>
            </div>
          )}

          <Select
            label="Projeto"
            value={form.projectId}
            onChange={e => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Nenhum</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            label="Equipamento"
            value={form.equipmentId}
            onChange={e => setForm({ ...form, equipmentId: e.target.value })}
          >
            <option value="">Nenhum</option>
            {equipment.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.code})
              </option>
            ))}
          </Select>

          <Input
            label="Setor"
            value={form.sector}
            onChange={e => setForm({ ...form, sector: e.target.value })}
            placeholder="Ex: Usinagem, Estamparia, Linha A..."
          />

          <Select
            label="Responsável pelo registro"
            value={form.responsibleId}
            onChange={e => setForm({ ...form, responsibleId: e.target.value })}
            disabled={!isTechnicalUser && form.responsibleId === user?.id}
          >
            <option value="">Selecione...</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position || 'Colaborador'})
              </option>
            ))}
          </Select>

          <Input
            label="Data de Identificação"
            type="date"
            value={form.identificationDate}
            onChange={e => setForm({ ...form, identificationDate: e.target.value })}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Observações Adicionais"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Excluir Problema"
        message="Tem certeza? A análise GUT e referências associadas serão limpas."
      />
    </div>
  );
}
