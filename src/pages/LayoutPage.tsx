import React, { useState, useRef, useEffect } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Card, EmptyState, showToast, ConfirmDialog } from '../components/ui';
import { Plus, Map, Trash2, Edit2, Upload, Eye } from 'lucide-react';
import { Layout, LayoutElement } from '../types';

export default function LayoutPage() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState(db.getLayouts());
  const [modalOpen, setModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', projectId: '' });
  const projects = db.getProjects();
  const equipment = db.getEquipment();

  const openCreate = () => { setForm({ name: '', projectId: '' }); setModalOpen(true); };

  const handleCreate = () => {
    if (!form.name) { showToast('error', 'Nome é obrigatório'); return; }
    db.createLayout({ name: form.name, projectId: form.projectId, elements: [] });
    db.addHistory({ userId: user!.id, action: 'Layout criado', entity: 'layout', entityId: 'new', details: form.name });
    setLayouts(db.getLayouts());
    setModalOpen(false);
    showToast('success', 'Layout criado');
  };

  const handleDelete = (id: string) => {
    db.deleteLayout(id);
    setLayouts(db.getLayouts());
    showToast('success', 'Layout excluído');
  };

  return (
    <div>
      <PageHeader title="Layout / Planta" subtitle="Visualização e gestão de layouts" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Layout</Button>} />

      {layouts.length === 0 ? (
        <EmptyState icon={<Map size={48} />} title="Nenhum layout criado" description="Crie um layout para visualizar a disposição dos equipamentos." action={<Button onClick={openCreate}>Criar Layout</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {layouts.map(l => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{l.name}</h3>
                  <p className="text-xs text-gray-500">{projects.find(p => p.id === l.projectId)?.name || 'Sem projeto'}</p>
                </div>
              </div>
              <div className="h-32 bg-gray-50 rounded-lg border border-gray-200 mb-3 flex items-center justify-center overflow-hidden relative">
                {l.backgroundImage && <img src={l.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                {l.elements.length > 0 ? (
                  <div className="relative w-full h-full">
                    {l.elements.map(el => (
                      <div key={el.id} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, backgroundColor: el.color + '40', border: `1px solid ${el.color}` }} className="rounded text-[8px] flex items-center justify-center text-gray-600 overflow-hidden">
                        {el.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Layout vazio</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditorOpen(l.id)} className="flex-1"><Eye size={14} className="inline mr-1" /> Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(l.id)}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Layout">
        <div className="space-y-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Select label="Projeto" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Selecione...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar</Button>
        </div>
      </Modal>

      {/* Editor */}
      {editorOpen && <LayoutEditor layoutId={editorOpen} onClose={() => { setEditorOpen(null); setLayouts(db.getLayouts()); }} />}

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Layout" message="Tem certeza?" />
    </div>
  );
}

function LayoutEditor({ layoutId, onClose }: { layoutId: string; onClose: () => void }) {
  const { user } = useAuth();
  const layout = db.getLayoutById(layoutId);
  const equipment = db.getEquipment();
  const [elements, setElements] = useState<LayoutElement[]>(layout?.elements || []);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newElement, setNewElement] = useState({ type: 'sector' as LayoutElement['type'], label: '', equipmentId: '', color: '#3B82F6' });
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!layout) return null;

  const addElement = () => {
    const el: LayoutElement = {
      id: Date.now().toString(),
      layoutId,
      type: newElement.type,
      x: 10 + Math.random() * 50,
      y: 10 + Math.random() * 50,
      width: newElement.type === 'equipment' ? 10 : 20,
      height: newElement.type === 'equipment' ? 10 : 15,
      label: newElement.label || (newElement.equipmentId ? equipment.find(e => e.id === newElement.equipmentId)?.name || 'Equipamento' : 'Área'),
      equipmentId: newElement.equipmentId,
      color: newElement.color,
    };
    setElements([...elements, el]);
    setShowAddModal(false);
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setElements(elements.map(el => el.id === dragging ? { ...el, x: Math.max(0, Math.min(90, x)), y: Math.max(0, Math.min(90, y)) } : el));
  };

  const handleMouseUp = () => setDragging(null);

  const handleSave = () => {
    db.updateLayout(layoutId, { elements });
    db.addHistory({ userId: user!.id, action: 'Layout atualizado', entity: 'layout', entityId: layoutId, details: `${elements.length} elementos` });
    showToast('success', 'Layout salvo');
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      db.updateLayout(layoutId, { backgroundImage: ev.target?.result as string });
      showToast('success', 'Imagem de fundo adicionada');
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal isOpen={true} onClose={handleSave} title={`Editar Layout: ${layout.name}`} size="xl">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} className="inline mr-1" /> Adicionar Elemento</Button>
          <label className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-200 border border-gray-300 inline-flex items-center gap-1">
            <Upload size={14} /> Importar Planta
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <Button variant="secondary" size="sm" onClick={handleSave}>Salvar</Button>
        </div>

        <div
          ref={canvasRef}
          className="relative w-full h-[400px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {layout.backgroundImage && <img src={layout.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />}
          {elements.map(el => (
            <div
              key={el.id}
              style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, backgroundColor: el.color + '30', border: `2px solid ${el.color}` }}
              className={`rounded cursor-move flex items-center justify-center text-xs font-medium text-gray-700 select-none ${dragging === el.id ? 'opacity-70' : ''}`}
              onMouseDown={e => handleMouseDown(e, el.id)}
            >
              <span className="truncate px-1">{el.label}</span>
              <button onClick={() => removeElement(el.id)} className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600">×</button>
            </div>
          ))}
          {elements.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Adicione elementos ao layout</p>}
        </div>
      </div>

      {/* Add element modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Elemento" size="sm">
        <div className="space-y-4">
          <Select label="Tipo" value={newElement.type} onChange={e => setNewElement({ ...newElement, type: e.target.value as LayoutElement['type'] })}>
            <option value="area">Área</option>
            <option value="sector">Setor</option>
            <option value="equipment">Equipamento</option>
          </Select>
          <Input label="Nome/Rótulo" value={newElement.label} onChange={e => setNewElement({ ...newElement, label: e.target.value })} />
          {newElement.type === 'equipment' && (
            <Select label="Equipamento" value={newElement.equipmentId} onChange={e => setNewElement({ ...newElement, equipmentId: e.target.value })}>
              <option value="">Selecione...</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          )}
          <Input label="Cor" type="color" value={newElement.color} onChange={e => setNewElement({ ...newElement, color: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
          <Button onClick={addElement}>Adicionar</Button>
        </div>
      </Modal>
    </Modal>
  );
}
