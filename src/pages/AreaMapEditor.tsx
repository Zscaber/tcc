import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, generateId } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Button, Modal, Input, Select, Textarea, Card, Badge, showToast, ConfirmDialog } from '../components/ui';
import { ArrowLeft, Save, ZoomIn, ZoomOut, Maximize2, Plus, Trash2, Copy, RotateCw, Upload, Camera, Wrench, AlertTriangle, Eye, X, ChevronDown, Image } from 'lucide-react';
import { AreaMap, MapObject, MapObjectType, MapObjectPhoto } from '../types';

// Object library definitions
interface ObjectDef { type: MapObjectType; label: string; icon: string; category: string; defaultW: number; defaultH: number; color: string; }

const objectLibrary: ObjectDef[] = [
  // Equipamentos
  { type: 'machine', label: 'Máquina', icon: '⚙️', category: 'Equipamentos', defaultW: 3, defaultH: 2, color: '#3B82F6' },
  { type: 'lathe', label: 'Torno', icon: '🔩', category: 'Equipamentos', defaultW: 3.5, defaultH: 1.5, color: '#3B82F6' },
  { type: 'drill', label: 'Furadeira', icon: '🔧', category: 'Equipamentos', defaultW: 1.5, defaultH: 1.5, color: '#3B82F6' },
  { type: 'press', label: 'Prensa', icon: '🏋️', category: 'Equipamentos', defaultW: 2.5, defaultH: 2.5, color: '#3B82F6' },
  { type: 'compressor', label: 'Compressor', icon: '💨', category: 'Equipamentos', defaultW: 2, defaultH: 2, color: '#8B5CF6' },
  { type: 'welder', label: 'Solda', icon: '⚡', category: 'Equipamentos', defaultW: 1.5, defaultH: 1, color: '#F59E0B' },
  { type: 'motor', label: 'Motor', icon: '🔄', category: 'Equipamentos', defaultW: 1.5, defaultH: 1, color: '#3B82F6' },
  { type: 'custom_equipment', label: 'Equipamento', icon: '🛠️', category: 'Equipamentos', defaultW: 2, defaultH: 2, color: '#6B7280' },
  // Organização
  { type: 'workbench', label: 'Bancada', icon: '🔨', category: 'Organização', defaultW: 3, defaultH: 1, color: '#10B981' },
  { type: 'cabinet', label: 'Armário', icon: '🗄️', category: 'Organização', defaultW: 1, defaultH: 0.6, color: '#6B7280' },
  { type: 'shelf', label: 'Estante', icon: '📚', category: 'Organização', defaultW: 2, defaultH: 0.5, color: '#6B7280' },
  { type: 'stock', label: 'Estoque', icon: '📦', category: 'Organização', defaultW: 2, defaultH: 2, color: '#F59E0B' },
  { type: 'pallet', label: 'Pallet', icon: '📋', category: 'Organização', defaultW: 1.2, defaultH: 1.2, color: '#F59E0B' },
  { type: 'table', label: 'Mesa', icon: '🪑', category: 'Organização', defaultW: 2, defaultH: 1, color: '#10B981' },
  // Estrutura
  { type: 'wall', label: 'Parede', icon: '🧱', category: 'Estrutura', defaultW: 4, defaultH: 0.3, color: '#374151' },
  { type: 'door', label: 'Porta', icon: '🚪', category: 'Estrutura', defaultW: 1, defaultH: 0.3, color: '#92400E' },
  { type: 'window', label: 'Janela', icon: '🪟', category: 'Estrutura', defaultW: 1.5, defaultH: 0.2, color: '#06B6D4' },
  { type: 'column', label: 'Coluna', icon: '🏛️', category: 'Estrutura', defaultW: 0.5, defaultH: 0.5, color: '#374151' },
  { type: 'circulation', label: 'Circulação', icon: '🚶', category: 'Estrutura', defaultW: 3, defaultH: 1.5, color: '#D1D5DB' },
  // Outros
  { type: 'extinguisher', label: 'Extintor', icon: '🧯', category: 'Outros', defaultW: 0.4, defaultH: 0.4, color: '#EF4444' },
  { type: 'computer', label: 'Computador', icon: '💻', category: 'Outros', defaultW: 0.8, defaultH: 0.6, color: '#6366F1' },
  { type: 'text', label: 'Texto', icon: '📝', category: 'Outros', defaultW: 2, defaultH: 0.5, color: '#6B7280' },
  { type: 'marker', label: 'Marcador', icon: '📍', category: 'Outros', defaultW: 0.5, defaultH: 0.5, color: '#EF4444' },
  { type: 'inspection_point', label: 'Inspeção', icon: '📍', category: 'Outros', defaultW: 0.6, defaultH: 0.6, color: '#10B981' },
  { type: 'photo_point', label: 'Foto', icon: '📷', category: 'Outros', defaultW: 0.6, defaultH: 0.6, color: '#F59E0B' },
  { type: 'zone', label: 'Área/Setor', icon: '▢', category: 'Outros', defaultW: 5, defaultH: 4, color: '#DBEAFE' },
];

