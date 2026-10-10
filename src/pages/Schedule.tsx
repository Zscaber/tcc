import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, isDateOverdue, getOverdueDaysText } from '../store';
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
  Calendar as CalendarIcon,
  CalendarRange,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  Wrench,
  AlertTriangle,
  FolderKanban,
  ClipboardList,
  FileText,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
  Layers,
  Settings,
} from 'lucide-react';
import { MaintenanceType, MaintenanceStatus } from '../types';
import { Permissions } from '../lib/permissions';

// ====================================================================
// UNIFIED SCHEDULE EVENT MODEL
// ====================================================================

export type EventCategory =
  | 'maintenance'
  | 'project'
  | 'actionPlan'
  | 'problem'
  | 'production'
  | 'quality'
  | 'equipment';

export interface ScheduleEvent {
  id: string;
  sourceModule: EventCategory;
  sourceId: string;
  title: string;
  typeName: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  endDate?: string;
  time?: string;
  equipmentId?: string;
  equipmentName?: string;
  equipmentCode?: string;
  responsibleId?: string;
  responsibleName?: string;
  status: string;
  description?: string;
  notes?: string;
  link: string;
  cost?: number;
  sector?: string;
  rawRecord: any;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Helper to format date string to PT-BR
function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Visual theme definitions for event types
const CATEGORY_THEMES: Record<
  EventCategory,
  {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeColor: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }
> = {
  maintenance: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeColor: 'blue',
    icon: Wrench,
    label: 'Manutenção',
  },
  project: {
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    badgeColor: 'purple',
    icon: FolderKanban,
    label: 'Projeto',
  },
  actionPlan: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    badgeColor: 'green',
    icon: ClipboardList,
    label: 'Plano 5W2H',
  },
  problem: {
    bg: 'bg-red-50 hover:bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    badgeBg: 'bg-red-100 text-red-800',
    badgeColor: 'red',
    icon: AlertTriangle,
    label: 'Problema',
  },
  production: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeColor: 'orange',
    icon: FileText,
    label: 'Produção',
  },
  quality: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800',
    badgeColor: 'red',
    icon: CheckCircle2,
    label: 'Qualidade',
  },
  equipment: {
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    badgeColor: 'blue',
    icon: Settings,
    label: 'Revisão de Equipamento',
  },
};

