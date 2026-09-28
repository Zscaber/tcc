import React, { useState, useRef, useEffect } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, Textarea, Card, EmptyState, showToast, ConfirmDialog, StatusBadge, Badge } from '../components/ui';
import {
  Plus, Map, Trash2, Edit2, Upload, Eye, Camera, Wrench, RotateCw, Copy,
  ZoomIn, ZoomOut, Maximize2, AlertTriangle, Image as ImageIcon, Box,
  Layers, Tag, Type, ShieldAlert, Cpu, Move, Check, Info, FileText, Settings, X, PlusCircle
} from 'lucide-react';
import { Layout, LayoutElement, MapElementType, PhotoPoint, AreaPhoto, Equipment, MaintenanceRecord } from '../types';
import { useNavigate } from 'react-router-dom';

// Palette Item Definition
interface LibraryItem {
  type: MapElementType;
  subType: string;
  category: 'equipments' | 'organization' | 'structure' | 'others' | 'sectors';
  label: string;
  iconName: string;
  defaultWidth: number; // in relative %
  defaultHeight: number; // in relative %
  defaultColor: string;
}

const OBJECT_LIBRARY: LibraryItem[] = [
  // Equipamentos
  { type: 'equipment', subType: 'maquina', category: 'equipments', label: 'Máquina', iconName: 'Cpu', defaultWidth: 12, defaultHeight: 12, defaultColor: '#3B82F6' },
  { type: 'equipment', subType: 'torno', category: 'equipments', label: 'Torno', iconName: 'Wrench', defaultWidth: 14, defaultHeight: 10, defaultColor: '#2563EB' },
  { type: 'equipment', subType: 'furadeira', category: 'equipments', label: 'Furadeira', iconName: 'Settings', defaultWidth: 10, defaultHeight: 10, defaultColor: '#1D4ED8' },
  { type: 'equipment', subType: 'prensa', category: 'equipments', label: 'Prensa', iconName: 'Box', defaultWidth: 12, defaultHeight: 12, defaultColor: '#1E40AF' },
  { type: 'equipment', subType: 'compressor', category: 'equipments', label: 'Compressor', iconName: 'Cpu', defaultWidth: 12, defaultHeight: 10, defaultColor: '#0284C7' },
  { type: 'equipment', subType: 'solda', category: 'equipments', label: 'Estação Solda', iconName: 'Settings', defaultWidth: 10, defaultHeight: 10, defaultColor: '#0369A1' },
  { type: 'equipment', subType: 'motor', category: 'equipments', label: 'Motor Elétrico', iconName: 'Cpu', defaultWidth: 10, defaultHeight: 10, defaultColor: '#075985' },
  { type: 'equipment', subType: 'custom_eq', category: 'equipments', label: 'Equipamento Personalizado', iconName: 'PlusCircle', defaultWidth: 12, defaultHeight: 12, defaultColor: '#6366F1' },

  // Organização
  { type: 'organization', subType: 'bancada', category: 'organization', label: 'Bancada', iconName: 'Box', defaultWidth: 16, defaultHeight: 8, defaultColor: '#10B981' },
  { type: 'organization', subType: 'armario', category: 'organization', label: 'Armário de Ferramentas', iconName: 'Box', defaultWidth: 12, defaultHeight: 6, defaultColor: '#059669' },
  { type: 'organization', subType: 'estante', category: 'organization', label: 'Estante / Prateleira', iconName: 'Layers', defaultWidth: 14, defaultHeight: 6, defaultColor: '#047857' },
  { type: 'organization', subType: 'estoque', category: 'organization', label: 'Área de Estoque', iconName: 'Box', defaultWidth: 18, defaultHeight: 14, defaultColor: '#15803D' },
  { type: 'organization', subType: 'pallet', category: 'organization', label: 'Pallet / Carga', iconName: 'Box', defaultWidth: 10, defaultHeight: 10, defaultColor: '#D97706' },
  { type: 'organization', subType: 'mesa', category: 'organization', label: 'Mesa de Trabalho', iconName: 'Box', defaultWidth: 14, defaultHeight: 10, defaultColor: '#65A30D' },
  { type: 'organization', subType: 'custom_org', category: 'organization', label: 'Objeto Personalizado', iconName: 'PlusCircle', defaultWidth: 12, defaultHeight: 12, defaultColor: '#0D9488' },

  // Estrutura
  { type: 'structure', subType: 'parede', category: 'structure', label: 'Parede', iconName: 'Layers', defaultWidth: 25, defaultHeight: 3, defaultColor: '#4B5563' },
  { type: 'structure', subType: 'porta', category: 'structure', label: 'Porta', iconName: 'Move', defaultWidth: 8, defaultHeight: 4, defaultColor: '#9CA3AF' },
  { type: 'structure', subType: 'janela', category: 'structure', label: 'Janela', iconName: 'Move', defaultWidth: 10, defaultHeight: 3, defaultColor: '#6B7280' },
  { type: 'structure', subType: 'coluna', category: 'structure', label: 'Coluna / Pilar', iconName: 'Box', defaultWidth: 6, defaultHeight: 6, defaultColor: '#374151' },
  { type: 'structure', subType: 'circulacao', category: 'structure', label: 'Corredor / Circulação', iconName: 'Move', defaultWidth: 30, defaultHeight: 12, defaultColor: '#93C5FD' },
  { type: 'structure', subType: 'custom_str', category: 'structure', label: 'Estrutura Personalizada', iconName: 'PlusCircle', defaultWidth: 15, defaultHeight: 8, defaultColor: '#6B7280' },

  // Outros & Marcadores
  { type: 'other', subType: 'extintor', category: 'others', label: 'Extintor de Incêndio', iconName: 'ShieldAlert', defaultWidth: 6, defaultHeight: 6, defaultColor: '#EF4444' },
  { type: 'other', subType: 'computador', category: 'others', label: 'Terminal / PC', iconName: 'Cpu', defaultWidth: 8, defaultHeight: 8, defaultColor: '#8B5CF6' },
  { type: 'text', subType: 'texto', category: 'others', label: 'Rótulo / Texto', iconName: 'Type', defaultWidth: 16, defaultHeight: 6, defaultColor: '#1F2937' },
  { type: 'marker', subType: 'marcador', category: 'others', label: 'Marcador 📍', iconName: 'Tag', defaultWidth: 6, defaultHeight: 6, defaultColor: '#F59E0B' },
  { type: 'photo', subType: 'foto_ponto', category: 'others', label: 'Ponto de Inspeção / Foto 📷', iconName: 'Camera', defaultWidth: 7, defaultHeight: 7, defaultColor: '#EC4899' },
  { type: 'other', subType: 'custom_other', category: 'others', label: 'Marcador Personalizado', iconName: 'PlusCircle', defaultWidth: 8, defaultHeight: 8, defaultColor: '#A855F7' },

  // Setores
  { type: 'sector', subType: 'setor_zona', category: 'sectors', label: 'Zona / Setor Destacado', iconName: 'Layers', defaultWidth: 30, defaultHeight: 25, defaultColor: '#E0F2FE' },
];