const categories = [...new Set(objectLibrary.map(o => o.category))];

export default function AreaMapEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [area, setArea] = useState<AreaMap | null>(() => db.getAreaMapById(id || '') || null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null);
  const [rotating, setRotating] = useState<{ id: string; startAngle: number; origRotation: number } | null>(null);
  const [propertyModal, setPropertyModal] = useState<string | null>(null);
  const [equipmentModal, setEquipmentModal] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Equipamentos');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!area) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Área não encontrada</p>
        <Link to="/area-maps" className="text-blue-600 text-sm mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  const selectedObj = area.objects.find(o => o.id === selectedId);

  // Convert screen coords to SVG coords
  const screenToSvg = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = area.width;
    const svgHeight = area.length;
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX / zoom - pan.x / zoom,
      y: (clientY - rect.top) * scaleY / zoom - pan.y / zoom,
    };
  };

  // Add object from library
  const addObject = (def: ObjectDef) => {
    const newObj: MapObject = {
      id: generateId(),
      type: def.type,
      x: area.width / 2 - def.defaultW / 2,
      y: area.length / 2 - def.defaultH / 2,
      width: def.defaultW,
      height: def.defaultH,
      rotation: 0,
      label: def.label,
      color: def.color,
      photos: [],
    };
    const updated = { ...area, objects: [...area.objects, newObj] };
    setArea(updated);
    setSelectedId(newObj.id);
  };

  // Update object
  const updateObject = (objId: string, data: Partial<MapObject>) => {
    const updated = { ...area, objects: area.objects.map(o => o.id === objId ? { ...o, ...data } : o) };
    setArea(updated);
  };

  // Delete object
  const deleteObject = (objId: string) => {
    const updated = { ...area, objects: area.objects.filter(o => o.id !== objId) };
    setArea(updated);
    setSelectedId(null);
  };

  // Duplicate object
  const duplicateObject = (objId: string) => {
    const obj = area.objects.find(o => o.id === objId);
    if (!obj) return;
    const newObj: MapObject = { ...obj, id: generateId(), x: obj.x + 1, y: obj.y + 1, photos: [...obj.photos] };
    const updated = { ...area, objects: [...area.objects, newObj] };
    setArea(updated);
    setSelectedId(newObj.id);
  };

  // Save
  const handleSave = () => {
    db.updateAreaMap(area.id, { objects: area.objects, generalPhotos: area.generalPhotos });
    db.addHistory({ userId: user!.id, action: 'Mapa salvo', entity: 'areaMap', entityId: area.id, details: area.name });
    showToast('success', 'Mapa salvo com sucesso');
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent, objId: string) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      // Middle click or ctrl+click for panning
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, origPanX: pan.x, origPanY: pan.y });
      return;
    }
    e.stopPropagation();
    const obj = area.objects.find(o => o.id === objId);
    if (!obj) return;
    setSelectedId(objId);
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    setDragging({ id: objId, startX: svgCoords.x, startY: svgCoords.y, origX: obj.x, origY: obj.y });
  };

  const handleResizeStart = (e: React.MouseEvent, objId: string) => {
    e.stopPropagation();
    const obj = area.objects.find(o => o.id === objId);
    if (!obj) return;
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    setResizing({ id: objId, startX: svgCoords.x, startY: svgCoords.y, origW: obj.width, origH: obj.height, origX: obj.x, origY: obj.y });
  };

  const handleRotateStart = (e: React.MouseEvent, objId: string) => {
    e.stopPropagation();
    const obj = area.objects.find(o => o.id === objId);
    if (!obj) return;
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    const angle = Math.atan2(svgCoords.y - cy, svgCoords.x - cx) * (180 / Math.PI);
    setRotating({ id: objId, startAngle: angle, origRotation: obj.rotation });
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panStart.origPanX + dx, y: panStart.origPanY + dy });
      return;
    }
    if (dragging) {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      const dx = svgCoords.x - dragging.startX;
      const dy = svgCoords.y - dragging.startY;
      updateObject(dragging.id, { x: Math.max(0, dragging.origX + dx), y: Math.max(0, dragging.origY + dy) });
    }
    if (resizing) {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      const dx = svgCoords.x - resizing.startX;
      const dy = svgCoords.y - resizing.startY;
      updateObject(resizing.id, {
        width: Math.max(0.3, resizing.origW + dx),
        height: Math.max(0.3, resizing.origH + dy),
      });
    }
    if (rotating) {
      const obj = area.objects.find(o => o.id === rotating.id);
      if (!obj) return;
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      const angle = Math.atan2(svgCoords.y - cy, svgCoords.x - cx) * (180 / Math.PI);
      const newRotation = rotating.origRotation + (angle - rotating.startAngle);
      updateObject(rotating.id, { rotation: Math.round(newRotation) });
    }
  };

  const handleSvgMouseUp = () => {
    setDragging(null);
    setResizing(null);
    setRotating(null);
    setIsPanning(false);
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).classList.contains('map-bg')) {
      setSelectedId(null);
    }
  };

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging && !resizing && !rotating) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, origPanX: pan.x, origPanY: pan.y });
    }
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.3, Math.min(5, z + delta)));
  };

  const fitToScreen = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Equipment linking
  const systemEquipment = db.getEquipment();
  const linkedEquipment = selectedObj?.equipmentId ? systemEquipment.find(e => e.id === selectedObj.equipmentId) : null;
  const hasPendingMaintenance = linkedEquipment ? db.getMaintenanceRecords().some(m => m.equipmentId === linkedEquipment.id && m.status !== 'completed' && m.status !== 'cancelled') : false;

  // Photo handling
  const handlePhotoUpload = (objId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo: MapObjectPhoto = { id: generateId(), dataUrl: ev.target?.result as string, caption: '', createdAt: new Date().toISOString() };
      const obj = area.objects.find(o => o.id === objId);
      if (obj) {
        updateObject(objId, { photos: [...obj.photos, photo] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGeneralPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo: MapObjectPhoto = { id: generateId(), dataUrl: ev.target?.result as string, caption: '', createdAt: new Date().toISOString() };
      setArea({ ...area, generalPhotos: [...area.generalPhotos, photo] });
    };
    reader.readAsDataURL(file);
  };

  // Get icon for object type
  const getObjectIcon = (type: MapObjectType) => {
    const def = objectLibrary.find(o => o.type === type);
    return def?.icon || '📦';
  };

  // Render object in SVG
  const renderObject = (obj: MapObject) => {
    const isSelected = obj.id === selectedId;
    const def = objectLibrary.find(o => o.type === obj.type);
    const isZone = obj.type === 'zone';
    const isSmall = ['marker', 'inspection_point', 'photo_point', 'extinguisher', 'column'].includes(obj.type);
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const transform = obj.rotation ? `rotate(${obj.rotation} ${cx} ${cy})` : '';

    return (
      <g key={obj.id} transform={transform} onMouseDown={e => handleMouseDown(e, obj.id)} style={{ cursor: dragging?.id === obj.id ? 'grabbing' : 'grab' }}>
        {/* Main shape */}
        {isZone ? (
          <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height}
            fill={obj.color + '20'} stroke={obj.color} strokeWidth="0.15" strokeDasharray="0.5 0.3" rx="0.1" />
        ) : isSmall ? (
          <circle cx={cx} cy={cy} r={Math.min(obj.width, obj.height) / 2}
            fill={obj.color + '40'} stroke={obj.color} strokeWidth={isSelected ? '0.15' : '0.08'} />
        ) : (
          <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height}
            fill={obj.color + '30'} stroke={obj.color} strokeWidth={isSelected ? '0.15' : '0.08'} rx="0.1" />
        )}
        {/* Icon */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={isSmall ? '0.4' : Math.min(obj.width, obj.height) * 0.4} style={{ pointerEvents: 'none' }}>
          {def?.icon || '📦'}
        </text>
        {/* Label */}
        {obj.label && !isSmall && (
          <text x={cx} y={obj.y + obj.height + 0.4} textAnchor="middle" fontSize="0.35" fill="#374151" style={{ pointerEvents: 'none' }}>
            {obj.label}
          </text>
        )}
        {/* Maintenance indicator */}
        {obj.equipmentId && hasPendingMaintenance && obj.equipmentId === linkedEquipment?.id && (
          <circle cx={obj.x + obj.width - 0.2} cy={obj.y + 0.2} r="0.2" fill="#EF4444" stroke="white" strokeWidth="0.05" />
        )}
        {/* Selection handles */}
        {isSelected && !isZone && (
          <>
            <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill="none" stroke="#3B82F6" strokeWidth="0.1" strokeDasharray="0.3 0.2" />
            {/* Resize handle */}
            <rect x={obj.x + obj.width - 0.3} y={obj.y + obj.height - 0.3} width={0.3} height={0.3} fill="#3B82F6" stroke="white" strokeWidth="0.05"
              style={{ cursor: 'nwse-resize' }} onMouseDown={e => handleResizeStart(e, obj.id)} />
            {/* Rotate handle */}
            <circle cx={cx} cy={obj.y - 0.5} r="0.2" fill="#3B82F6" stroke="white" strokeWidth="0.05"
              style={{ cursor: 'grab' }} onMouseDown={e => handleRotateStart(e, obj.id)} />
            <line x1={cx} y1={obj.y} x2={cx} y2={obj.y - 0.5} stroke="#3B82F6" strokeWidth="0.05" />
          </>
        )}
        {isSelected && isZone && (
          <>
            <rect x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill="none" stroke="#3B82F6" strokeWidth="0.1" strokeDasharray="0.3 0.2" />
            <rect x={obj.x + obj.width - 0.3} y={obj.y + obj.height - 0.3} width={0.3} height={0.3} fill="#3B82F6" stroke="white" strokeWidth="0.05"
              style={{ cursor: 'nwse-resize' }} onMouseDown={e => handleResizeStart(e, obj.id)} />
          </>
        )}
      </g>
    );
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link to="/area-maps" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{area.name}</h1>
            <p className="text-xs text-gray-500">{area.width}m × {area.length}m</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={14} /></button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={14} /></button>
            <button onClick={fitToScreen} className="p-1 hover:bg-gray-100 rounded ml-1" title="Ajustar à tela"><Maximize2 size={14} /></button>
          </div>
          <Button onClick={handleSave}><Save size={16} className="inline mr-1" /> Salvar</Button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left sidebar - Object library */}
        <div className="hidden lg:flex flex-col w-56 bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Adicionar</h3>
          </div>
          {/* Categories */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1.5 text-[10px] font-medium whitespace-nowrap ${activeCategory === cat ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {cat}
              </button>
            ))}
          </div>
          {/* Objects */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {objectLibrary.filter(o => o.category === activeCategory).map(def => (
                <button key={def.type} onClick={() => addObject(def)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
                  <span className="text-lg">{def.icon}</span>
                  <span className="text-[10px] text-gray-600 leading-tight">{def.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Link equipment */}
          {selectedObj && ['machine', 'lathe', 'drill', 'press', 'compressor', 'welder', 'motor', 'custom_equipment'].includes(selectedObj.type) && (
            <div className="p-3 border-t border-gray-200">
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setEquipmentModal(true)}>
                <Wrench size={14} className="inline mr-1" /> Vincular Equipamento
              </Button>
            </div>
          )}
        </div>

        {/* Map canvas */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative" ref={containerRef}>
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${area.width / zoom} ${area.length / zoom}`}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
            onClick={handleSvgClick}
            onWheel={handleWheel}
            style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'default' }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#f1f5f9" strokeWidth="0.02" />
              </pattern>
              <pattern id="gridLarge" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e2e8f0" strokeWidth="0.03" />
              </pattern>
            </defs>
            <rect className="map-bg" x={-10} y={-10} width={area.width + 20} height={area.length + 20} fill="white" onMouseDown={handleBgMouseDown} />
            <rect x="0" y="0" width={area.width} height={area.length} fill="url(#grid)" />
            <rect x="0" y="0" width={area.width} height={area.length} fill="url(#gridLarge)" />
            {/* Area border */}
            <rect x="0" y="0" width={area.width} height={area.length} fill="none" stroke="#94a3b8" strokeWidth="0.1" />
            {/* Dimension labels */}
            <text x={area.width / 2} y={-0.3} textAnchor="middle" fontSize="0.4" fill="#64748b">{area.width}m</text>
            <text x={-0.5} y={area.length / 2} textAnchor="middle" fontSize="0.4" fill="#64748b" transform={`rotate(-90, -0.5, ${area.length / 2})`}>{area.length}m</text>
            {/* Objects */}
            {area.objects.map(renderObject)}
          </svg>

          {/* Mobile add button */}
          <div className="lg:hidden absolute bottom-4 left-4">
            <MobileAddPanel area={area} addObject={addObject} />
          </div>
        </div>

        {/* Right sidebar - Properties */}
        {selectedObj && (
          <div className="hidden md:flex flex-col w-64 bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Propriedades</h3>
              <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-gray-100 rounded"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Object info */}
              <div className="text-center py-2">
                <span className="text-2xl">{getObjectIcon(selectedObj.type)}</span>
                <p className="text-sm font-medium text-gray-800 mt-1">{selectedObj.label}</p>
                <p className="text-xs text-gray-500">{objectLibrary.find(o => o.type === selectedObj.type)?.label}</p>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-600">Nome</label>
                <input type="text" value={selectedObj.label} onChange={e => updateObject(selectedObj.id, { label: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">X (m)</label>
                  <input type="number" step="0.1" value={selectedObj.x.toFixed(1)} onChange={e => updateObject(selectedObj.id, { x: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Y (m)</label>
                  <input type="number" step="0.1" value={selectedObj.y.toFixed(1)} onChange={e => updateObject(selectedObj.id, { y: Number(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Largura</label>
                  <input type="number" step="0.1" min="0.3" value={selectedObj.width.toFixed(1)} onChange={e => updateObject(selectedObj.id, { width: Math.max(0.3, Number(e.target.value)) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Altura</label>
                  <input type="number" step="0.1" min="0.3" value={selectedObj.height.toFixed(1)} onChange={e => updateObject(selectedObj.id, { height: Math.max(0.3, Number(e.target.value)) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-0.5" />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="text-xs text-gray-500">Rotação: {selectedObj.rotation}°</label>
                <input type="range" min="-180" max="180" value={selectedObj.rotation} onChange={e => updateObject(selectedObj.id, { rotation: Number(e.target.value) })}
                  className="w-full mt-1" />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs text-gray-500">Cor</label>
                <input type="color" value={selectedObj.color} onChange={e => updateObject(selectedObj.id, { color: e.target.value })}
                  className="w-full h-7 mt-1 rounded border border-gray-300" />
              </div>

              {/* Linked equipment */}
              {linkedEquipment && (
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800">Equipamento vinculado</p>
                  <p className="text-sm font-semibold text-blue-900">{linkedEquipment.name}</p>
                  <p className="text-xs text-blue-600">{linkedEquipment.code}</p>
                  {hasPendingMaintenance && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} className="text-red-500" />
                      <span className="text-xs text-red-600">Manutenção pendente</span>
                    </div>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Link to={`/equipment`} className="flex-1"><Button size="sm" variant="secondary" className="w-full text-[10px]"><Eye size={10} className="inline mr-0.5" /> Ver</Button></Link>
                  </div>
                </div>
              )}

              {/* Photos */}
              {(selectedObj.type === 'photo_point' || selectedObj.type === 'inspection_point' || selectedObj.equipmentId) && (
                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1"><Camera size={12} /> Fotos ({selectedObj.photos.length})</label>
                  <div className="mt-1 space-y-1">
                    {selectedObj.photos.map(photo => (
                      <div key={photo.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                        <img src={photo.dataUrl} alt="" className="w-8 h-8 object-cover rounded" />
                        <span className="text-xs text-gray-500 flex-1 truncate">{photo.caption || 'Sem legenda'}</span>
                        <button onClick={() => updateObject(selectedObj.id, { photos: selectedObj.photos.filter(p => p.id !== photo.id) })} className="text-red-400 hover:text-red-600">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="mt-2 flex items-center justify-center gap-1 px-2 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
                    <Upload size={12} /> Adicionar foto
                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(selectedObj.id, e)} />
                  </label>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600">Descrição</label>
                <textarea value={selectedObj.description || ''} onChange={e => updateObject(selectedObj.id, { description: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs mt-1 resize-none h-16" placeholder="Observações..." />
              </div>

              {/* Actions */}
              <div className="flex gap-1 pt-2 border-t border-gray-100">
                <Button size="sm" variant="secondary" onClick={() => duplicateObject(selectedObj.id)} className="flex-1 text-[10px]"><Copy size={10} className="inline mr-0.5" /> Duplicar</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(selectedObj.id)}><Trash2 size={12} className="text-red-500" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* General Photos Section */}
      <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1"><Image size={14} /> Fotos Gerais da Área</h3>
          <label className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs cursor-pointer hover:bg-gray-200">
            <Upload size={12} /> Adicionar
            <input type="file" accept="image/*" className="hidden" onChange={handleGeneralPhotoUpload} />
          </label>
        </div>
        {area.generalPhotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {area.generalPhotos.map(photo => (
              <div key={photo.id} className="relative shrink-0">
                <img src={photo.dataUrl} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => setArea({ ...area, generalPhotos: area.generalPhotos.filter(p => p.id !== photo.id) })}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Nenhuma foto geral adicionada</p>
        )}
      </div>

      {/* Equipment Link Modal */}
      <Modal isOpen={equipmentModal} onClose={() => setEquipmentModal(false)} title="Vincular Equipamento">
        {selectedObj && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Selecione um equipamento existente ou crie um novo.</p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Equipamento existente</label>
              <select value={selectedObj.equipmentId || ''} onChange={e => updateObject(selectedObj.id, { equipmentId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">Nenhum</option>
                {systemEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>)}
              </select>
            </div>
            <div className="text-center text-gray-400 text-sm">— ou —</div>
            <Button variant="secondary" className="w-full" onClick={() => { setEquipmentModal(false); navigate('/equipment'); }}>
              <Plus size={16} className="inline mr-1" /> Cadastrar novo equipamento
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => { if (deleteConfirm) { deleteObject(deleteConfirm); setDeleteConfirm(null); } }} title="Excluir Objeto" message="Deseja remover este objeto do mapa?" />
    </div>
  );
}

// Mobile add panel
function MobileAddPanel({ area, addObject }: { area: AreaMap; addObject: (def: ObjectDef) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Equipamentos');

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center">
        <Plus size={24} />
      </button>
      {open && (
        <div className="absolute bottom-14 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64 max-h-80 overflow-y-auto">
          <div className="flex gap-1 mb-2 overflow-x-auto">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-2 py-1 text-[10px] rounded-full whitespace-nowrap ${category === cat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {objectLibrary.filter(o => o.category === category).map(def => (
              <button key={def.type} onClick={() => { addObject(def); setOpen(false); }}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded border border-gray-200 hover:bg-blue-50">
                <span className="text-base">{def.icon}</span>
                <span className="text-[9px] text-gray-600">{def.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