export default function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Current view state
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter state
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEquipment, setFilterEquipment] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<string>('');

  // Modals & inspect
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ScheduleEvent | null>(null);

  const canManage = Permissions.canManageSchedule(user);
  const canDelete = Permissions.canDeleteSchedule(user);

  // Form state
  const emptyForm = {
    category: 'maintenance' as EventCategory,
    maintenanceType: 'preventive' as MaintenanceType,
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    equipmentId: '',
    responsibleId: '',
    status: 'scheduled',
    description: '',
    notes: '',
    cost: 0,
    sector: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Trigger state refresh on DB updates
  const [dbTick, setDbTick] = useState(0);
  const refresh = () => setDbTick(t => t + 1);

  // Fetch all domain data from store
  const equipment = db.getEquipment();
  const people = db.getPeople();
  const maintenanceRecords = db.getMaintenanceRecords();
  const projects = db.getProjects();
  const actionPlans = db.getActionPlans();
  const problems = db.getProblems();
  const productionActivities = db.getProductionActivities();
  const nonConformities = db.getNonConformities();

  // Helper resolvers
  const getEquipmentName = (id?: string) => equipment.find(e => e.id === id)?.name || '';
  const getEquipmentCode = (id?: string) => equipment.find(e => e.id === id)?.code || '';
  const getPersonName = (id?: string) => people.find(p => p.id === id)?.name || '';

  // Extract and aggregate all events from different system modules
  const allEvents = useMemo<ScheduleEvent[]>(() => {
    const list: ScheduleEvent[] = [];

    // 1. Maintenance Records
    maintenanceRecords.forEach(m => {
      const eventDate = m.date || m.deadline;
      if (!eventDate) return;
      const typeLabels: Record<string, string> = {
        preventive: 'Manutenção Preventiva',
        corrective: 'Manutenção Corretiva',
        predictive: 'Manutenção Preditiva',
        other: 'Manutenção',
      };
      list.push({
        id: `m_${m.id}`,
        sourceModule: 'maintenance',
        sourceId: m.id,
        title: m.description,
        typeName: typeLabels[m.type] || 'Manutenção',
        category: 'maintenance',
        date: eventDate,
        endDate: m.deadline && m.deadline !== m.date ? m.deadline : undefined,
        equipmentId: m.equipmentId,
        equipmentName: getEquipmentName(m.equipmentId),
        equipmentCode: getEquipmentCode(m.equipmentId),
        responsibleId: m.responsibleId,
        responsibleName: getPersonName(m.responsibleId),
        status: m.status,
        description: m.description,
        notes: m.notes,
        cost: m.cost,
        link: '/maintenance',
        rawRecord: m,
      });
    });

    // 2. Projects (deadlines and start dates)
    projects.forEach(p => {
      if (p.deadline) {
        list.push({
          id: `p_deadline_${p.id}`,
          sourceModule: 'project',
          sourceId: p.id,
          title: `Prazo: ${p.name}`,
          typeName: 'Prazo de Projeto',
          category: 'project',
          date: p.deadline,
          endDate: p.deadline,
          responsibleId: p.responsibleId,
          responsibleName: getPersonName(p.responsibleId),
          status: p.status,
          description: p.description,
          notes: p.notes,
          sector: p.sector,
          link: `/projects/${p.id}`,
          rawRecord: p,
        });
      }
      if (p.startDate && p.startDate !== p.deadline) {
        list.push({
          id: `p_start_${p.id}`,
          sourceModule: 'project',
          sourceId: p.id,
          title: `Início: ${p.name}`,
          typeName: 'Início de Projeto',
          category: 'project',
          date: p.startDate,
          responsibleId: p.responsibleId,
          responsibleName: getPersonName(p.responsibleId),
          status: p.status,
          description: p.description,
          sector: p.sector,
          link: `/projects/${p.id}`,
          rawRecord: p,
        });
      }
    });

    // 3. Action Plans (5W2H)
    actionPlans.forEach(a => {
      if (a.when) {
        list.push({
          id: `a_${a.id}`,
          sourceModule: 'actionPlan',
          sourceId: a.id,
          title: a.what,
          typeName: 'Plano 5W2H',
          category: 'actionPlan',
          date: a.when,
          equipmentId: a.equipmentId,
          equipmentName: getEquipmentName(a.equipmentId),
          equipmentCode: getEquipmentCode(a.equipmentId),
          responsibleId: a.who && a.who.length > 0 ? a.who[0] : undefined,
          responsibleName: a.who && a.who.length > 0 ? getPersonName(a.who[0]) : '',
          status: a.status,
          description: `Por que: ${a.why} | Onde: ${a.where} | Como: ${a.how}`,
          notes: `Custo: ${a.howMuch || 'N/A'}`,
          link: '/action-plans',
          rawRecord: a,
        });
      }
    });

    // 4. Identified Problems
    problems.forEach(pr => {
      if (pr.identificationDate) {
        list.push({
          id: `pr_${pr.id}`,
          sourceModule: 'problem',
          sourceId: pr.id,
          title: pr.title,
          typeName: 'Problema Identificado',
          category: 'problem',
          date: pr.identificationDate,
          equipmentId: pr.equipmentId,
          equipmentName: getEquipmentName(pr.equipmentId),
          equipmentCode: getEquipmentCode(pr.equipmentId),
          responsibleId: pr.responsibleId,
          responsibleName: getPersonName(pr.responsibleId),
          status: pr.status,
          description: pr.description,
          sector: pr.sector,
          notes: pr.notes,
          link: '/problems',
          rawRecord: pr,
        });
      }
    });

    // 5. Production Activities
    productionActivities.forEach(pa => {
      if (pa.deadline) {
        list.push({
          id: `pa_${pa.id}`,
          sourceModule: 'production',
          sourceId: pa.id,
          title: pa.title,
          typeName: 'Atividade de Produção',
          category: 'production',
          date: pa.deadline,
          equipmentId: pa.equipmentId,
          equipmentName: getEquipmentName(pa.equipmentId),
          equipmentCode: getEquipmentCode(pa.equipmentId),
          responsibleId: pa.responsibleId,
          responsibleName: getPersonName(pa.responsibleId),
          status: pa.status,
          description: pa.description,
          sector: pa.sector,
          notes: pa.notes,
          link: '/production',
          rawRecord: pa,
        });
      }
    });

    // 6. Quality Non-Conformities
    nonConformities.forEach(nc => {
      if (nc.identificationDate) {
        list.push({
          id: `nc_${nc.id}`,
          sourceModule: 'quality',
          sourceId: nc.id,
          title: nc.title,
          typeName: 'Não Conformidade',
          category: 'quality',
          date: nc.identificationDate,
          equipmentId: nc.equipmentId,
          equipmentName: getEquipmentName(nc.equipmentId),
          equipmentCode: getEquipmentCode(nc.equipmentId),
          responsibleId: nc.responsibleId,
          responsibleName: getPersonName(nc.responsibleId),
          status: nc.status,
          description: nc.description,
          notes: `Causa: ${nc.cause || 'N/A'}`,
          link: '/quality',
          rawRecord: nc,
        });
      }
    });

    // 7. Equipment Next Maintenance (preventive review forecast)
    equipment.forEach(eq => {
      if (eq.nextMaintenance) {
        // avoid duplicating if already in maintenance records on same date
        const hasExisting = maintenanceRecords.some(
          m => m.equipmentId === eq.id && (m.date === eq.nextMaintenance || m.deadline === eq.nextMaintenance)
        );
        if (!hasExisting) {
          list.push({
            id: `eq_${eq.id}`,
            sourceModule: 'equipment',
            sourceId: eq.id,
            title: `Revisão Preventiva: ${eq.name}`,
            typeName: 'Revisão Programada',
            category: 'equipment',
            date: eq.nextMaintenance,
            equipmentId: eq.id,
            equipmentName: eq.name,
            equipmentCode: eq.code,
            responsibleId: eq.responsibleId,
            responsibleName: getPersonName(eq.responsibleId),
            status: 'scheduled',
            description: `Revisão periódica programada para o equipamento ${eq.name} (${eq.code})`,
            sector: eq.sector,
            notes: `Local: ${eq.location || 'N/A'} | Última Manutenção: ${eq.lastMaintenance || 'N/A'}`,
            link: '/equipment',
            rawRecord: eq,
          });
        }
      }
    });

    return list;
  }, [
    maintenanceRecords,
    projects,
    actionPlans,
    problems,
    productionActivities,
    nonConformities,
    equipment,
    people,
    dbTick,
  ]);

  // Apply search and dropdown filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const matchSearch =
        !search ||
        ev.title.toLowerCase().includes(search.toLowerCase()) ||
        (ev.equipmentName && ev.equipmentName.toLowerCase().includes(search.toLowerCase())) ||
        (ev.responsibleName && ev.responsibleName.toLowerCase().includes(search.toLowerCase())) ||
        (ev.typeName && ev.typeName.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = !filterCategory || ev.category === filterCategory;
      const matchStatus = !filterStatus || ev.status === filterStatus;
      const matchEquipment = !filterEquipment || ev.equipmentId === filterEquipment;
      const matchResponsible = !filterResponsible || ev.responsibleId === filterResponsible;

      return matchSearch && matchCategory && matchStatus && matchEquipment && matchResponsible;
    });
  }, [allEvents, search, filterCategory, filterStatus, filterEquipment, filterResponsible]);

  // Date Navigation Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // ====================================================================
  // CALENDAR GRID COMPUTATION (MONTH VIEW)
  // ====================================================================

  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as first day of week: (day + 6) % 7
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const days: {
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: ScheduleEvent[];
    }[] = [];

    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date === dStr),
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date === dStr),
      });
    }

    // Fill remaining days of the last week
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date === dStr),
      });
    }

    return days;
  }, [year, month, filteredEvents, todayStr]);

  // ====================================================================
  // WEEK VIEW COMPUTATION
  // ====================================================================

  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const dayOfWeek = (current.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const days: {
      date: Date;
      dateStr: string;
      weekdayName: string;
      isToday: boolean;
      events: ScheduleEvent[];
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: dStr,
        weekdayName: WEEKDAY_NAMES[i],
        isToday: dStr === todayStr,
        events: filteredEvents.filter(e => e.date === dStr),
      });
    }

    return days;
  }, [currentDate, filteredEvents, todayStr]);

  // Period label for header
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[month]} de ${year}`;
    }
    if (viewMode === 'week') {
      const first = weekDays[0]?.date;
      const last = weekDays[6]?.date;
      if (first && last) {
        return `${first.getDate()} de ${MONTH_NAMES[first.getMonth()]} — ${last.getDate()} de ${MONTH_NAMES[last.getMonth()]} de ${last.getFullYear()}`;
      }
    }
    return `${MONTH_NAMES[month]} de ${year}`;
  }, [viewMode, month, year, weekDays]);

  // ====================================================================
  // CREATE / EDIT / DELETE ACTIONS
  // ====================================================================

  const handleOpenCreate = (prefillDate?: string) => {
    setEditingEvent(null);
    setForm({
      ...emptyForm,
      date: prefillDate || new Date().toISOString().split('T')[0],
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    if (ev.sourceModule === 'maintenance') {
      const m = ev.rawRecord;
      setForm({
        category: 'maintenance',
        maintenanceType: m.type || 'preventive',
        title: m.description,
        date: m.date || m.deadline || '',
        time: '',
        equipmentId: m.equipmentId || '',
        responsibleId: m.responsibleId || '',
        status: m.status || 'scheduled',
        description: m.description || '',
        notes: m.notes || '',
        cost: m.cost || 0,
        sector: '',
      });
    } else if (ev.sourceModule === 'production') {
      const p = ev.rawRecord;
      setForm({
        category: 'production',
        maintenanceType: 'preventive',
        title: p.title,
        date: p.deadline || '',
        time: '',
        equipmentId: p.equipmentId || '',
        responsibleId: p.responsibleId || '',
        status: p.status || 'pending',
        description: p.description || '',
        notes: p.notes || '',
        cost: 0,
        sector: p.sector || '',
      });
    } else if (ev.sourceModule === 'actionPlan') {
      const a = ev.rawRecord;
      setForm({
        category: 'actionPlan',
        maintenanceType: 'preventive',
        title: a.what,
        date: a.when || '',
        time: '',
        equipmentId: a.equipmentId || '',
        responsibleId: a.who && a.who[0] ? a.who[0] : '',
        status: a.status || 'pending',
        description: a.why || '',
        notes: a.how || '',
        cost: 0,
        sector: '',
      });
    } else {
      // Generic fallback
      setForm({
        category: ev.category,
        maintenanceType: 'preventive',
        title: ev.title,
        date: ev.date,
        time: ev.time || '',
        equipmentId: ev.equipmentId || '',
        responsibleId: ev.responsibleId || '',
        status: ev.status,
        description: ev.description || '',
        notes: ev.notes || '',
        cost: ev.cost || 0,
        sector: ev.sector || '',
      });
    }
    setIsDetailOpen(false);
    setIsCreateOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      showToast('error', 'Informe o título ou descrição do agendamento');
      return;
    }
    if (!form.date) {
      showToast('error', 'Informe a data');
      return;
    }

    if (editingEvent) {
      // UPDATE EXISTING
      if (editingEvent.sourceModule === 'maintenance') {
        db.updateMaintenanceRecord(editingEvent.sourceId, {
          equipmentId: form.equipmentId,
          type: form.maintenanceType,
          description: form.title,
          responsibleId: form.responsibleId,
          date: form.date,
          deadline: form.date,
          status: form.status as MaintenanceStatus,
          notes: form.notes,
          cost: Number(form.cost) || 0,
        });
        db.addHistory({
          userId: user?.id || 'system',
          action: 'Manutenção atualizada no Cronograma',
          entity: 'maintenance',
          entityId: editingEvent.sourceId,
          details: form.title,
        });
        showToast('success', 'Manutenção atualizada com sucesso');
      } else if (editingEvent.sourceModule === 'production') {
        db.updateProductionActivity(editingEvent.sourceId, {
          title: form.title,
          description: form.description || form.title,
          equipmentId: form.equipmentId,
          responsibleId: form.responsibleId,
          deadline: form.date,
          status: form.status as any,
          sector: form.sector,
          notes: form.notes,
        });
        db.addHistory({
          userId: user?.id || 'system',
          action: 'Atividade de produção atualizada no Cronograma',
          entity: 'production',
          entityId: editingEvent.sourceId,
          details: form.title,
        });
        showToast('success', 'Atividade atualizada com sucesso');
      } else if (editingEvent.sourceModule === 'actionPlan') {
        db.updateActionPlan(editingEvent.sourceId, {
          what: form.title,
          when: form.date,
          equipmentId: form.equipmentId,
          who: form.responsibleId ? [form.responsibleId] : [],
          status: form.status as any,
        });
        showToast('success', 'Plano 5W2H atualizado com sucesso');
      } else {
        showToast('info', 'Registro atualizado.');
      }
    } else {
      // CREATE NEW
      if (form.category === 'maintenance') {
        if (!form.equipmentId) {
          showToast('error', 'Selecione um equipamento para a manutenção');
          return;
        }
        db.createMaintenanceRecord({
          equipmentId: form.equipmentId,
          type: form.maintenanceType,
          description: form.title,
          responsibleId: form.responsibleId,
          date: form.date,
          deadline: form.date,
          status: (form.status as MaintenanceStatus) || 'scheduled',
          notes: form.notes,
          cost: Number(form.cost) || 0,
        });
        db.addHistory({
          userId: user?.id || 'system',
          action: 'Agendamento de manutenção criado no Cronograma',
          entity: 'maintenance',
          entityId: 'new',
          details: form.title,
        });
        showToast('success', 'Manutenção agendada com sucesso');
      } else if (form.category === 'production') {
        db.createProductionActivity({
          title: form.title,
          description: form.description || form.title,
          projectId: '',
          equipmentId: form.equipmentId,
          sector: form.sector || 'Geral',
          responsibleId: form.responsibleId,
          deadline: form.date,
          status: (form.status as any) || 'pending',
          notes: form.notes,
        });
        db.addHistory({
          userId: user?.id || 'system',
          action: 'Atividade de produção agendada no Cronograma',
          entity: 'production',
          entityId: 'new',
          details: form.title,
        });
        showToast('success', 'Atividade de produção agendada');
      } else if (form.category === 'actionPlan') {
        db.createActionPlan({
          what: form.title,
          why: form.description || 'Definido no cronograma',
          where: form.sector || '',
          when: form.date,
          who: form.responsibleId ? [form.responsibleId] : [],
          how: form.notes || '',
          howMuch: form.cost ? `R$ ${form.cost}` : '',
          problemId: '',
          equipmentId: form.equipmentId,
          projectId: '',
          status: (form.status as any) || 'pending',
        });
        showToast('success', 'Plano 5W2H registrado');
      } else {
        // Default to preventive maintenance
        db.createMaintenanceRecord({
          equipmentId: form.equipmentId || equipment[0]?.id || '',
          type: 'preventive',
          description: form.title,
          responsibleId: form.responsibleId,
          date: form.date,
          deadline: form.date,
          status: 'scheduled',
          notes: form.notes,
          cost: Number(form.cost) || 0,
        });
        showToast('success', 'Agendamento registrado');
      }
    }

    setIsCreateOpen(false);
    refresh();
  };

  const handleDelete = (ev: ScheduleEvent) => {
    if (ev.sourceModule === 'maintenance') {
      db.deleteMaintenanceRecord(ev.sourceId);
      db.addHistory({
        userId: user?.id || 'system',
        action: 'Manutenção excluída pelo Cronograma',
        entity: 'maintenance',
        entityId: ev.sourceId,
        details: ev.title,
      });
      showToast('success', 'Manutenção excluída');
    } else if (ev.sourceModule === 'production') {
      db.deleteProductionActivity(ev.sourceId);
      showToast('success', 'Atividade excluída');
    } else if (ev.sourceModule === 'actionPlan') {
      db.deleteActionPlan(ev.sourceId);
      showToast('success', 'Plano 5W2H excluído');
    } else if (ev.sourceModule === 'problem') {
      db.deleteProblem(ev.sourceId);
      showToast('success', 'Problema excluído');
    } else if (ev.sourceModule === 'quality') {
      db.deleteNonConformity(ev.sourceId);
      showToast('success', 'Registro excluído');
    }

    setIsDetailOpen(false);
    setDeleteConfirm(null);
    refresh();
  };

  const handleEventClick = (ev: ScheduleEvent) => {
    setSelectedEvent(ev);
    setIsDetailOpen(true);
  };

  // ====================================================================
  // SUMMARY METRICS FOR CURRENT PERIOD
  // ====================================================================

  const periodStats = useMemo(() => {
    const total = filteredEvents.length;
    const maintenanceCount = filteredEvents.filter(e => e.category === 'maintenance').length;
    const completedCount = filteredEvents.filter(
      e => e.status === 'completed' || e.status === 'resolved'
    ).length;
    const overdueCount = filteredEvents.filter(e =>
      isDateOverdue(e.date, e.status)
    ).length;

    return { total, maintenanceCount, completedCount, overdueCount };
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Cronograma Geral"
        subtitle="Agenda integrada de manutenções, prazos de projetos, planos 5W2H e atividades industriais"
        actions={
          canManage ? (
            <Button onClick={() => handleOpenCreate()}>
              <Plus size={16} className="inline mr-1" /> Novo Agendamento
            </Button>
          ) : undefined
        }
      />

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase">Total de Eventos</p>
              <p className="text-xl font-bold text-gray-800">{periodStats.total}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CalendarIcon size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase">Manutenções</p>
              <p className="text-xl font-bold text-gray-800">{periodStats.maintenanceCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <Wrench size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase">Concluídos</p>
              <p className="text-xl font-bold text-gray-800">{periodStats.completedCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircle size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase">Atrasados</p>
              <p className="text-xl font-bold text-red-600">{periodStats.overdueCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* TOOLBAR: NAVIGATION, VIEW SELECTOR & FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* TOP ROW: DATE NAVIGATION + VIEW MODE BUTTONS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              title="Período Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              title="Próximo Período"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Hoje
            </button>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 ml-2 capitalize">
              {periodLabel}
            </h2>
          </div>

          {/* View mode toggle (Month / Week / List) */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-blue-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarIcon size={14} /> Mês
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-blue-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarRange size={14} /> Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <List size={14} /> Lista
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: SEARCH & FILTER SELECTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título, equipamento ou responsável..."
            />
          </div>

          <Select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs"
          >
            <option value="">Todos os tipos</option>
            <option value="maintenance">Manutenções</option>
            <option value="project">Projetos</option>
            <option value="actionPlan">Planos 5W2H</option>
            <option value="problem">Problemas</option>
            <option value="production">Produção</option>
            <option value="quality">Qualidade</option>
            <option value="equipment">Revisões Preventivas</option>
          </Select>

          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs"
          >
            <option value="">Todos os status</option>
            <option value="scheduled">Programado / Planejamento</option>
            <option value="in_progress">Em Andamento / Tratamento</option>
            <option value="completed">Concluído / Resolvido</option>
            <option value="overdue">Atrasado</option>
            <option value="pending">Pendente</option>
            <option value="cancelled">Cancelado</option>
          </Select>

          <Select
            value={filterEquipment}
            onChange={e => setFilterEquipment(e.target.value)}
            className="text-xs"
          >
            <option value="">Todos os equipamentos</option>
            {equipment.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.code})
              </option>
            ))}
          </Select>
        </div>

        {/* CATEGORY LEGEND BAR */}
        <div className="flex items-center gap-2 pt-2 overflow-x-auto text-[11px] text-gray-600 border-t border-gray-100 flex-wrap">
          <span className="font-semibold text-gray-500 mr-1 flex items-center gap-1">
            <Filter size={12} /> Legenda:
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
            <Wrench size={11} /> Manutenção
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">
            <FolderKanban size={11} /> Projeto
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
            <ClipboardList size={11} /> Plano 5W2H
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
            <FileText size={11} /> Produção
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium">
            <CheckCircle2 size={11} /> Qualidade
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">
            <AlertTriangle size={11} /> Problema
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. MONTH VIEW (DEFAULT) */}
      {/* ==================================================================== */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center text-xs font-bold text-gray-600">
            {WEEKDAY_SHORT.map((w, idx) => (
              <div key={w} className="py-2.5 border-r border-gray-200 last:border-r-0">
                <span className="hidden sm:inline">{WEEKDAY_NAMES[idx]}</span>
                <span className="sm:hidden">{w}</span>
              </div>
            ))}
          </div>

          {/* Month day cells grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-y divide-gray-200">
            {monthGridDays.map((cell, idx) => {
              const dayNum = cell.date.getDate();
              const hasEvents = cell.events.length > 0;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 border-r border-gray-200 last:border-r-0 flex flex-col justify-between transition-colors relative group ${
                    !cell.isCurrentMonth
                      ? 'bg-gray-50/60 text-gray-400'
                      : cell.isToday
                      ? 'bg-blue-50/40'
                      : 'bg-white hover:bg-gray-50/80'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? 'bg-blue-600 text-white shadow-sm'
                          : cell.isCurrentMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Quick Add Button on Day Cell */}
                    {canManage && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenCreate(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title={`Agendar para ${formatDateBR(cell.dateStr)}`}
                      >
                        <Plus size={13} />
                      </button>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] sm:max-h-[105px] pr-0.5">
                    {cell.events.slice(0, 3).map(ev => {
                      const theme = CATEGORY_THEMES[ev.category] || CATEGORY_THEMES.maintenance;
                      const Icon = theme.icon;
                      const isOverdue = isDateOverdue(ev.date, ev.status);

                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleEventClick(ev)}
                          className={`px-1.5 py-1 rounded text-[10px] sm:text-xs font-medium border cursor-pointer truncate flex items-center gap-1 shadow-2xs transition-transform hover:scale-[1.02] ${
                            isOverdue
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : `${theme.bg} ${theme.text} ${theme.border}`
                          }`}
                          title={`${ev.typeName}: ${ev.title} (${ev.equipmentName || ev.responsibleName || ''})`}
                        >
                          <Icon size={12} className="shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {cell.events.length > 3 && (
                      <button
                        onClick={() => {
                          setCurrentDate(cell.date);
                          setViewMode('list');
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline block text-center w-full pt-0.5"
                      >
                        +{cell.events.length - 3} mais
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. WEEK VIEW */}
      {/* ==================================================================== */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {weekDays.map(day => {
              const hasEvents = day.events.length > 0;

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[400px] flex flex-col p-3 ${
                    day.isToday ? 'bg-blue-50/30' : 'bg-white'
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`pb-2.5 mb-3 border-b flex items-center justify-between ${
                      day.isToday ? 'border-blue-300' : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {day.weekdayName}
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          day.isToday ? 'text-blue-600' : 'text-gray-800'
                        }`}
                      >
                        {day.date.getDate()}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          {MONTH_NAMES[day.date.getMonth()].slice(0, 3)}
                        </span>
                      </p>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => handleOpenCreate(day.dateStr)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Novo evento neste dia"
                      >
                        <Plus size={15} />
                      </button>
                    )}
                  </div>

                  {/* Events column list */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {!hasEvents ? (
                      <p className="text-[11px] text-gray-400 italic text-center py-8">
                        Sem agendamentos
                      </p>
                    ) : (
                      day.events.map(ev => {
                        const theme = CATEGORY_THEMES[ev.category] || CATEGORY_THEMES.maintenance;
                        const Icon = theme.icon;
                        const isOverdue = isDateOverdue(ev.date, ev.status);

                        return (
                          <div
                            key={ev.id}
                            onClick={() => handleEventClick(ev)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer shadow-2xs hover:shadow transition-all space-y-1 ${
                              isOverdue
                                ? 'bg-red-50 border-red-300 text-red-900'
                                : `${theme.bg} ${theme.border} ${theme.text}`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.badgeBg}`}
                              >
                                {ev.typeName}
                              </span>
                              <StatusBadge status={isOverdue ? 'overdue' : ev.status} />
                            </div>

                            <h4 className="font-bold text-gray-800 text-xs leading-snug line-clamp-2">
                              {ev.title}
                            </h4>

                            {ev.equipmentName && (
                              <p className="text-[11px] text-gray-600 flex items-center gap-1 truncate">
                                <Wrench size={11} className="shrink-0 text-gray-400" />
                                {ev.equipmentName}
                              </p>
                            )}

                            {ev.responsibleName && (
                              <p className="text-[11px] text-gray-600 flex items-center gap-1 truncate">
                                <User size={11} className="shrink-0 text-gray-400" />
                                {ev.responsibleName}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. LIST VIEW */}
      {/* ==================================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={48} />}
              title="Nenhum evento encontrado"
              description="Não existem eventos cadastrados para os filtros selecionados."
              action={
                canManage ? (
                  <Button onClick={() => handleOpenCreate()}>
                    <Plus size={16} className="inline mr-1" /> Criar Primeiro Agendamento
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filteredEvents
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(ev => {
                const theme = CATEGORY_THEMES[ev.category] || CATEGORY_THEMES.maintenance;
                const Icon = theme.icon;
                const isOverdue = isDateOverdue(ev.date, ev.status);
                const overdueText = getOverdueDaysText(ev.date);

                return (
                  <Card
                    key={ev.id}
                    onClick={() => handleEventClick(ev)}
                    className="p-4 hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isOverdue
                              ? 'bg-red-100 text-red-700'
                              : `${theme.badgeBg}`
                          }`}
                        >
                          <Icon size={20} />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${theme.badgeBg}`}
                            >
                              {ev.typeName}
                            </span>
                            <StatusBadge status={isOverdue ? 'overdue' : ev.status} />
                            {isOverdue && (
                              <span className="text-xs text-red-600 font-semibold">
                                ({overdueText})
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-gray-800 text-sm">{ev.title}</h3>

                          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <CalendarIcon size={13} className="text-blue-600" />
                              {formatDateBR(ev.date)}
                            </span>

                            {ev.equipmentName && (
                              <span className="flex items-center gap-1">
                                <Wrench size={13} />
                                {ev.equipmentName}{' '}
                                {ev.equipmentCode && `(${ev.equipmentCode})`}
                              </span>
                            )}

                            {ev.responsibleName && (
                              <span className="flex items-center gap-1">
                                <User size={13} />
                                {ev.responsibleName}
                              </span>
                            )}

                            {ev.cost !== undefined && ev.cost > 0 && (
                              <span className="font-semibold text-gray-700">
                                R$ {ev.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right action icons */}
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEventClick(ev);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                          title="Ver Detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEdit(ev);
                            }}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirm(ev);
                            }}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EVENT DETAIL MODAL */}
      {/* ==================================================================== */}
      {selectedEvent && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title="Detalhes do Agendamento"
          size="md"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      CATEGORY_THEMES[selectedEvent.category]?.badgeBg || 'bg-gray-100'
                    }`}
                  >
                    {selectedEvent.typeName}
                  </span>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{selectedEvent.title}</h3>
              </div>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-xs text-gray-500 font-medium">Data Agendada</p>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <CalendarIcon size={15} className="text-blue-600" />
                  {formatDateBR(selectedEvent.date)}
                </p>
              </div>

              {selectedEvent.endDate && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Prazo Final</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Clock size={15} className="text-orange-600" />
                    {formatDateBR(selectedEvent.endDate)}
                  </p>
                </div>
              )}

              {selectedEvent.equipmentName && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Equipamento</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <Wrench size={15} className="text-blue-600" />
                    {selectedEvent.equipmentName}
                    {selectedEvent.equipmentCode && (
                      <span className="font-mono text-xs text-gray-500">
                        ({selectedEvent.equipmentCode})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {selectedEvent.responsibleName && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Responsável</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                    <User size={15} className="text-gray-600" />
                    {selectedEvent.responsibleName}
                  </p>
                </div>
              )}

              {selectedEvent.cost !== undefined && selectedEvent.cost > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Custo Estimado</p>
                  <p className="font-semibold text-green-700">
                    R$ {selectedEvent.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {selectedEvent.sector && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Setor</p>
                  <p className="font-semibold text-gray-800">{selectedEvent.sector}</p>
                </div>
              )}
            </div>

            {/* Description / Notes */}
            {selectedEvent.description && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-xs text-gray-500 font-medium">Descrição</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {selectedEvent.notes && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1">
                <p className="text-xs text-blue-700 font-medium">Observações / Detalhes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEvent.notes}</p>
              </div>
            )}

            {/* Bottom action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    navigate(selectedEvent.link);
                  }}
                >
                  <ExternalLink size={14} className="inline mr-1" /> Acessar Módulo Original
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {canManage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(selectedEvent)}
                  >
                    <Edit2 size={14} className="inline mr-1" /> Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setDeleteConfirm(selectedEvent);
                    }}
                  >
                    <Trash2 size={14} className="inline mr-1" /> Excluir
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* CREATE / EDIT AGENDAMENTO MODAL */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingEvent ? 'Editar Agendamento' : 'Novo Agendamento no Cronograma'}
        size="md"
      >
        <div className="space-y-4">
          {/* Category selection (only on create) */}
          {!editingEvent && (
            <Select
              label="Tipo de Atividade / Registro *"
              value={form.category}
              onChange={e =>
                setForm({
                  ...form,
                  category: e.target.value as EventCategory,
                })
              }
            >
              <option value="maintenance">Manutenção de Equipamento</option>
              <option value="production">Atividade de Produção</option>
              <option value="actionPlan">Plano de Ação (5W2H)</option>
            </Select>
          )}

          {/* If Maintenance, pick sub-type */}
          {form.category === 'maintenance' && (
            <Select
              label="Tipo de Manutenção *"
              value={form.maintenanceType}
              onChange={e =>
                setForm({
                  ...form,
                  maintenanceType: e.target.value as MaintenanceType,
                })
              }
            >
              <option value="preventive">Manutenção Preventiva</option>
              <option value="corrective">Manutenção Corretiva</option>
              <option value="predictive">Manutenção Preditiva</option>
              <option value="other">Outro Serviço</option>
            </Select>
          )}

          {/* Title / Description */}
          <Input
            label="Título / Descrição do Agendamento *"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Ex: Troca de rolamentos, Calibração, Revisão semestral..."
          />

          {/* Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data Prevista *"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />

            <Select
              label="Status *"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="scheduled">Programado</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </div>

          {/* Equipment & Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={form.category === 'maintenance' ? 'Equipamento *' : 'Equipamento (opcional)'}
              value={form.equipmentId}
              onChange={e => setForm({ ...form, equipmentId: e.target.value })}
            >
              <option value="">Selecione o equipamento...</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.code})
                </option>
              ))}
            </Select>

            <Select
              label="Responsável"
              value={form.responsibleId}
              onChange={e => setForm({ ...form, responsibleId: e.target.value })}
            >
              <option value="">Selecione o responsável...</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.position ? `(${p.position})` : ''}
                </option>
              ))}
            </Select>
          </div>

          {/* Optional Cost for maintenance */}
          {form.category === 'maintenance' && (
            <Input
              label="Custo Estimado (R$)"
              type="number"
              value={form.cost || ''}
              onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
          )}

          {/* Notes / Details */}
          <Textarea
            label="Observações / Instruções"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Detalhes adicionais, ferramentas necessárias, peças de reposição..."
            rows={3}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingEvent ? 'Salvar Alterações' : 'Salvar Agendamento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* CONFIRM DELETE DIALOG */}
      {/* ==================================================================== */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Excluir Agendamento"
        message={`Tem certeza que deseja excluir o agendamento "${deleteConfirm?.title}"? Esta ação removerá o registro correspondente.`}
      />
    </div>
  );
}
