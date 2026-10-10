import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Textarea, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, MapPin, Edit2, Trash2, Eye, Ruler, FileImage } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaMap } from '../types';
import { Permissions } from '../lib/permissions';

export default function AreaMaps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [areas, setAreas] = useState(db.getAreaMaps());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AreaMap | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', width: 20, length: 15 });

  const canManage = Permissions.canManageAreaMaps(user);
  const canDelete = Permissions.canDeleteAreaMaps(user);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', width: 20, length: 15 }); setModalOpen(true); };
  const openEdit = (a: AreaMap) => { setEditing(a); setForm({ name: a.name, description: a.description, width: a.width, length: a.length }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name) { showToast('error', 'Nome é obrigatório'); return; }
    if (form.width <= 0 || form.length <= 0) { showToast('error', 'Dimensões devem ser maiores que zero'); return; }
    if (editing) {
      db.updateAreaMap(editing.id, { name: form.name, description: form.description, width: form.width, length: form.length });
      db.addHistory({ userId: user!.id, action: 'Área atualizada', entity: 'areaMap', entityId: editing.id, details: form.name });
      showToast('success', 'Área atualizada');
    } else {
      const newArea = db.createAreaMap({ name: form.name, description: form.description, width: form.width, length: form.length, objects: [], generalPhotos: [] });
      db.addHistory({ userId: user!.id, action: 'Área criada', entity: 'areaMap', entityId: newArea.id, details: `${form.name} (${form.width}m × ${form.length}m)` });
      showToast('success', 'Área criada');
    }
    setAreas(db.getAreaMaps());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const a = db.getAreaMapById(id);
    db.deleteAreaMap(id);
    db.addHistory({ userId: user!.id, action: 'Área excluída', entity: 'areaMap', entityId: id, details: a?.name || '' });
    setAreas(db.getAreaMaps());
    showToast('success', 'Área excluída');
  };

  return (
    <div>
      <PageHeader title="Mapa de Áreas" subtitle="Mapeamento visual de ambientes industriais" actions={canManage ? <Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Área</Button> : undefined} />

      {areas.length === 0 ? (
        <EmptyState
          icon={<MapPin size={48} />}
          title="Nenhuma área cadastrada"
          description="Crie a primeira área para começar a mapear seus ambientes industriais."
          action={canManage ? <Button onClick={openCreate}>Criar Área</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map(area => {
            const equipmentCount = area.objects.filter(o => o.equipmentId || ['machine', 'lathe', 'drill', 'press', 'compressor', 'welder', 'motor', 'custom_equipment'].includes(o.type)).length;
            const photoCount = area.objects.reduce((sum, o) => sum + o.photos.length, 0) + area.generalPhotos.length;
            const inspectionCount = area.objects.filter(o => o.type === 'inspection_point' || o.type === 'photo_point').length;
            // Mini map preview
            const aspectRatio = area.width / area.length;
            return (
              <Card key={area.id} className="p-4">
                {/* Mini preview */}
                <div
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg mb-3 relative overflow-hidden"
                  style={{ paddingBottom: `${(1 / aspectRatio) * 100}%`, maxHeight: '160px' }}
                >
                  <div className="absolute inset-0 p-2">
                    <svg viewBox={`0 0 ${area.width} ${area.length}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      <rect x="0" y="0" width={area.width} height={area.length} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.3" />
                      {area.objects.map(obj => {
                        const colors: Record<string, string> = {
                          machine: '#3B82F6', lathe: '#3B82F6', drill: '#3B82F6', press: '#3B82F6',
                          compressor: '#8B5CF6', welder: '#F59E0B', motor: '#3B82F6', custom_equipment: '#6B7280',
                          workbench: '#10B981', cabinet: '#6B7280', shelf: '#6B7280', stock: '#F59E0B',
                          pallet: '#F59E0B', table: '#10B981', wall: '#374151', door: '#92400E',
                          window: '#06B6D4', column: '#374151', circulation: '#D1D5DB',
                          extinguisher: '#EF4444', computer: '#6366F1', text: '#6B7280',
                          marker: '#EF4444', inspection_point: '#10B981', zone: '#DBEAFE',
                          photo_point: '#F59E0B',
                        };
                        return (
                          <rect key={obj.id} x={obj.x} y={obj.y} width={obj.width} height={obj.height}
                            fill={(colors[obj.type] || '#6B7280') + '40'}
                            stroke={colors[obj.type] || '#6B7280'} strokeWidth="0.2" rx="0.2"
                            transform={obj.rotation ? `rotate(${obj.rotation} ${obj.x + obj.width/2} ${obj.y + obj.height/2})` : ''}
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{area.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Ruler size={12} />
                      <span>{area.width}m × {area.length}m</span>
                    </div>
                  </div>
                </div>

                {area.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{area.description}</p>}

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  <span>🛠 {equipmentCount} equip.</span>
                  <span>📍 {inspectionCount} pontos</span>
                  <span>📷 {photoCount} fotos</span>
                  {area.backgroundImage && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <FileImage size={12} /> Planta
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => navigate(`/area-maps/${area.id}`)} className="flex-1">
                    <Eye size={14} className="inline mr-1" /> Abrir Mapa
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(area)} title="Editar Configurações">
                      <Edit2 size={14} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(area.id)} title="Excluir">
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Área' : 'Nova Área'}>
        <div className="space-y-4">
          <Input label="Nome da Área *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Oficina de Manutenção" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Largura (m) *" type="number" min={1} value={form.width} onChange={e => setForm({ ...form, width: Number(e.target.value) })} />
            <Input label="Comprimento (m) *" type="number" min={1} value={form.length} onChange={e => setForm({ ...form, length: Number(e.target.value) })} />
          </div>
          <Textarea label="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descrição opcional da área..." />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{editing ? 'Salvar' : 'Criar Área'}</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Área" message="Tem certeza que deseja excluir esta área? Todo o mapa e objetos serão removidos." />
    </div>
  );
}
