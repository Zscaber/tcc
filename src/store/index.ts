import {
  AppState, User, Person, Project, Equipment, Problem,
  GutAnalysis, ActionPlan, MaintenanceRecord, ProductionActivity,
  NonConformity, Notification, HistoryEntry, Layout, MaintenanceRequest
} from '../types';
import { supabaseService, mappers } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'manutencao_flexivel_db';

const defaultState: AppState = {
  users: [],
  people: [],
  projects: [],
  equipment: [],
  problems: [],
  gutAnalyses: [],
  actionPlans: [],
  maintenanceRecords: [],
  productionActivities: [],
  nonConformities: [],
  notifications: [],
  history: [],
  layouts: [],
  areaMaps: [],
  maintenanceRequests: [],
  demoDataLoaded: false,
};

// In-Memory Master Cache
let memoryState: AppState = { ...defaultState };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryState = { ...defaultState, ...JSON.parse(raw) };
      return memoryState;
    }
  } catch (e) {
    console.error('[Store] Falha ao carregar localStorage:', e);
  }
  return memoryState;
}

export function saveState(state: AppState) {
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[Store] Falha ao salvar localStorage:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Initial state load
loadState();

// ====================================================================
// BANCO DE DADOS UNIFICADO (STORE + SINCRONIZAÇÃO SUPABASE)
// ====================================================================

export const db = {
  // Sync Engine
  async init() {
    if (isSupabaseConfigured()) {
      const remoteData = await supabaseService.fetchAllData();
      if (remoteData) {
        const state = loadState();
        const mergedState: AppState = {
          ...state,
          ...remoteData,
          users: remoteData.users && remoteData.users.length > 0 ? remoteData.users : state.users,
          people: remoteData.people && remoteData.people.length > 0 ? remoteData.people : state.people,
          projects: remoteData.projects && remoteData.projects.length > 0 ? remoteData.projects : state.projects,
          equipment: remoteData.equipment && remoteData.equipment.length > 0 ? remoteData.equipment : state.equipment,
          problems: remoteData.problems && remoteData.problems.length > 0 ? remoteData.problems : state.problems,
          gutAnalyses: remoteData.gutAnalyses && remoteData.gutAnalyses.length > 0 ? remoteData.gutAnalyses : state.gutAnalyses,
          actionPlans: remoteData.actionPlans && remoteData.actionPlans.length > 0 ? remoteData.actionPlans : state.actionPlans,
          maintenanceRecords: remoteData.maintenanceRecords && remoteData.maintenanceRecords.length > 0 ? remoteData.maintenanceRecords : state.maintenanceRecords,
          productionActivities: remoteData.productionActivities && remoteData.productionActivities.length > 0 ? remoteData.productionActivities : state.productionActivities,
          nonConformities: remoteData.nonConformities && remoteData.nonConformities.length > 0 ? remoteData.nonConformities : state.nonConformities,
          layouts: remoteData.layouts && remoteData.layouts.length > 0 ? remoteData.layouts : state.layouts,
          notifications: remoteData.notifications && remoteData.notifications.length > 0 ? remoteData.notifications : state.notifications,
          history: remoteData.history && remoteData.history.length > 0 ? remoteData.history : state.history,
          maintenanceRequests: remoteData.maintenanceRequests && remoteData.maintenanceRequests.length > 0 ? remoteData.maintenanceRequests : state.maintenanceRequests,
        };
        saveState(mergedState);
      }
    }
  },

  // Users
  getUsers: () => loadState().users,
  getUserById: (id: string) => loadState().users.find(u => u.id === id),
  getUserByEmail: (email: string) => loadState().users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  createUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const state = loadState();
    const newUser: User = { ...user, id: generateId(), createdAt: new Date().toISOString() };
    state.users.push(newUser);
    saveState(state);
    supabaseService.saveRecord('profiles', mappers.userToProfile(newUser));
    return newUser;
  },
  updateUser: (id: string, data: Partial<User>) => {
    const state = loadState();
    const idx = state.users.findIndex(u => u.id === id);
    if (idx >= 0) {
      state.users[idx] = { ...state.users[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('profiles', mappers.userToProfile(state.users[idx]));
    }
  },
  deleteUser: (id: string) => {
    const state = loadState();
    state.users = state.users.filter(u => u.id !== id);
    saveState(state);
    supabaseService.deleteRecord('profiles', id);
  },

  // People
  getPeople: () => loadState().people,
  getPersonById: (id: string) => loadState().people.find(p => p.id === id),
  createPerson: (person: Omit<Person, 'id' | 'createdAt'>): Person => {
    const state = loadState();
    const newPerson: Person = { ...person, id: generateId(), createdAt: new Date().toISOString() };
    state.people.push(newPerson);
    saveState(state);
    supabaseService.saveRecord('people', mappers.personToDB(newPerson));
    return newPerson;
  },
  updatePerson: (id: string, data: Partial<Person>) => {
    const state = loadState();
    const idx = state.people.findIndex(p => p.id === id);
    if (idx >= 0) {
      state.people[idx] = { ...state.people[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('people', mappers.personToDB(state.people[idx]));
    }
  },
  deletePerson: (id: string) => {
    const state = loadState();
    state.people = state.people.filter(p => p.id !== id);
    saveState(state);
    supabaseService.deleteRecord('people', id);
  },

  // Projects
  getProjects: () => loadState().projects,
  getProjectById: (id: string) => loadState().projects.find(p => p.id === id),
  createProject: (project: Omit<Project, 'id' | 'createdAt'>): Project => {
    const state = loadState();
    const newProject: Project = { ...project, id: generateId(), createdAt: new Date().toISOString() };
    state.projects.push(newProject);
    saveState(state);
    supabaseService.saveRecord('projects', mappers.projectToDB(newProject));
    return newProject;
  },
  updateProject: (id: string, data: Partial<Project>) => {
    const state = loadState();
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx >= 0) {
      state.projects[idx] = { ...state.projects[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('projects', mappers.projectToDB(state.projects[idx]));
    }
  },
  deleteProject: (id: string) => {
    const state = loadState();
    state.projects = state.projects.filter(p => p.id !== id);
    saveState(state);
    supabaseService.deleteRecord('projects', id);
  },

  // Equipment
  getEquipment: () => loadState().equipment,
  getEquipmentById: (id: string) => loadState().equipment.find(e => e.id === id),
  createEquipment: (equipment: Omit<Equipment, 'id' | 'createdAt'>): Equipment => {
    const state = loadState();
    const newEquipment: Equipment = { ...equipment, id: generateId(), createdAt: new Date().toISOString() };
    state.equipment.push(newEquipment);
    saveState(state);
    supabaseService.saveRecord('equipment', mappers.equipmentToDB(newEquipment));
    return newEquipment;
  },
  updateEquipment: (id: string, data: Partial<Equipment>) => {
    const state = loadState();
    const idx = state.equipment.findIndex(e => e.id === id);
    if (idx >= 0) {
      state.equipment[idx] = { ...state.equipment[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('equipment', mappers.equipmentToDB(state.equipment[idx]));
    }
  },
  deleteEquipment: (id: string) => {
    const state = loadState();
    state.equipment = state.equipment.filter(e => e.id !== id);
    state.problems.forEach(p => { if (p.equipmentId === id) p.equipmentId = ''; });
    state.actionPlans.forEach(a => { if (a.equipmentId === id) a.equipmentId = ''; });
    state.maintenanceRecords = state.maintenanceRecords.filter(m => m.equipmentId !== id);
    state.productionActivities.forEach(p => { if (p.equipmentId === id) p.equipmentId = ''; });
    state.nonConformities.forEach(n => { if (n.equipmentId === id) n.equipmentId = ''; });
    state.layouts.forEach(l => {
      l.elements = l.elements.map(el => el.equipmentId === id ? { ...el, equipmentId: undefined } : el);
    });
    saveState(state);
    supabaseService.deleteRecord('equipment', id);
  },

  // Problems
  getProblems: () => loadState().problems,
  getProblemById: (id: string) => loadState().problems.find(p => p.id === id),
  createProblem: (problem: Omit<Problem, 'id' | 'createdAt'>): Problem => {
    const state = loadState();
    const newProblem: Problem = { ...problem, id: generateId(), createdAt: new Date().toISOString() };
    state.problems.push(newProblem);
    saveState(state);
    supabaseService.saveRecord('problems', mappers.problemToDB(newProblem));
    return newProblem;
  },
  updateProblem: (id: string, data: Partial<Problem>) => {
    const state = loadState();
    const idx = state.problems.findIndex(p => p.id === id);
    if (idx >= 0) {
      state.problems[idx] = { ...state.problems[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('problems', mappers.problemToDB(state.problems[idx]));
    }
  },
  deleteProblem: (id: string) => {
    const state = loadState();
    state.problems = state.problems.filter(p => p.id !== id);
    state.gutAnalyses = state.gutAnalyses.filter(g => g.problemId !== id);
    state.actionPlans.forEach(a => { if (a.problemId === id) a.problemId = ''; });
    state.maintenanceRecords.forEach(m => { if (m.problemId === id) m.problemId = ''; });
    state.nonConformities.forEach(n => { if (n.problemId === id) n.problemId = ''; });
    saveState(state);
    supabaseService.deleteRecord('problems', id);
  },

  // GUT
  getGutAnalyses: () => loadState().gutAnalyses,
  getGutByProblem: (problemId: string) => loadState().gutAnalyses.find(g => g.problemId === problemId),
  createGutAnalysis: (gut: Omit<GutAnalysis, 'id' | 'createdAt'>): GutAnalysis => {
    const state = loadState();
    const newGut: GutAnalysis = { ...gut, id: generateId(), createdAt: new Date().toISOString() };
    state.gutAnalyses.push(newGut);
    saveState(state);
    supabaseService.saveRecord('gut_analyses', mappers.gutToDB(newGut));
    return newGut;
  },
  updateGutAnalysis: (id: string, data: Partial<GutAnalysis>) => {
    const state = loadState();
    const idx = state.gutAnalyses.findIndex(g => g.id === id);
    if (idx >= 0) {
      state.gutAnalyses[idx] = { ...state.gutAnalyses[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('gut_analyses', mappers.gutToDB(state.gutAnalyses[idx]));
    }
  },
  deleteGutAnalysis: (id: string) => {
    const state = loadState();
    state.gutAnalyses = state.gutAnalyses.filter(g => g.id !== id);
    saveState(state);
    supabaseService.deleteRecord('gut_analyses', id);
  },

  // Action Plans
  getActionPlans: () => loadState().actionPlans,
  getActionPlanById: (id: string) => loadState().actionPlans.find(a => a.id === id),
  createActionPlan: (plan: Omit<ActionPlan, 'id' | 'createdAt'>): ActionPlan => {
    const state = loadState();
    const newPlan: ActionPlan = { ...plan, id: generateId(), createdAt: new Date().toISOString() };
    state.actionPlans.push(newPlan);
    saveState(state);
    supabaseService.saveRecord('action_plans', mappers.actionPlanToDB(newPlan));
    return newPlan;
  },
  updateActionPlan: (id: string, data: Partial<ActionPlan>) => {
    const state = loadState();
    const idx = state.actionPlans.findIndex(a => a.id === id);
    if (idx >= 0) {
      state.actionPlans[idx] = { ...state.actionPlans[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('action_plans', mappers.actionPlanToDB(state.actionPlans[idx]));
    }
  },
  deleteActionPlan: (id: string) => {
    const state = loadState();
    state.actionPlans = state.actionPlans.filter(a => a.id !== id);
    state.maintenanceRecords.forEach(m => { if (m.actionPlanId === id) m.actionPlanId = ''; });
    state.nonConformities.forEach(n => { if (n.actionPlanId === id) n.actionPlanId = ''; });
    saveState(state);
    supabaseService.deleteRecord('action_plans', id);
  },

  // Maintenance
  getMaintenanceRecords: () => loadState().maintenanceRecords,
  getMaintenanceById: (id: string) => loadState().maintenanceRecords.find(m => m.id === id),
  createMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>): MaintenanceRecord => {
    const state = loadState();
    const newRecord: MaintenanceRecord = { ...record, id: generateId(), createdAt: new Date().toISOString() };
    state.maintenanceRecords.push(newRecord);
    saveState(state);
    supabaseService.saveRecord('maintenance_records', mappers.maintenanceToDB(newRecord));
    return newRecord;
  },
  updateMaintenanceRecord: (id: string, data: Partial<MaintenanceRecord>) => {
    const state = loadState();
    const idx = state.maintenanceRecords.findIndex(m => m.id === id);
    if (idx >= 0) {
      state.maintenanceRecords[idx] = { ...state.maintenanceRecords[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('maintenance_records', mappers.maintenanceToDB(state.maintenanceRecords[idx]));
    }
  },
  deleteMaintenanceRecord: (id: string) => {
    const state = loadState();
    state.maintenanceRecords = state.maintenanceRecords.filter(m => m.id !== id);
    saveState(state);
    supabaseService.deleteRecord('maintenance_records', id);
  },

  // Production
  getProductionActivities: () => loadState().productionActivities,
  getProductionById: (id: string) => loadState().productionActivities.find(a => a.id === id),
  createProductionActivity: (activity: Omit<ProductionActivity, 'id' | 'createdAt'>): ProductionActivity => {
    const state = loadState();
    const newActivity: ProductionActivity = { ...activity, id: generateId(), createdAt: new Date().toISOString() };
    state.productionActivities.push(newActivity);
    saveState(state);
    supabaseService.saveRecord('production_activities', mappers.productionToDB(newActivity));
    return newActivity;
  },
  updateProductionActivity: (id: string, data: Partial<ProductionActivity>) => {
    const state = loadState();
    const idx = state.productionActivities.findIndex(a => a.id === id);
    if (idx >= 0) {
      state.productionActivities[idx] = { ...state.productionActivities[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('production_activities', mappers.productionToDB(state.productionActivities[idx]));
    }
  },
  deleteProductionActivity: (id: string) => {
    const state = loadState();
    state.productionActivities = state.productionActivities.filter(a => a.id !== id);
    saveState(state);
    supabaseService.deleteRecord('production_activities', id);
  },

  // Non-Conformities
  getNonConformities: () => loadState().nonConformities,
  getNonConformityById: (id: string) => loadState().nonConformities.find(n => n.id === id),
  createNonConformity: (nc: Omit<NonConformity, 'id' | 'createdAt'>): NonConformity => {
    const state = loadState();
    const newNc: NonConformity = { ...nc, id: generateId(), createdAt: new Date().toISOString() };
    state.nonConformities.push(newNc);
    saveState(state);
    supabaseService.saveRecord('non_conformities', mappers.nonConformityToDB(newNc));
    return newNc;
  },
  updateNonConformity: (id: string, data: Partial<NonConformity>) => {
    const state = loadState();
    const idx = state.nonConformities.findIndex(n => n.id === id);
    if (idx >= 0) {
      state.nonConformities[idx] = { ...state.nonConformities[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('non_conformities', mappers.nonConformityToDB(state.nonConformities[idx]));
    }
  },
  deleteNonConformity: (id: string) => {
    const state = loadState();
    state.nonConformities = state.nonConformities.filter(n => n.id !== id);
    saveState(state);
    supabaseService.deleteRecord('non_conformities', id);
  },

  // Notifications
  getNotifications: (userId?: string) => {
    const notifs = loadState().notifications;
    return userId ? notifs.filter(n => n.userId === userId) : notifs;
  },
  createNotification: (notif: Omit<Notification, 'id' | 'createdAt'>): Notification => {
    const state = loadState();
    const newNotif: Notification = { ...notif, id: generateId(), createdAt: new Date().toISOString() };
    state.notifications.push(newNotif);
    saveState(state);
    supabaseService.saveRecord('notifications', mappers.notificationToDB(newNotif));
    return newNotif;
  },
  markNotificationRead: (id: string) => {
    const state = loadState();
    const idx = state.notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      state.notifications[idx].read = true;
      saveState(state);
      supabaseService.saveRecord('notifications', mappers.notificationToDB(state.notifications[idx]));
    }
  },
  markAllNotificationsRead: (userId: string) => {
    const state = loadState();
    state.notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
        supabaseService.saveRecord('notifications', mappers.notificationToDB(n));
      }
    });
    saveState(state);
  },

  // History
  getHistory: () => loadState().history,
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => {
    const state = loadState();
    const newEntry: HistoryEntry = { ...entry, id: generateId(), createdAt: new Date().toISOString() };
    state.history.unshift(newEntry);
    if (state.history.length > 500) state.history = state.history.slice(0, 500);
    saveState(state);
    supabaseService.saveRecord('history', mappers.historyToDB(newEntry));
  },

  // Layouts
  getLayouts: () => loadState().layouts,
  getLayoutById: (id: string) => loadState().layouts.find(l => l.id === id),
  createLayout: (layout: Omit<Layout, 'id' | 'createdAt'>): Layout => {
    const state = loadState();
    const newLayout: Layout = { ...layout, id: generateId(), createdAt: new Date().toISOString() };
    state.layouts.push(newLayout);
    saveState(state);
    supabaseService.saveRecord('layouts', mappers.layoutToDB(newLayout));
    return newLayout;
  },
  updateLayout: (id: string, data: Partial<Layout>) => {
    const state = loadState();
    const idx = state.layouts.findIndex(l => l.id === id);
    if (idx >= 0) {
      state.layouts[idx] = { ...state.layouts[idx], ...data };
      saveState(state);
      supabaseService.saveRecord('layouts', mappers.layoutToDB(state.layouts[idx]));
    }
  },
  deleteLayout: (id: string) => {
    const state = loadState();
    state.layouts = state.layouts.filter(l => l.id !== id);
    saveState(state);
    supabaseService.deleteRecord('layouts', id);
  },

  // Maintenance Requests
  getMaintenanceRequests: () => loadState().maintenanceRequests || [],
  getMaintenanceRequestById: (id: string) => (loadState().maintenanceRequests || []).find(r => r.id === id),
  getMaintenanceRequestsByUser: (userId: string) => (loadState().maintenanceRequests || []).filter(r => r.requesterId === userId),
  createMaintenanceRequest: (req: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>): MaintenanceRequest => {
    const state = loadState();
    const now = new Date().toISOString();
    const newReq: MaintenanceRequest = { ...req, id: generateId(), createdAt: now, updatedAt: now };
    if (!state.maintenanceRequests) state.maintenanceRequests = [];
    state.maintenanceRequests.unshift(newReq);
    saveState(state);
    supabaseService.saveRecord('maintenance_requests', mappers.requestToDB(newReq));
    return newReq;
  },
  updateMaintenanceRequest: (id: string, data: Partial<MaintenanceRequest>) => {
    const state = loadState();
    if (!state.maintenanceRequests) state.maintenanceRequests = [];
    const idx = state.maintenanceRequests.findIndex(r => r.id === id);
    if (idx >= 0) {
      state.maintenanceRequests[idx] = { ...state.maintenanceRequests[idx], ...data, updatedAt: new Date().toISOString() };
      saveState(state);
      supabaseService.saveRecord('maintenance_requests', mappers.requestToDB(state.maintenanceRequests[idx]));
    }
  },
  deleteMaintenanceRequest: (id: string) => {
    const state = loadState();
    if (!state.maintenanceRequests) return;
    state.maintenanceRequests = state.maintenanceRequests.filter(r => r.id !== id);
    saveState(state);
    supabaseService.deleteRecord('maintenance_requests', id);
  },

  // Demo data loader
  loadDemoData: () => {
    const state = loadState();
    if (state.demoDataLoaded) return;

    state.users.push({
      id: 'demo-admin',
      name: 'Administrador',
      email: 'admin@demo.com',
      passwordHash: '',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    const people: Person[] = [
      { id: 'demo-p1', name: 'Carlos Silva', position: 'Eng. Manutenção', email: 'carlos@demo.com', createdAt: new Date().toISOString() },
      { id: 'demo-p2', name: 'Ana Oliveira', position: 'Técnica Qualidade', email: 'ana@demo.com', createdAt: new Date().toISOString() },
      { id: 'demo-p3', name: 'Roberto Santos', position: 'Operador', email: 'roberto@demo.com', createdAt: new Date().toISOString() },
    ];
    state.people = people;

    const project: Project = {
      id: 'demo-proj1',
      name: 'Modernização Linha de Produção A',
      code: 'PRJ-001',
      description: 'Modernização dos equipamentos da linha de produção principal',
      sector: 'Produção',
      responsibleId: 'demo-p1',
      teamIds: ['demo-p1', 'demo-p2', 'demo-p3'],
      startDate: '2026-01-15',
      deadline: '2026-12-31',
      status: 'in_progress',
      notes: 'Projeto prioritário para 2026',
      createdAt: new Date().toISOString(),
    };
    state.projects = [project];

    state.equipment = [
      { id: 'demo-eq1', name: 'Torno CNC 01', code: 'EQ-001', type: 'Usinagem', manufacturer: 'Rommi', model: 'CNC 400', serialNumber: 'SN-2023-001', sector: 'Usinagem', location: 'Galpão A', responsibleId: 'demo-p1', status: 'operating', criticality: 'alta', acquisitionDate: '2023-03-15', lastMaintenance: '2026-08-10', nextMaintenance: '2026-10-05', notes: 'Manutenção em dia', createdAt: new Date().toISOString() },
      { id: 'demo-eq2', name: 'Prensa Hidráulica 02', code: 'EQ-002', type: 'Conformação', manufacturer: 'Schuler', model: 'PH-200', serialNumber: 'SN-2022-045', sector: 'Estamparia', location: 'Galpão B', responsibleId: 'demo-p3', status: 'maintenance', criticality: 'critica', acquisitionDate: '2022-08-20', lastMaintenance: '2026-08-01', nextMaintenance: '2026-09-20', notes: 'Apresenta vazamento de óleo na prensa', createdAt: new Date().toISOString() },
    ];

    state.problems = [
      { id: 'demo-pr1', title: 'Vazamento de óleo na prensa', description: 'Vazamento identificado na junta hidráulica principal provocando perda de pressão.', category: 'maintenance', projectId: 'demo-proj1', equipmentId: 'demo-eq2', sector: 'Estamparia', responsibleId: 'demo-p1', identificationDate: '2026-09-15', status: 'analyzing', notes: 'Prioridade alta para estamparia', createdAt: new Date().toISOString() },
    ];

    state.gutAnalyses = [
      { id: 'demo-gut1', problemId: 'demo-pr1', gravity: 4, urgency: 5, tendency: 3, score: 60, classification: 'Crítico', createdAt: new Date().toISOString() },
    ];

    state.actionPlans = [
      { id: 'demo-ap1', what: 'Substituir junta hidráulica', why: 'Eliminar vazamento de óleo e restaurar pressão', where: 'Prensa Hidráulica 02 - Galpão B', when: '2026-09-20', who: ['demo-p1'], how: 'Trocar vedação conforme manual técnico', howMuch: 'R$ 850,00', problemId: 'demo-pr1', equipmentId: 'demo-eq2', projectId: 'demo-proj1', status: 'overdue', createdAt: new Date().toISOString() },
    ];

    state.maintenanceRecords = [
      { id: 'demo-mr1', equipmentId: 'demo-eq2', problemId: 'demo-pr1', actionPlanId: 'demo-ap1', type: 'corrective', description: 'Reparo de vazamento de óleo hidráulico', responsibleId: 'demo-p1', date: '2026-09-15', deadline: '2026-09-20', status: 'in_progress', notes: 'Aguardando peça de reposição', cost: 850, createdAt: new Date().toISOString() },
      { id: 'demo-mr2', equipmentId: 'demo-eq1', type: 'preventive', description: 'Lubrificação geral e ajuste de fusos', responsibleId: 'demo-p1', date: '2026-08-10', deadline: '2026-08-10', status: 'completed', notes: 'Concluído com sucesso', cost: 200, createdAt: new Date().toISOString() },
    ];

    state.productionActivities = [
      { id: 'demo-pa1', title: 'Calibração de ferramentas', description: 'Calibrar ferramentas do torno CNC', projectId: 'demo-proj1', equipmentId: 'demo-eq1', sector: 'Usinagem', responsibleId: 'demo-p1', deadline: '2026-10-05', status: 'in_progress', notes: '', createdAt: new Date().toISOString() },
    ];

    state.nonConformities = [
      { id: 'demo-nc1', title: 'Pressão de estamparia insuficiente', description: 'Pressão abaixo da faixa nominal na prensa 02.', cause: 'Vazamento na junta de vedação', responsibleId: 'demo-p2', projectId: 'demo-proj1', equipmentId: 'demo-eq2', sector: 'Estamparia', severity: 'critica', problemId: 'demo-pr1', actionPlanId: 'demo-ap1', status: 'analyzing', evidence: 'Gráfico de sensor P-02', identificationDate: '2026-09-16', createdAt: new Date().toISOString() },
    ];

    state.notifications = [
      { id: 'demo-n1', userId: 'demo-admin', title: 'Manutenção Atrasada', message: 'Prensa Hidráulica 02 - Reparo de vazamento excedeu o prazo de 20/09/2026.', type: 'warning', read: false, relatedEntity: 'maintenance', relatedId: 'demo-mr1', createdAt: new Date().toISOString() },
      { id: 'demo-n2', userId: 'demo-admin', title: 'Plano 5W2H Atrasado', message: 'Substituição de junta hidráulica - Prensa 02 está atrasado.', type: 'error', read: false, relatedEntity: 'actionPlan', relatedId: 'demo-ap1', createdAt: new Date().toISOString() },
    ];

    state.history = [
      { id: 'demo-h1', userId: 'demo-admin', action: 'Sistema inicializado', entity: 'system', entityId: 'system', details: 'Dados de demonstração (2026) carregados com sucesso', createdAt: new Date().toISOString() },
    ];

    state.demoDataLoaded = true;
    saveState(state);
  },

  clearDemoData: () => {
    const state = loadState();
    state.users = state.users.filter(u => !u.id.startsWith('demo-'));
    state.people = state.people.filter(p => !p.id.startsWith('demo-'));
    state.projects = state.projects.filter(p => !p.id.startsWith('demo-'));
    state.equipment = state.equipment.filter(e => !e.id.startsWith('demo-'));
    state.problems = state.problems.filter(p => !p.id.startsWith('demo-'));
    state.gutAnalyses = state.gutAnalyses.filter(g => !g.id.startsWith('demo-'));
    state.actionPlans = state.actionPlans.filter(a => !a.id.startsWith('demo-'));
    state.maintenanceRecords = state.maintenanceRecords.filter(m => !m.id.startsWith('demo-'));
    state.productionActivities = state.productionActivities.filter(a => !a.id.startsWith('demo-'));
    state.nonConformities = state.nonConformities.filter(n => !n.id.startsWith('demo-'));
    state.notifications = state.notifications.filter(n => !n.id.startsWith('demo-'));
    state.history = state.history.filter(h => !h.id.startsWith('demo-'));
    state.layouts = state.layouts.filter(l => !l.id.startsWith('demo-'));
    state.demoDataLoaded = false;
    saveState(state);
  },
};

// =========================================================
// HELPER UTILITIES DE DATAS E STATUS DINÂMICOS
// =========================================================

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDaysDiff(dateStr: string): number {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isDateOverdue(deadlineStr: string, status?: string): boolean {
  if (!deadlineStr || status === 'completed' || status === 'resolved' || status === 'cancelled') return false;
  return getDaysDiff(deadlineStr) < 0;
}

export function getOverdueDaysText(deadlineStr: string): string {
  const diff = getDaysDiff(deadlineStr);
  if (diff >= 0) return '';
  const days = Math.abs(diff);
  return `${days} ${days === 1 ? 'dia atrasado' : 'dias atrasados'}`;
}

export function isDateUpcoming(dateStr: string, daysWindow = 7): boolean {
  if (!dateStr) return false;
  const diff = getDaysDiff(dateStr);
  return diff >= 0 && diff <= daysWindow;
}
