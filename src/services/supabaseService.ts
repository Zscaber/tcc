import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AppState, User, Person, Project, Equipment, Problem,
  GutAnalysis, ActionPlan, MaintenanceRecord, ProductionActivity,
  NonConformity, Notification, HistoryEntry, Layout
} from '../types';

// ====================================================================
// MAPPERS: CONVERSÃO DE DADOS (CamelCase <-> Snake_Case)
// ====================================================================

export const mappers = {
  // Profiles / Users
  profileToUser: (p: any): User => ({
    id: p.id,
    name: p.name || '',
    email: p.email || '',
    passwordHash: '',
    role: p.role || 'employee',
    createdAt: p.created_at || new Date().toISOString(),
  }),
  userToProfile: (u: User) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  }),

  // People
  personFromDB: (p: any): Person => ({
    id: p.id,
    name: p.name,
    position: p.position || '',
    email: p.email || '',
    createdAt: p.created_at || new Date().toISOString(),
  }),
  personToDB: (p: Person) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    email: p.email,
    created_at: p.createdAt,
  }),

  // Projects
  projectFromDB: (p: any): Project => ({
    id: p.id,
    name: p.name,
    code: p.code || '',
    description: p.description || '',
    sector: p.sector || '',
    responsibleId: p.responsible_id || '',
    teamIds: p.team_ids || [],
    startDate: p.start_date || '',
    deadline: p.deadline || '',
    status: p.status || 'planning',
    notes: p.notes || '',
    createdAt: p.created_at || new Date().toISOString(),
  }),
  projectToDB: (p: Project) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    sector: p.sector,
    responsible_id: p.responsibleId,
    team_ids: p.teamIds,
    start_date: p.startDate,
    deadline: p.deadline,
    status: p.status,
    notes: p.notes,
    created_at: p.createdAt,
  }),

  // Equipment
  equipmentFromDB: (e: any): Equipment => ({
    id: e.id,
    name: e.name,
    code: e.code || '',
    type: e.type || '',
    manufacturer: e.manufacturer || '',
    model: e.model || '',
    serialNumber: e.serial_number || '',
    sector: e.sector || '',
    location: e.location || '',
    responsibleId: e.responsible_id || '',
    status: e.status || 'operating',
    criticality: e.criticality || 'media',
    acquisitionDate: e.acquisition_date || '',
    lastMaintenance: e.last_maintenance || '',
    nextMaintenance: e.next_maintenance || '',
    notes: e.notes || '',
    createdAt: e.created_at || new Date().toISOString(),
  }),
  equipmentToDB: (e: Equipment) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    type: e.type,
    manufacturer: e.manufacturer,
    model: e.model,
    serial_number: e.serialNumber,
    sector: e.sector,
    location: e.location,
    responsible_id: e.responsibleId,
    status: e.status,
    criticality: e.criticality,
    acquisition_date: e.acquisitionDate,
    last_maintenance: e.lastMaintenance,
    next_maintenance: e.nextMaintenance,
    notes: e.notes,
    created_at: e.createdAt,
  }),

  // Problems
  problemFromDB: (p: any): Problem => ({
    id: p.id,
    title: p.title,
    description: p.description || '',
    category: p.category || 'maintenance',
    projectId: p.project_id || '',
    equipmentId: p.equipment_id || '',
    sector: p.sector || '',
    responsibleId: p.responsible_id || '',
    identificationDate: p.identification_date || '',
    status: p.status || 'identified',
    notes: p.notes || '',
    createdAt: p.created_at || new Date().toISOString(),
  }),
  problemToDB: (p: Problem) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    project_id: p.projectId || null,
    equipment_id: p.equipmentId || null,
    sector: p.sector,
    responsible_id: p.responsibleId || null,
    identification_date: p.identificationDate,
    status: p.status,
    notes: p.notes,
    created_at: p.createdAt,
  }),

  // GUT
  gutFromDB: (g: any): GutAnalysis => ({
    id: g.id,
    problemId: g.problem_id,
    gravity: g.gravity,
    urgency: g.urgency,
    tendency: g.tendency,
    score: g.score,
    classification: g.classification,
    createdAt: g.created_at || new Date().toISOString(),
  }),
  gutToDB: (g: GutAnalysis) => ({
    id: g.id,
    problem_id: g.problemId,
    gravity: g.gravity,
    urgency: g.urgency,
    tendency: g.tendency,
    score: g.score,
    classification: g.classification,
    created_at: g.createdAt,
  }),

  // Action Plans
  actionPlanFromDB: (a: any): ActionPlan => ({
    id: a.id,
    what: a.what,
    why: a.why || '',
    where: a.where_loc || '',
    when: a.when_date || '',
    who: a.who || [],
    how: a.how || '',
    howMuch: a.how_much || '',
    problemId: a.problem_id || '',
    equipmentId: a.equipment_id || '',
    projectId: a.project_id || '',
    status: a.status || 'pending',
    createdAt: a.created_at || new Date().toISOString(),
  }),
  actionPlanToDB: (a: ActionPlan) => ({
    id: a.id,
    what: a.what,
    why: a.why,
    where_loc: a.where,
    when_date: a.when,
    who: a.who,
    how: a.how,
    how_much: a.howMuch,
    problem_id: a.problemId || null,
    equipment_id: a.equipmentId || null,
    project_id: a.projectId || null,
    status: a.status,
    created_at: a.createdAt,
  }),

  // Maintenance Records
  maintenanceFromDB: (m: any): MaintenanceRecord => ({
    id: m.id,
    equipmentId: m.equipment_id,
    problemId: m.problem_id || '',
    actionPlanId: m.action_plan_id || '',
    type: m.type || 'preventive',
    description: m.description,
    responsibleId: m.responsible_id || '',
    date: m.date || '',
    deadline: m.deadline || '',
    status: m.status || 'scheduled',
    notes: m.notes || '',
    cost: Number(m.cost) || 0,
    createdAt: m.created_at || new Date().toISOString(),
  }),
  maintenanceToDB: (m: MaintenanceRecord) => ({
    id: m.id,
    equipment_id: m.equipmentId,
    problem_id: m.problemId || null,
    action_plan_id: m.actionPlanId || null,
    type: m.type,
    description: m.description,
    responsible_id: m.responsibleId || null,
    date: m.date,
    deadline: m.deadline,
    status: m.status,
    notes: m.notes,
    cost: m.cost,
    created_at: m.createdAt,
  }),

  // Production Activities
  productionFromDB: (p: any): ProductionActivity => ({
    id: p.id,
    title: p.title,
    description: p.description || '',
    projectId: p.project_id || '',
    equipmentId: p.equipment_id || '',
    sector: p.sector || '',
    responsibleId: p.responsible_id || '',
    deadline: p.deadline || '',
    status: p.status || 'pending',
    notes: p.notes || '',
    createdAt: p.created_at || new Date().toISOString(),
  }),
  productionToDB: (p: ProductionActivity) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    project_id: p.projectId || null,
    equipment_id: p.equipmentId || null,
    sector: p.sector,
    responsible_id: p.responsibleId || null,
    deadline: p.deadline,
    status: p.status,
    notes: p.notes,
    created_at: p.createdAt,
  }),

  // Non-Conformities
  nonConformityFromDB: (n: any): NonConformity => ({
    id: n.id,
    title: n.title,
    description: n.description || '',
    cause: n.cause || '',
    responsibleId: n.responsible_id || '',
    projectId: n.project_id || '',
    equipmentId: n.equipment_id || '',
    sector: n.sector || '',
    severity: n.severity || 'media',
    problemId: n.problem_id || '',
    actionPlanId: n.action_plan_id || '',
    status: n.status || 'identified',
    evidence: n.evidence || '',
    identificationDate: n.identification_date || '',
    createdAt: n.created_at || new Date().toISOString(),
  }),
  nonConformityToDB: (n: NonConformity) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    cause: n.cause,
    responsible_id: n.responsibleId || null,
    project_id: n.projectId || null,
    equipment_id: n.equipmentId || null,
    sector: n.sector,
    severity: n.severity,
    problem_id: n.problemId || null,
    action_plan_id: n.actionPlanId || null,
    status: n.status,
    evidence: n.evidence,
    identification_date: n.identificationDate,
    created_at: n.createdAt,
  }),

  // Layouts
  layoutFromDB: (l: any): Layout => ({
    id: l.id,
    projectId: l.project_id || undefined,
    name: l.name,
    description: l.description || '',
    widthMeters: Number(l.width_meters) || 20,
    lengthMeters: Number(l.length_meters) || 15,
    backgroundImage: l.background_image || undefined,
    generalPhotos: l.general_photos || [],
    elements: l.elements || [],
    createdAt: l.created_at || new Date().toISOString(),
  }),
  layoutToDB: (l: Layout) => ({
    id: l.id,
    project_id: l.projectId || null,
    name: l.name,
    description: l.description,
    width_meters: l.widthMeters,
    length_meters: l.lengthMeters,
    background_image: l.backgroundImage,
    general_photos: l.generalPhotos,
    elements: l.elements,
    created_at: l.createdAt,
  }),

  // Notifications
  notificationFromDB: (n: any): Notification => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    message: n.message || '',
    type: n.type || 'info',
    read: Boolean(n.read),
    relatedEntity: n.related_entity || undefined,
    relatedId: n.related_id || undefined,
    createdAt: n.created_at || new Date().toISOString(),
  }),
  notificationToDB: (n: Notification) => ({
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    related_entity: n.relatedEntity,
    related_id: n.relatedId,
    created_at: n.createdAt,
  }),

  // History
  historyFromDB: (h: any): HistoryEntry => ({
    id: h.id,
    userId: h.user_id,
    action: h.action,
    entity: h.entity,
    entityId: h.entity_id || '',
    details: h.details || '',
    createdAt: h.created_at || new Date().toISOString(),
  }),
  historyToDB: (h: HistoryEntry) => ({
    id: h.id,
    user_id: h.userId,
    action: h.action,
    entity: h.entity,
    entity_id: h.entityId,
    details: h.details,
    created_at: h.createdAt,
  }),
};

