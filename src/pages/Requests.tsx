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
  ClipboardList,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Filter,
  Clock,
} from 'lucide-react';
import { MaintenanceRequest, RequestPriority, RequestStatus } from '../types';
import { Permissions } from '../lib/permissions';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};

const STATUS_ORDER: RequestStatus[] = ['pending', 'analyzing', 'approved', 'rejected', 'completed'];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Requests() {
  const { user } = useAuth();
  const isManager = Permissions.canViewAllRequests(user);

  const reload = () =>
    isManager ? db.getMaintenanceRequests() : db.getMaintenanceRequestsByUser(user?.id || '');

  const [items, setItems] = useState<MaintenanceRequest[]>(reload);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSector, setFilterSector] = useState('');

  // Modais
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<MaintenanceRequest | null>(null);
  const [manageItem, setManageItem] = useState<MaintenanceRequest | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [forwardConfirm, setForwardConfirm] = useState<MaintenanceRequest | null>(null);

  const equipment = db.getEquipment();
  const problems = db.getProblems();

  // ── Formulário de criação ──────────────────────────────────────────────────
  const emptyForm = {
    title: '',
    description: '',
    sector: '',
    location: '',
    equipmentId: '',
    priority: 'medium' as RequestPriority,
    notes: '',
    photoUrl: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ── Formulário de gestão (técnico/gestor) ─────────────────────────────────
  const [manageForm, setManageForm] = useState({
    status: 'analyzing' as RequestStatus,
    notes: '',
    rejectionReason: '',
  });

  // ── Filtragem ──────────────────────────────────────────────────────────────
  const sectors = [...new Set(items.map(i => i.sector).filter(Boolean))];

  const filtered = items.filter(r => {
    const matchSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.sector.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchPriority = !filterPriority || r.priority === filterPriority;
    const matchSector = !filterSector || r.sector === filterSector;
    return matchSearch && matchStatus && matchPriority && matchSector;
  });

  // ── Estatísticas ───────────────────────────────────────────────────────────
  const counts = {
    pending: items.filter(r => r.status === 'pending').length,
    analyzing: items.filter(r => r.status === 'analyzing').length,
    approved: items.filter(r => r.status === 'approved').length,
    rejected: items.filter(r => r.status === 'rejected').length,
    completed: items.filter(r => r.status === 'completed').length,
  };

  // ── Ações ──────────────────────────────────────────────────────────────────

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.sector.trim()) {
      showToast('error', 'Preencha título, descrição e setor/local.');
      return;
    }
    if (!user) return;

    const newReq = db.createMaintenanceRequest({
      title: form.title.trim(),
      description: form.description.trim(),
      sector: form.sector.trim(),
      location: form.location.trim(),
      equipmentId: form.equipmentId,
      requesterId: user.id,
      priority: form.priority,
      status: 'pending',
      notes: '',
      rejectionReason: '',
      linkedProblemId: '',
      photoUrl: form.photoUrl.trim(),
    });

    db.addHistory({
      userId: user.id,
      action: 'Solicitação criada',
      entity: 'maintenance_request',
      entityId: newReq.id,
      details: `Solicitação "${newReq.title}" aberta por ${user.name}`,
    });

    // Notificar técnicos e gestores
    const managers = db.getUsers().filter(u =>
      u.role === 'admin' || u.role === 'manager' || u.role === 'technician'
    );
    managers.forEach(m => {
      db.createNotification({
        userId: m.id,
        title: 'Nova Solicitação de Manutenção',
        message: `"${newReq.title}" — Setor: ${newReq.sector} | Prioridade: ${PRIORITY_LABELS[newReq.priority]}`,
        type: 'info',
        read: false,
        relatedEntity: 'maintenance_request',
        relatedId: newReq.id,
      });
    });

    setItems(reload());
    setCreateOpen(false);
    setForm(emptyForm);
    showToast('success', 'Solicitação enviada com sucesso!');
  };

  const openManage = (req: MaintenanceRequest) => {
    setManageItem(req);
    setManageForm({
      status: req.status === 'pending' ? 'analyzing' : req.status,
      notes: req.notes,
      rejectionReason: req.rejectionReason,
    });
  };

  const handleManageSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageItem || !user) return;

    if (manageForm.status === 'rejected' && !manageForm.rejectionReason.trim()) {
      showToast('error', 'Informe o motivo da rejeição.');
      return;
    }

    // Validação de transições incoerentes
    const oldStatus = manageItem.status;
    const newStatus = manageForm.status;
    const invalidTransition =
      (oldStatus === 'rejected' && newStatus === 'approved') ||
      (oldStatus === 'completed' && newStatus !== 'completed');

    if (invalidTransition) {
      showToast('error', 'Transição de status inválida. Revise o fluxo da solicitação.');
      return;
    }

    db.updateMaintenanceRequest(manageItem.id, {
      status: newStatus,
      notes: manageForm.notes.trim(),
      rejectionReason: newStatus === 'rejected' ? manageForm.rejectionReason.trim() : '',
    });

    db.addHistory({
      userId: user.id,
      action: `Status atualizado: ${newStatus}`,
      entity: 'maintenance_request',
      entityId: manageItem.id,
      details: `Solicitação "${manageItem.title}" → ${newStatus}`,
    });

    // Notificar solicitante
    db.createNotification({
      userId: manageItem.requesterId,
      title: 'Atualização na sua solicitação',
      message: `"${manageItem.title}" → ${newStatus === 'approved' ? 'Aprovada' : newStatus === 'rejected' ? `Rejeitada: ${manageForm.rejectionReason}` : newStatus === 'analyzing' ? 'Em análise' : 'Concluída'}`,
      type: newStatus === 'rejected' ? 'warning' : newStatus === 'approved' || newStatus === 'completed' ? 'success' : 'info',
      read: false,
      relatedEntity: 'maintenance_request',
      relatedId: manageItem.id,
    });

    setItems(reload());
    setManageItem(null);
    showToast('success', 'Solicitação atualizada.');
  };

  const handleForwardToProblem = (req: MaintenanceRequest) => {
    if (!user) return;

    // Evitar problema duplicado
    const existing = problems.find(p => p.notes?.includes(`[sol:${req.id}]`));
    if (existing) {
      showToast('warning', 'Esta solicitação já foi encaminhada. Veja Problemas.');
      return;
    }

    const newProblem = db.createProblem({
      title: req.title,
      description: req.description,
      category: 'maintenance',
      projectId: '',
      equipmentId: req.equipmentId,
      sector: req.sector,
      responsibleId: user.id,
      identificationDate: new Date().toISOString().split('T')[0],
      status: 'identified',
      notes: `Encaminhado da solicitação #${req.id.slice(-6).toUpperCase()}. ${req.notes} [sol:${req.id}]`,
    });

    // Vincular solicitação ao problema
    db.updateMaintenanceRequest(req.id, { linkedProblemId: newProblem.id });

    db.addHistory({
      userId: user.id,
      action: 'Solicitação encaminhada para Problemas',
      entity: 'maintenance_request',
      entityId: req.id,
      details: `Problema "${newProblem.title}" criado (ID: ${newProblem.id})`,
    });

    db.createNotification({
      userId: req.requesterId,
      title: 'Solicitação encaminhada',
      message: `"${req.title}" foi encaminhada para tratamento técnico no módulo de Problemas.`,
      type: 'success',
      read: false,
      relatedEntity: 'problem',
      relatedId: newProblem.id,
    });

    setItems(reload());
    setForwardConfirm(null);
    setViewItem(null);
    showToast('success', 'Problema criado e solicitação vinculada.');
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    const req = db.getMaintenanceRequestById(id);
    if (!req) return;
    db.deleteMaintenanceRequest(id);
    db.addHistory({
      userId: user.id,
      action: 'Solicitação excluída',
      entity: 'maintenance_request',
      entityId: id,
      details: `Solicitação "${req.title}" excluída por ${user.name}`,
    });
    setItems(reload());
    showToast('success', 'Solicitação excluída.');
  };

  const handleCancelOwn = (req: MaintenanceRequest) => {
    if (!user) return;
    db.updateMaintenanceRequest(req.id, { status: 'rejected', rejectionReason: 'Cancelada pelo solicitante' });
    db.addHistory({
      userId: user.id,
      action: 'Solicitação cancelada',
      entity: 'maintenance_request',
      entityId: req.id,
      details: `Solicitação "${req.title}" cancelada pelo próprio solicitante`,
    });
    setItems(reload());
    setViewItem(null);
    showToast('info', 'Solicitação cancelada.');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const userNames: Record<string, string> = {};
  db.getUsers().forEach(u => { userNames[u.id] = u.name; });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de Manutenção"
        subtitle={isManager ? 'Gerencie e acompanhe todas as solicitações recebidas' : 'Abra e acompanhe suas solicitações de manutenção'}
        actions={
          Permissions.canCreateRequest(user) ? (
            <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus size={16} className="mr-1" /> Nova Solicitação
            </Button>
          ) : null
        }
      />

      {/* Estatísticas (apenas para gestores) */}
      {isManager && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Pendentes', count: counts.pending, color: 'bg-gray-100 text-gray-700' },
            { label: 'Em Análise', count: counts.analyzing, color: 'bg-blue-100 text-blue-700' },
            { label: 'Aprovadas', count: counts.approved, color: 'bg-green-100 text-green-700' },
            { label: 'Rejeitadas', count: counts.rejected, color: 'bg-red-100 text-red-700' },
            { label: 'Concluídas', count: counts.completed, color: 'bg-purple-100 text-purple-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título, descrição ou setor..." />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="analyzing">Em Análise</option>
            <option value="approved">Aprovada</option>
            <option value="rejected">Rejeitada</option>
            <option value="completed">Concluída</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todas as prioridades</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          {isManager && sectors.length > 0 && (
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Todos os setores</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} />}
          title="Nenhuma solicitação encontrada"
          description={isManager ? 'Ainda não há solicitações registradas ou os filtros estão muito restritivos.' : 'Você ainda não abriu nenhuma solicitação. Clique em "Nova Solicitação" para começar.'}
          action={
            Permissions.canCreateRequest(user) ? (
              <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
                <Plus size={16} className="mr-1" /> Nova Solicitação
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const eq = req.equipmentId ? equipment.find(e => e.id === req.equipmentId) : null;
            const linkedProblem = req.linkedProblemId ? problems.find(p => p.id === req.linkedProblemId) : null;
            const canCancel = Permissions.canCancelOwnRequest(user, req.requesterId, req.status);
            const canManage = Permissions.canManageRequest(user);
            const canDelete = Permissions.canDeleteRequest(user);

            return (
              <Card key={req.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm">{req.title}</h3>
                      <StatusBadge status={req.status} />
                      <Badge color={PRIORITY_COLORS[req.priority]}>{PRIORITY_LABELS[req.priority]}</Badge>
                      {linkedProblem && (
                        <Badge color="purple">Encaminhada</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{req.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Filter size={11} /> {req.sector}{req.location ? ` — ${req.location}` : ''}
                      </span>
                      {eq && <span className="flex items-center gap-1"><AlertTriangle size={11} /> {eq.name}</span>}
                      {isManager && (
                        <span className="flex items-center gap-1">
                          Solicitante: <strong>{userNames[req.requesterId] || req.requesterId}</strong>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {req.rejectionReason && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        <strong>Motivo:</strong> {req.rejectionReason}
                      </p>
                    )}
                    {req.notes && req.status !== 'pending' && (
                      <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <strong>Observação:</strong> {req.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewItem(req)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      title="Ver detalhes"
                    >
                      <Eye size={15} />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => openManage(req)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        title="Gerenciar"
                        disabled={req.status === 'completed'}
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                    {canManage && req.status === 'approved' && !req.linkedProblemId && (
                      <button
                        onClick={() => setForwardConfirm(req)}
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600"
                        title="Encaminhar para Problemas"
                      >
                        <ArrowRight size={15} />
                      </button>
                    )}
                    {!canManage && canCancel && (
                      <button
                        onClick={() => handleCancelOwn(req)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        title="Cancelar minha solicitação"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirm(req.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal: Nova Solicitação ─────────────────────────────────────────── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nova Solicitação de Manutenção" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Título *"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Descreva o problema brevemente"
            required
          />
          <Textarea
            label="Descrição *"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Detalhe o problema, sintomas observados, quando começou..."
            rows={4}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Setor / Local *"
              value={form.sector}
              onChange={e => setForm({ ...form, sector: e.target.value })}
              placeholder="Ex: Usinagem, Galpão A"
              required
            />
            <Input
              label="Localização específica"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Ex: Linha 3, Bancada 5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Equipamento relacionado"
              value={form.equipmentId}
              onChange={e => setForm({ ...form, equipmentId: e.target.value })}
            >
              <option value="">Nenhum / Não sei</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>
              ))}
            </Select>
            <Select
              label="Prioridade"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value as RequestPriority })}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </Select>
          </div>
          <Input
            label="URL da foto (opcional)"
            value={form.photoUrl}
            onChange={e => setForm({ ...form, photoUrl: e.target.value })}
            placeholder="https://..."
            type="url"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit">Enviar Solicitação</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Visualizar detalhes ──────────────────────────────────────── */}
      {viewItem && (
        <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Detalhes da Solicitação" size="md">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={viewItem.status} />
              <Badge color={PRIORITY_COLORS[viewItem.priority]}>{PRIORITY_LABELS[viewItem.priority]}</Badge>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{viewItem.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{viewItem.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Setor</span>
                <p className="text-gray-700">{viewItem.sector}</p>
              </div>
              {viewItem.location && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Localização</span>
                  <p className="text-gray-700">{viewItem.location}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Abertura</span>
                <p className="text-gray-700">{new Date(viewItem.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Última atualização</span>
                <p className="text-gray-700">{new Date(viewItem.updatedAt).toLocaleString('pt-BR')}</p>
              </div>
              {isManager && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Solicitante</span>
                  <p className="text-gray-700">{userNames[viewItem.requesterId] || viewItem.requesterId}</p>
                </div>
              )}
              {viewItem.equipmentId && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">Equipamento</span>
                  <p className="text-gray-700">{equipment.find(e => e.id === viewItem.equipmentId)?.name || viewItem.equipmentId}</p>
                </div>
              )}
            </div>

            {viewItem.notes && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">Observações do responsável</p>
                <p className="text-sm text-blue-800">{viewItem.notes}</p>
              </div>
            )}

            {viewItem.rejectionReason && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">Motivo da rejeição</p>
                <p className="text-sm text-red-800">{viewItem.rejectionReason}</p>
              </div>
            )}

            {viewItem.photoUrl && (
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">Foto</span>
                <a href={viewItem.photoUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">
                  Ver foto anexada
                </a>
              </div>
            )}

            {viewItem.linkedProblemId && (
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-600 mb-1">Encaminhada para Problemas</p>
                <p className="text-sm text-purple-800">
                  Problema: {problems.find(p => p.id === viewItem.linkedProblemId)?.title || viewItem.linkedProblemId}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                {Permissions.canManageRequest(user) && viewItem.status === 'approved' && !viewItem.linkedProblemId && (
                  <Button variant="secondary" size="sm" onClick={() => { setForwardConfirm(viewItem); setViewItem(null); }}>
                    <ArrowRight size={14} className="mr-1" /> Encaminhar para Problemas
                  </Button>
                )}
                {Permissions.canCancelOwnRequest(user, viewItem.requesterId, viewItem.status) && !Permissions.canManageRequest(user) && (
                  <Button variant="danger" size="sm" onClick={() => handleCancelOwn(viewItem)}>
                    Cancelar Solicitação
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setViewItem(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Gerenciar (técnico/gestor) ──────────────────────────────── */}
      {manageItem && (
        <Modal isOpen={!!manageItem} onClose={() => setManageItem(null)} title="Gerenciar Solicitação" size="md">
          <form onSubmit={handleManageSave} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800 text-sm">{manageItem.title}</p>
              <p className="text-xs text-gray-500 mt-1">{manageItem.description}</p>
              <div className="flex gap-2 mt-2">
                <StatusBadge status={manageItem.status} />
                <Badge color={PRIORITY_COLORS[manageItem.priority]}>{PRIORITY_LABELS[manageItem.priority]}</Badge>
              </div>
            </div>

            <Select
              label="Novo status"
              value={manageForm.status}
              onChange={e => setManageForm({ ...manageForm, status: e.target.value as RequestStatus })}
            >
              {manageItem.status === 'pending' && <option value="analyzing">Em Análise</option>}
              {(manageItem.status === 'pending' || manageItem.status === 'analyzing') && (
                <>
                  <option value="approved">Aprovada</option>
                  <option value="rejected">Rejeitada</option>
                </>
              )}
              {manageItem.status === 'approved' && (
                <>
                  <option value="approved">Aprovada (manter)</option>
                  <option value="completed">Concluída</option>
                </>
              )}
              {manageItem.status === 'analyzing' && <option value="analyzing">Em Análise (manter)</option>}
              {manageItem.status === 'completed' && <option value="completed">Concluída</option>}
              {manageItem.status === 'rejected' && <option value="rejected">Rejeitada</option>}
            </Select>

            {manageForm.status === 'rejected' && (
              <Textarea
                label="Motivo da rejeição *"
                value={manageForm.rejectionReason}
                onChange={e => setManageForm({ ...manageForm, rejectionReason: e.target.value })}
                placeholder="Explique por que a solicitação não será encaminhada..."
                rows={3}
              />
            )}

            <Textarea
              label="Observações (visível ao solicitante)"
              value={manageForm.notes}
              onChange={e => setManageForm({ ...manageForm, notes: e.target.value })}
              placeholder="Informações adicionais, encaminhamentos realizados, prazo estimado..."
              rows={3}
            />

            {manageForm.status === 'approved' && !manageItem.linkedProblemId && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                <strong>💡 Dica:</strong> Após aprovar, você poderá encaminhar esta solicitação diretamente para o módulo de Problemas, preservando todas as informações.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setManageItem(null)}>Cancelar</Button>
              <Button type="submit">Salvar Atualização</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirmar encaminhar para Problemas ────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!forwardConfirm}
        onClose={() => setForwardConfirm(null)}
        onConfirm={() => forwardConfirm && handleForwardToProblem(forwardConfirm)}
        title="Encaminhar para Problemas"
        message={`Será criado um novo Problema no módulo de Problemas com as informações de "${forwardConfirm?.title}". Você poderá então realizar a análise GUT e criar um plano 5W2H. Deseja continuar?`}
      />

      {/* ── Confirmar exclusão ─────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Excluir Solicitação"
        message="Esta ação é irreversível. A solicitação será permanentemente excluída."
      />
    </div>
  );
}