export default function LayoutPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Layout[]>(db.getLayouts());
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [activePhotosAreaId, setActivePhotosAreaId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    widthMeters: 20,
    lengthMeters: 15,
    description: '',
    projectId: '',
  });

  const projects = db.getProjects();

  const handleCreateArea = () => {
    if (!form.name.trim()) {
      showToast('error', 'O nome da área é obrigatório.');
      return;
    }
    const width = Number(form.widthMeters) > 0 ? Number(form.widthMeters) : 20;
    const length = Number(form.lengthMeters) > 0 ? Number(form.lengthMeters) : 15;

    const newArea = db.createLayout({
      name: form.name.trim(),
      widthMeters: width,
      lengthMeters: length,
      description: form.description.trim(),
      projectId: form.projectId || undefined,
      elements: [],
      generalPhotos: [],
    });

    db.addHistory({
      userId: user?.id || 'sys',
      action: 'Área criada',
      entity: 'area_map',
      entityId: newArea.id,
      details: `${newArea.name} (${width}m × ${length}m)`,
    });

    setAreas(db.getLayouts());
    setModalCreateOpen(false);
    showToast('success', 'Nova Área criada com sucesso!');
    setActiveEditorId(newArea.id);
  };

  const handleDeleteArea = (id: string) => {
    db.deleteLayout(id);
    setAreas(db.getLayouts());
    showToast('success', 'Área excluída.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de Áreas"
        subtitle="Mapeamento visual 2D de oficinas, almoxarifados, galpões e setores industriais"
        actions={
          <Button onClick={() => {
            setForm({ name: '', widthMeters: 20, lengthMeters: 15, description: '', projectId: '' });
            setModalCreateOpen(true);
          }}>
            <Plus size={16} className="inline mr-1" /> + Nova Área
          </Button>
        }
      />

      {areas.length === 0 ? (
        <EmptyState
          icon={<Map size={54} className="text-blue-500" />}
          title="Nenhuma área cadastrada"
          description="Crie uma área (oficina, almoxarifado, sala elétrica) definindo largura e comprimento para iniciar o mapeamento visual 2D."
          action={
            <Button onClick={() => {
              setForm({ name: '', widthMeters: 20, lengthMeters: 15, description: '', projectId: '' });
              setModalCreateOpen(true);
            }}>
              <Plus size={16} className="inline mr-1" /> Criar Primeira Área
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map(area => {
            const width = area.widthMeters || 20;
            const length = area.lengthMeters || 15;
            const equipmentCount = area.elements.filter(e => e.type === 'equipment' || e.equipmentId).length;
            const photoPointsCount = area.elements.filter(e => e.type === 'photo' || (e.photos && e.photos.length > 0)).length;
            const generalPhotosCount = area.generalPhotos?.length || 0;
            const projectName = projects.find(p => p.id === area.projectId)?.name;

            return (
              <Card key={area.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{area.name}</h3>
                      {projectName && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{projectName}</span>}
                    </div>
                    <Badge color="blue">{width} m × {length} m</Badge>
                  </div>

                  {area.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{area.description}</p>
                  )}

                  {/* Mini Preview Canvas */}
                  <div
                    className="w-full h-36 bg-slate-900 rounded-lg border border-slate-700 mb-4 relative overflow-hidden flex items-center justify-center cursor-pointer group"
                    onClick={() => setActiveEditorId(area.id)}
                  >
                    {/* Grid lines pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]" />
                    
                    {area.elements.length > 0 ? (
                      <div className="relative w-full h-full p-2">
                        {area.elements.map(el => (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${Math.max(el.width, 8)}%`,
                              height: `${Math.max(el.height, 8)}%`,
                              backgroundColor: (el.color || '#3B82F6') + '70',
                              border: `1px solid ${el.color || '#3B82F6'}`,
                              transform: `rotate(${el.rotation || 0}deg)`,
                            }}
                            className="rounded-sm flex items-center justify-center text-[9px] text-white font-semibold truncate px-0.5 shadow-sm"
                          >
                            {el.type === 'photo' ? '📷' : el.type === 'marker' ? '📍' : el.label}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Map size={24} className="text-slate-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-slate-400">Clique para abrir o editor 2D</span>
                      </div>
                    )}
                  </div>

                  {/* Badges Info */}
                  <div className="flex items-center gap-2 flex-wrap mb-4 text-xs text-gray-600">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                      <Wrench size={13} className="text-blue-600" /> {equipmentCount} Equipamentos
                    </span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                      <Camera size={13} className="text-pink-600" /> {photoPointsCount} Pontos Foto
                    </span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                      <ImageIcon size={13} className="text-green-600" /> {generalPhotosCount} Fotos Área
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button variant="primary" size="sm" onClick={() => setActiveEditorId(area.id)} className="flex-1">
                    <Eye size={14} className="inline mr-1" /> Abrir Mapa
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setActivePhotosAreaId(area.id)} title="Fotos do Ambiente">
                    <ImageIcon size={14} className="inline text-gray-700" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(area.id)} title="Excluir Área">
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Nova Área */}
      <Modal isOpen={modalCreateOpen} onClose={() => setModalCreateOpen(false)} title="Nova Área de Mapeamento">
        <div className="space-y-4">
          <Input
            label="Nome da Área *"
            placeholder="Ex: Oficina de Manutenção, Almoxarifado, Galpão A"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Largura (metros) *"
              type="number"
              min="1"
              value={form.widthMeters}
              onChange={e => setForm({ ...form, widthMeters: Number(e.target.value) })}
            />
            <Input
              label="Comprimento (metros) *"
              type="number"
              min="1"
              value={form.lengthMeters}
              onChange={e => setForm({ ...form, lengthMeters: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Projeto Associado (Opcional)"
            value={form.projectId}
            onChange={e => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Nenhum / Geral</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          <Textarea
            label="Descrição (Opcional)"
            placeholder="Ex: Galpão principal reservado para manutenções mecânicas e usinagem..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateArea}>Criar e Abrir Editor</Button>
        </div>
      </Modal>

      {/* Editor do Mapa (Modal 2D) */}
      {activeEditorId && (
        <AreaEditorModal
          areaId={activeEditorId}
          onClose={() => {
            setActiveEditorId(null);
            setAreas(db.getLayouts());
          }}
        />
      )}

      {/* Modal Fotos Gerais do Ambiente */}
      {activePhotosAreaId && (
        <AreaPhotosModal
          areaId={activePhotosAreaId}
          onClose={() => {
            setActivePhotosAreaId(null);
            setAreas(db.getLayouts());
          }}
        />
      )}

      {/* Confirm Excluir */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDeleteArea(deleteConfirmId)}
        title="Excluir Área"
        message="Tem certeza que deseja excluir esta área e seu mapa? Esta ação não pode ser desfeita."
      />
    </div>
  );
}

// =========================================================
// EDITOR DO MAPA 2D (AREA EDITOR MODAL)
// =========================================================

function AreaEditorModal({ areaId, onClose }: { areaId: string; onClose: () => void }) {
  const { user } = useAuth();
  const area = db.getLayoutById(areaId);
  const systemEquipment = db.getEquipment();
  const maintenanceRecords = db.getMaintenanceRecords();

  const [elements, setElements] = useState<LayoutElement[]>(area?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'equipments' | 'organization' | 'structure' | 'others' | 'sectors'>('equipments');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Modais auxiliares
  const [equipmentInspectId, setEquipmentInspectId] = useState<string | null>(null);
  const [photoPointInspectId, setPhotoPointInspectId] = useState<string | null>(null);
  const [showNewEquipmentModal, setShowNewEquipmentModal] = useState<boolean>(false);
  const [pendingElementIdForNewEq, setPendingElementIdForNewEq] = useState<string | null>(null);

  // Drag & Interaction state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  if (!area) return null;

  const widthM = area.widthMeters || 20;
  const lengthM = area.lengthMeters || 15;
  const aspectRatio = widthM / lengthM;

  // Auto-Save modifications to DB on change
  const saveMapToDB = (updatedElements: LayoutElement[]) => {
    setElements(updatedElements);
    db.updateLayout(areaId, { elements: updatedElements });
  };

  const handleSaveAndClose = () => {
    db.updateLayout(areaId, { elements });
    db.addHistory({
      userId: user?.id || 'sys',
      action: 'Mapa de Área salvo',
      entity: 'area_map',
      entityId: areaId,
      details: `${area.name} com ${elements.length} objetos`,
    });
    showToast('success', 'Mapa salvo com sucesso!');
    onClose();
  };

  // Add Object from Palette
  const handleAddObject = (item: LibraryItem) => {
    const newId = Date.now().toString();

    // Check if equipment needs link selection
    if (item.type === 'equipment' && item.subType !== 'custom_eq') {
      const el: LayoutElement = {
        id: newId,
        layoutId: areaId,
        type: item.type,
        category: item.category,
        subType: item.subType,
        x: 35 + (Math.random() * 10 - 5),
        y: 35 + (Math.random() * 10 - 5),
        width: item.defaultWidth,
        height: item.defaultHeight,
        rotation: 0,
        label: item.label,
        color: item.defaultColor,
      };
      const updated = [...elements, el];
      saveMapToDB(updated);
      setSelectedId(newId);
      return;
    }

    const el: LayoutElement = {
      id: newId,
      layoutId: areaId,
      type: item.type,
      category: item.category,
      subType: item.subType,
      x: 35 + (Math.random() * 10 - 5),
      y: 35 + (Math.random() * 10 - 5),
      width: item.defaultWidth,
      height: item.defaultHeight,
      rotation: 0,
      label: item.label,
      color: item.defaultColor,
      photos: item.type === 'photo' ? [] : undefined,
    };

    const updated = [...elements, el];
    saveMapToDB(updated);
    setSelectedId(newId);
  };

  // Canvas Mouse & Touch Dragging Logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setDraggingId(id);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const el = elements.find(item => item.id === id);
    if (el) {
      setDragOffset({ x: clickX - el.x, y: clickY - el.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    if (draggingId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = ((e.clientX - rect.left) / rect.width) * 100;
      const currentY = ((e.clientY - rect.top) / rect.height) * 100;

      let newX = Math.round(currentX - dragOffset.x);
      let newY = Math.round(currentY - dragOffset.y);

      newX = Math.max(0, Math.min(92, newX));
      newY = Math.max(0, Math.min(92, newY));

      const updated = elements.map(el => el.id === draggingId ? { ...el, x: newX, y: newY } : el);
      setElements(updated);
    } else if (resizingId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = ((e.clientX - rect.left) / rect.width) * 100;
      const currentY = ((e.clientY - rect.top) / rect.height) * 100;

      const el = elements.find(item => item.id === resizingId);
      if (el) {
        const newW = Math.max(4, Math.min(60, Math.round(currentX - el.x)));
        const newH = Math.max(4, Math.min(60, Math.round(currentY - el.y)));
        const updated = elements.map(item => item.id === resizingId ? { ...item, width: newW, height: newH } : item);
        setElements(updated);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingId || resizingId) {
      db.updateLayout(areaId, { elements });
      setDraggingId(null);
      setResizingId(null);
    }
  };

  // Object Operations
  const handleRotate = (id: string) => {
    const updated = elements.map(el => {
      if (el.id === id) {
        const nextRotation = ((el.rotation || 0) + 90) % 360;
        return { ...el, rotation: nextRotation };
      }
      return el;
    });
    saveMapToDB(updated);
  };

  const handleDuplicate = (id: string) => {
    const target = elements.find(e => e.id === id);
    if (!target) return;
    const newId = Date.now().toString();
    const clone: LayoutElement = {
      ...target,
      id: newId,
      x: Math.min(90, target.x + 4),
      y: Math.min(90, target.y + 4),
      label: `${target.label} (Cópia)`,
    };
    const updated = [...elements, clone];
    saveMapToDB(updated);
    setSelectedId(newId);
  };

  const handleDeleteObject = (id: string) => {
    const updated = elements.filter(el => el.id !== id);
    saveMapToDB(updated);
    setSelectedId(null);
  };

  const handleUpdateLabel = (id: string, newLabel: string) => {
    const updated = elements.map(el => el.id === id ? { ...el, label: newLabel } : el);
    saveMapToDB(updated);
  };

  const handleLinkEquipment = (elementId: string, eqId: string) => {
    if (eqId === '__NEW__') {
      setPendingElementIdForNewEq(elementId);
      setShowNewEquipmentModal(true);
      return;
    }
    const eq = systemEquipment.find(e => e.id === eqId);
    const updated = elements.map(el => {
      if (el.id === elementId) {
        return {
          ...el,
          equipmentId: eqId || undefined,
          label: eq ? eq.name : el.label,
        };
      }
      return el;
    });
    saveMapToDB(updated);
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Editor Topbar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
              <Map size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">{area.name}</h2>
              <p className="text-xs text-slate-400">
                Dimensões: <span className="text-blue-400 font-semibold">{widthM} m × {lengthM} m</span> | Escala de Exibição: {zoomLevel}%
              </p>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Diminuir Zoom"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded"
              title="Zoom 100%"
            >
              100%
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(200, prev + 15))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Aumentar Zoom"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white border-l border-slate-700 ml-1"
              title="Ajustar Mapa à Tela"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveAndClose}>
              <Check size={16} className="inline mr-1" /> Salvar Mapa
            </Button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Editor Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          
          {/* Left Sidebar - Object Library Palette */}
          <div className="w-full md:w-72 bg-white border-r border-gray-200 flex flex-col h-auto md:h-full z-10 shadow-sm">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Adicionar Objetos</h3>
              
              {/* Category Tabs */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-3 gap-1">
                {[
                  { id: 'equipments', label: 'Máquinas' },
                  { id: 'organization', label: 'Organização' },
                  { id: 'structure', label: 'Estrutura' },
                  { id: 'others', label: 'Outros/Marcadores' },
                  { id: 'sectors', label: 'Setores' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`py-1.5 px-2 text-[11px] font-medium rounded text-center transition-colors truncate ${
                      activeCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Objects List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-48 md:max-h-none">
              {OBJECT_LIBRARY.filter(item => item.category === activeCategory).map(item => (
                <button
                  key={item.subType}
                  onClick={() => handleAddObject(item)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: item.defaultColor }}
                    >
                      {item.type === 'photo' ? '📷' : item.type === 'marker' ? '📍' : '🛠'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700">{item.label}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{item.type}</p>
                    </div>
                  </div>
                  <Plus size={14} className="text-gray-400 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          {/* Center Canvas Area */}
          <div
            className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-slate-200/80 relative"
            onClick={() => setSelectedId(null)}
          >
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="relative shadow-2xl rounded-lg bg-white border-4 border-slate-800 overflow-hidden"
            >
              {/* Scale meter indicator headers */}
              <div className="absolute top-2 left-3 z-10 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded text-[11px] font-mono border border-slate-700">
                📐 {widthM} m (Largura) × {lengthM} m (Comprimento)
              </div>

              <div
                ref={canvasRef}
                style={{
                  width: `${Math.min(900, Math.max(550, 650 * (aspectRatio || 1.3)))}px`,
                  height: `${Math.min(700, Math.max(450, 650))}px`,
                }}
                className="relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] select-none cursor-crosshair overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Render Map Elements */}
                {elements.map(el => {
                  const isSelected = selectedId === el.id;
                  const isDragging = draggingId === el.id;

                  // Check if equipment has maintenance pending
                  const linkedEq = el.equipmentId ? systemEquipment.find(e => e.id === el.equipmentId) : null;
                  const hasPendingMaintenance = linkedEq ? (
                    linkedEq.status === 'maintenance' ||
                    maintenanceRecords.some(m => m.equipmentId === linkedEq.id && m.status !== 'completed' && m.status !== 'cancelled')
                  ) : false;

                  return (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        height: `${el.height}%`,
                        transform: `rotate(${el.rotation || 0}deg)`,
                        backgroundColor: el.type === 'sector' ? (el.color || '#3B82F6') + '25' : (el.color || '#3B82F6'),
                        border: el.type === 'sector' ? `2px dashed ${el.color || '#3B82F6'}` : `2px solid ${isSelected ? '#2563EB' : 'rgba(0,0,0,0.15)'}`,
                      }}
                      className={`rounded-md flex items-center justify-center p-1 cursor-move transition-shadow ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-30 shadow-lg' : 'hover:shadow-md z-10'
                      } ${isDragging ? 'opacity-80 scale-105' : ''}`}
                      onMouseDown={e => handleMouseDown(e, el.id)}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedId(el.id);
                        if (el.type === 'equipment' && el.equipmentId) {
                          setEquipmentInspectId(el.equipmentId);
                        } else if (el.type === 'photo') {
                          setPhotoPointInspectId(el.id);
                        }
                      }}
                    >
                      {/* Element Label & Icon */}
                      <div className="flex flex-col items-center justify-center text-center w-full h-full overflow-hidden pointer-events-none">
                        {el.type === 'photo' ? (
                          <span className="text-lg">📷</span>
                        ) : el.type === 'marker' ? (
                          <span className="text-lg">📍</span>
                        ) : el.subType === 'extintor' ? (
                          <span className="text-base">🧯</span>
                        ) : null}

                        <span className={`font-bold truncate w-full px-1 ${
                          el.type === 'sector' ? 'text-blue-900 text-xs' : 'text-white text-[11px] drop-shadow-sm'
                        }`}>
                          {el.label}
                        </span>

                        {linkedEq && (
                          <div className="flex items-center gap-1 mt-0.5 max-w-[90%] truncate">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                hasPendingMaintenance || linkedEq.status === 'maintenance'
                                  ? 'bg-red-500 animate-ping'
                                  : linkedEq.status === 'operating'
                                  ? 'bg-green-400'
                                  : 'bg-amber-400'
                              }`}
                              title={linkedEq.status}
                            />
                            <span className="text-[9px] bg-black/50 text-white px-1 rounded truncate">
                              {linkedEq.code}
                            </span>
                            {linkedEq.criticality && (
                              <span className={`text-[8px] px-1 rounded font-bold uppercase ${
                                linkedEq.criticality === 'critica'
                                  ? 'bg-red-700 text-white'
                                  : linkedEq.criticality === 'alta'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}>
                                {linkedEq.criticality === 'critica' ? 'CRIT' : linkedEq.criticality === 'alta' ? 'ALT' : 'MED'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Maintenance Warning Badge */}
                      {hasPendingMaintenance && (
                        <div
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md animate-pulse border border-white"
                          title="Manutenção Pendente!"
                        >
                          🔴
                        </div>
                      )}

                      {/* Resize Handle if Selected */}
                      {isSelected && (
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-tl cursor-se-resize flex items-center justify-center text-white text-[9px]"
                          onMouseDown={e => {
                            e.stopPropagation();
                            setResizingId(el.id);
                          }}
                        >
                          ↘
                        </div>
                      )}
                    </div>
                  );
                })}

                {elements.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Map size={48} className="mb-2 opacity-50" />
                    <p className="font-semibold text-sm">Mapa Vazio</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Selecione objetos no painel à esquerda para posicioná-los nesta área.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Selected Object Inspector & Operations */}
          {selectedElement ? (
            <div className="w-full md:w-80 bg-white border-l border-gray-200 p-4 flex flex-col justify-between overflow-y-auto z-10 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Box size={16} className="text-blue-600" /> Propriedades do Objeto
                  </h3>
                  <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                <Input
                  label="Nome / Rótulo"
                  value={selectedElement.label}
                  onChange={e => handleUpdateLabel(selectedElement.id, e.target.value)}
                />

                {/* Equipment Link Section */}
                {(selectedElement.type === 'equipment' || selectedElement.category === 'equipments') && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                    <label className="block text-xs font-bold text-blue-900">Vincular a Equipamento do Sistema</label>
                    <select
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={selectedElement.equipmentId || ''}
                      onChange={e => handleLinkEquipment(selectedElement.id, e.target.value)}
                    >
                      <option value="">Nenhum (Apenas símbolo visual)</option>
                      <optgroup label="Equipamentos Existentes">
                        {systemEquipment.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>
                        ))}
                      </optgroup>
                      <option value="__NEW__">➕ Cadastrar Novo Equipamento...</option>
                    </select>

                    {selectedElement.equipmentId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => setEquipmentInspectId(selectedElement.equipmentId!)}
                      >
                        <Wrench size={12} className="inline mr-1" /> Ver Ficha do Equipamento
                      </Button>
                    )}
                  </div>
                )}

                {/* Color customization */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cor Visual</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.color || '#3B82F6'}
                      onChange={e => {
                        const updated = elements.map(el => el.id === selectedElement.id ? { ...el, color: e.target.value } : el);
                        saveMapToDB(updated);
                      }}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-xs text-gray-500">{selectedElement.color || '#3B82F6'}</span>
                  </div>
                </div>

                {/* Photo Point Hotspot button */}
                {selectedElement.type === 'photo' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => setPhotoPointInspectId(selectedElement.id)}
                  >
                    <Camera size={14} className="inline mr-1" /> Abrir Fotos deste Ponto ({selectedElement.photos?.length || 0})
                  </Button>
                )}

                {/* Transform Actions */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ações & Transformações</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleRotate(selectedElement.id)}>
                      <RotateCw size={14} className="inline mr-1" /> Rotacionar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDuplicate(selectedElement.id)}>
                      <Copy size={14} className="inline mr-1" /> Duplicar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDeleteObject(selectedElement.id)}
                >
                  <Trash2 size={14} className="inline mr-1" /> Excluir Objeto
                </Button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex w-72 bg-white border-l border-gray-200 p-4 items-center justify-center text-center text-gray-400 text-xs">
              <div>
                <Move size={32} className="mx-auto mb-2 opacity-40" />
                <p>Clique em um objeto no mapa para editar suas propriedades, girar, vincular equipamentos ou excluir.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Inspecionar Equipamento Vinculado */}
      {equipmentInspectId && (
        <EquipmentInspectDrawer
          equipmentId={equipmentInspectId}
          onClose={() => setEquipmentInspectId(null)}
        />
      )}

      {/* Modal Ponto de Inspeção / Fotos */}
      {photoPointInspectId && (
        <PhotoPointModal
          element={elements.find(e => e.id === photoPointInspectId)!}
          onSave={updatedPhotos => {
            const updated = elements.map(el => el.id === photoPointInspectId ? { ...el, photos: updatedPhotos } : el);
            saveMapToDB(updated);
            setPhotoPointInspectId(null);
          }}
          onClose={() => setPhotoPointInspectId(null)}
        />
      )}

      {/* Modal Novo Equipamento direto pelo mapa */}
      {showNewEquipmentModal && (
        <NewEquipmentModal
          areaName={area.name}
          onCreated={newEq => {
            if (pendingElementIdForNewEq) {
              const updated = elements.map(el => el.id === pendingElementIdForNewEq ? { ...el, equipmentId: newEq.id, label: newEq.name } : el);
              saveMapToDB(updated);
            }
            setShowNewEquipmentModal(false);
            setPendingElementIdForNewEq(null);
          }}
          onClose={() => {
            setShowNewEquipmentModal(false);
            setPendingElementIdForNewEq(null);
          }}
        />
      )}
    </div>
  );
}

// =========================================================
// DRAWER DE INFORMAÇÕES DO EQUIPAMENTO (EQUIPMENT INSPECT)
// =========================================================

function EquipmentInspectDrawer({ equipmentId, onClose }: { equipmentId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const equipment = db.getEquipmentById(equipmentId);
  const maintenanceRecords = db.getMaintenanceRecords().filter(m => m.equipmentId === equipmentId);
  const [showNewMaintModal, setShowNewMaintModal] = useState(false);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintType, setMaintType] = useState<'preventive' | 'corrective' | 'predictive'>('preventive');

  if (!equipment) return null;

  const handleAddMaintenance = () => {
    if (!maintDesc.trim()) return;
    db.createMaintenanceRecord({
      equipmentId: equipment.id,
      type: maintType,
      description: maintDesc.trim(),
      responsibleId: 'demo-p1',
      date: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'scheduled',
      notes: '',
      cost: 0,
    });
    showToast('success', 'Nova manutenção agendada para este equipamento!');
    setShowNewMaintModal(false);
    setMaintDesc('');
  };

  const criticalityColors: Record<string, string> = {
    critica: 'bg-red-100 text-red-700 border-red-200',
    alta: 'bg-amber-100 text-amber-700 border-amber-200',
    media: 'bg-blue-100 text-blue-700 border-blue-200',
    baixa: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Ficha do Equipamento: ${equipment.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start bg-slate-50 p-4 rounded-xl border border-gray-200">
          {equipment.notes?.startsWith('data:image') ? (
            <img src={equipment.notes} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-300" />
          ) : (
            <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-2xl">
              <Wrench size={36} />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg text-gray-800">{equipment.name}</h3>
              <StatusBadge status={equipment.status} />
              {equipment.criticality && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${criticalityColors[equipment.criticality] || 'bg-gray-100 text-gray-700'}`}>
                  Criticidade: {equipment.criticality}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Código: {equipment.code} | Setor: {equipment.sector}</p>
            <p className="text-xs text-gray-600 mt-2">
              <strong>Fabricante:</strong> {equipment.manufacturer || 'N/A'} | <strong>Modelo:</strong> {equipment.model || 'N/A'}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Próxima Manutenção:</strong> {equipment.nextMaintenance || 'N/A'}
            </p>
          </div>
        </div>

        {/* Histórico de Manutenção */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" /> Histórico de Manutenção ({maintenanceRecords.length})
            </h4>
            <Button size="sm" onClick={() => setShowNewMaintModal(true)}>
              <Plus size={14} className="inline mr-1" /> Nova Manutenção
            </Button>
          </div>

          {maintenanceRecords.length === 0 ? (
            <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-200">
              Nenhuma manutenção registrada para este equipamento.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {maintenanceRecords.map(m => (
                <div key={m.id} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-800">{m.description}</span>
                    <p className="text-[10px] text-gray-500">Data: {m.date} | Tipo: {m.type}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-3 border-t border-gray-100">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/equipment');
            }}
          >
            <Wrench size={14} className="inline mr-1 text-blue-600" /> Ver no Módulo Equipamentos
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/maintenance');
            }}
          >
            <Settings size={14} className="inline mr-1 text-gray-600" /> Ver no Módulo Manutenção
          </Button>
        </div>
        <Button variant="primary" onClick={onClose}>Fechar</Button>
      </div>

      {/* Modal Nova Manutenção rápida */}
      <Modal isOpen={showNewMaintModal} onClose={() => setShowNewMaintModal(false)} title="Nova Manutenção" size="sm">
        <div className="space-y-3">
          <Input label="Descrição *" value={maintDesc} onChange={e => setMaintDesc(e.target.value)} placeholder="Ex: Lubrificação das engrenagens" />
          <Select label="Tipo" value={maintType} onChange={e => setMaintType(e.target.value as any)}>
            <option value="preventive">Preventiva</option>
            <option value="corrective">Corretiva</option>
            <option value="predictive">Preditiva</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setShowNewMaintModal(false)}>Cancelar</Button>
          <Button onClick={handleAddMaintenance}>Agendar</Button>
        </div>
      </Modal>
    </Modal>
  );
}

// =========================================================
// MODAL PONTO DE INSPEÇÃO COM MÚLTIPLAS FOTOS
// =========================================================

function PhotoPointModal({ element, onSave, onClose }: { element: LayoutElement; onSave: (photos: PhotoPoint[]) => void; onClose: () => void }) {
  const [photos, setPhotos] = useState<PhotoPoint[]>(element.photos || []);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const newPhoto: PhotoPoint = {
        id: Date.now().toString(),
        url,
        title: newTitle || 'Foto do Ponto',
        description: newDesc,
        date: new Date().toLocaleDateString('pt-BR'),
      };
      setPhotos([...photos, newPhoto]);
      setNewTitle('');
      setNewDesc('');
      showToast('success', 'Foto adicionada!');
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Ponto de Inspeção / Referência: ${element.label}`} size="lg">
      <div className="space-y-4">
        {/* Upload form */}
        <div className="p-4 bg-pink-50/60 border border-pink-200 rounded-xl space-y-3">
          <h4 className="font-bold text-xs text-pink-900 flex items-center gap-1.5">
            <Camera size={16} /> Adicionar Nova Foto a este Ponto
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Título da Foto" placeholder="Ex: Painel Frontal, Tubulação" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Input label="Descrição / Observação" placeholder="Ex: Junta com ligeiro desgaste" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <div>
            <label className="px-4 py-2 bg-pink-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-pink-700 inline-flex items-center gap-1.5 shadow-sm">
              <Upload size={14} /> Selecionar Imagem...
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Photos List */}
        <div>
          <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">Fotos Cadastradas ({photos.length})</h4>
          {photos.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-4 text-center bg-gray-50 rounded-lg border border-gray-200">
              Nenhuma foto vinculada a este ponto. Utilize o campo acima para carregar imagens.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {photos.map(p => (
                <div key={p.id} className="p-2.5 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                  <img src={p.url} alt="" className="w-16 h-16 object-cover rounded border border-gray-300" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-gray-800 truncate">{p.title}</p>
                    {p.description && <p className="text-[11px] text-gray-500 truncate">{p.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{p.date}</p>
                  </div>
                  <button onClick={() => handleDeletePhoto(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onSave(photos)}>Salvar Fotos</Button>
      </div>
    </Modal>
  );
}

// =========================================================
// MODAL NOVO EQUIPAMENTO DIRETO PELO MAPA
// =========================================================

function NewEquipmentModal({ areaName, onCreated, onClose }: { areaName: string; onCreated: (eq: Equipment) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(`EQ-${Math.floor(100 + Math.random() * 900)}`);
  const [type, setType] = useState('Usinagem');
  const [status, setStatus] = useState<Equipment['status']>('operating');

  const handleSave = () => {
    if (!name.trim()) {
      showToast('error', 'Nome do equipamento é obrigatório.');
      return;
    }
    const newEq = db.createEquipment({
      name: name.trim(),
      code: code.trim(),
      type,
      manufacturer: '',
      model: '',
      serialNumber: '',
      sector: areaName,
      location: areaName,
      responsibleId: 'demo-p1',
      status,
      acquisitionDate: new Date().toISOString().split('T')[0],
      lastMaintenance: '',
      nextMaintenance: '',
      notes: '',
    });
    showToast('success', 'Novo equipamento cadastrado no sistema!');
    onCreated(newEq);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Cadastrar Novo Equipamento pelo Mapa" size="sm">
      <div className="space-y-3">
        <Input label="Nome do Equipamento *" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Prensa 03" />
        <Input label="Código *" value={code} onChange={e => setCode(e.target.value)} />
        <Input label="Tipo / Categoria" value={type} onChange={e => setType(e.target.value)} placeholder="Ex: Usinagem, Elétrica" />
        <Select label="Status Inicial" value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="operating">Em Operação</option>
          <option value="maintenance">Em Manutenção</option>
          <option value="stopped">Parado</option>
        </Select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>Salvar e Vincular</Button>
      </div>
    </Modal>
  );
}

// =========================================================
// MODAL FOTOS GERAIS DO AMBIENTE (AREA PHOTOS MODAL)
// =========================================================

function AreaPhotosModal({ areaId, onClose }: { areaId: string; onClose: () => void }) {
  const area = db.getLayoutById(areaId);
  const [photos, setPhotos] = useState<AreaPhoto[]>(area?.generalPhotos || []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!area) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const newPhoto: AreaPhoto = {
        id: Date.now().toString(),
        url: ev.target?.result as string,
        title: title || 'Foto do Ambiente',
        description,
        createdAt: new Date().toLocaleDateString('pt-BR'),
      };
      const updated = [...photos, newPhoto];
      setPhotos(updated);
      db.updateLayout(areaId, { generalPhotos: updated });
      setTitle('');
      setDescription('');
      showToast('success', 'Foto do ambiente cadastrada!');
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    db.updateLayout(areaId, { generalPhotos: updated });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Fotos do Ambiente: ${area.name}`} size="lg">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
          <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
            <ImageIcon size={16} /> Carregar Foto Geral do Ambiente
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Título da Foto" placeholder="Ex: Visão Geral, Entrada Principal, Lado Leste" value={title} onChange={e => setTitle(e.target.value)} />
            <Input label="Descrição" placeholder="Ex: Vista panorâmica das bancadas" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-700 inline-flex items-center gap-1.5 shadow-sm">
              <Upload size={14} /> Selecionar Imagem...
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">Fotos do Ambiente ({photos.length})</h4>
          {photos.length === 0 ? (
            <p className="text-xs text-gray-400 italic p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
              Nenhuma foto geral cadastrada para esta área.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto">
              {photos.map(p => (
                <div key={p.id} className="p-3 bg-white border border-gray-200 rounded-xl flex flex-col justify-between shadow-sm">
                  <img src={p.url} alt="" className="w-full h-36 object-cover rounded-lg border border-gray-200 mb-2" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-800">{p.title}</p>
                      {p.description && <p className="text-[11px] text-gray-500">{p.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}