// ====================================================================
// SERVIÇO SUPABASE PRINCIPAL (CRUD ASYNC)
// ====================================================================

export const supabaseService = {
  // Fetch Full Database from Supabase
  async fetchAllData(): Promise<Partial<AppState> | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const [
        { data: profiles },
        { data: people },
        { data: projects },
        { data: equipment },
        { data: problems },
        { data: guts },
        { data: actionPlans },
        { data: maintenance },
        { data: production },
        { data: nonConformities },
        { data: layouts },
        { data: notifications },
        { data: history },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('people').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('equipment').select('*'),
        supabase.from('problems').select('*'),
        supabase.from('gut_analyses').select('*'),
        supabase.from('action_plans').select('*'),
        supabase.from('maintenance_records').select('*'),
        supabase.from('production_activities').select('*'),
        supabase.from('non_conformities').select('*'),
        supabase.from('layouts').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('history').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      return {
        users: (profiles || []).map(mappers.profileToUser),
        people: (people || []).map(mappers.personFromDB),
        projects: (projects || []).map(mappers.projectFromDB),
        equipment: (equipment || []).map(mappers.equipmentFromDB),
        problems: (problems || []).map(mappers.problemFromDB),
        gutAnalyses: (guts || []).map(mappers.gutFromDB),
        actionPlans: (actionPlans || []).map(mappers.actionPlanFromDB),
        maintenanceRecords: (maintenance || []).map(mappers.maintenanceFromDB),
        productionActivities: (production || []).map(mappers.productionFromDB),
        nonConformities: (nonConformities || []).map(mappers.nonConformityFromDB),
        layouts: (layouts || []).map(mappers.layoutFromDB),
        notifications: (notifications || []).map(mappers.notificationFromDB),
        history: (history || []).map(mappers.historyFromDB),
      };
    } catch (err) {
      console.warn('[SupabaseService] Erro ao carregar dados do Supabase:', err);
      return null;
    }
  },

  // Save/Upsert Single Record
  async saveRecord(tableName: string, data: any) {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase.from(tableName).upsert(data);
      if (error) console.error(`[SupabaseService] Erro ao salvar em ${tableName}:`, error.message);
    } catch (err) {
      console.warn(`[SupabaseService] Falha na sincronização de ${tableName}:`, err);
    }
  },

  // Delete Single Record
  async deleteRecord(tableName: string, id: string) {
    if (!isSupabaseConfigured()) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) console.error(`[SupabaseService] Erro ao excluir de ${tableName}:`, error.message);
    } catch (err) {
      console.warn(`[SupabaseService] Falha ao excluir de ${tableName}:`, err);
    }
  },
};
