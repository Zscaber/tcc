import { AppState, User, Person, Project, Equipment, Problem, GutAnalysis, ActionPlan, MaintenanceRecord, ProductionActivity, NonConformity, Notification, HistoryEntry, Layout, AreaMap } from '../types';

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
  demoDataLoaded: false,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error(e); }
  return { ...defaultState };
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Simple hash for passwords (not production-grade but demonstrates the concept)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + btoa(password).slice(0, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// CRUD Operations
export const db = {
  // Users
  getUsers: () => loadState().users,
  getUserById: (id: string) => loadState().users.find(u => u.id === id),
  getUserByEmail: (email: string) => loadState().users.find(u => u.email === email),
  createUser: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const state = loadState();
    const newUser: User = { ...user, id: generateId(), createdAt: new Date().toISOString() };
    state.users.push(newUser);
    saveState(state);
    return newUser;
  },
  updateUser: (id: string, data: Partial<User>) => {
    const state = loadState();
    const idx = state.users.findIndex(u => u.id === id);
    if (idx >= 0) { state.users[idx] = { ...state.users[idx], ...data }; saveState(state); }
  },
  deleteUser: (id: string) => {
    const state = loadState();
    state.users = state.users.filter(u => u.id !== id);
    saveState(state);
  },

  // People
  getPeople: () => loadState().people,
  getPersonById: (id: string) => loadState().people.find(p => p.id === id),
  createPerson: (person: Omit<Person, 'id' | 'createdAt'>): Person => {
    const state = loadState();
    const newPerson: Person = { ...person, id: generateId(), createdAt: new Date().toISOString() };
    state.people.push(newPerson);
    saveState(state);
    return newPerson;
  },
  updatePerson: (id: string, data: Partial<Person>) => {
    const state = loadState();
    const idx = state.people.findIndex(p => p.id === id);
    if (idx >= 0) { state.people[idx] = { ...state.people[idx], ...data }; saveState(state); }
  },
  deletePerson: (id: string) => {
    const state = loadState();
    state.people = state.people.filter(p => p.id !== id);
    saveState(state);
  },

  // Projects
  getProjects: () => loadState().projects,
  getProjectById: (id: string) => loadState().projects.find(p => p.id === id),
  createProject: (project: Omit<Project, 'id' | 'createdAt'>): Project => {
    const state = loadState();
    const newProject: Project = { ...project, id: generateId(), createdAt: new Date().toISOString() };
    state.projects.push(newProject);
    saveState(state);
    return newProject;
  },
  updateProject: (id: string, data: Partial<Project>) => {
    const state = loadState();
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx >= 0) { state.projects[idx] = { ...state.projects[idx], ...data }; saveState(state); }
  },
  deleteProject: (id: string) => {
    const state = loadState();
    state.projects = state.projects.filter(p => p.id !== id);
    saveState(state);
  },

  // Equipment
  getEquipment: () => loadState().equipment,
  getEquipmentById: (id: string) => loadState().equipment.find(e => e.id === id),
  createEquipment: (equipment: Omit<Equipment, 'id' | 'createdAt'>): Equipment => {
    const state = loadState();
    const newEquipment: Equipment = { ...equipment, id: generateId(), createdAt: new Date().toISOString() };
    state.equipment.push(newEquipment);
    saveState(state);
    return newEquipment;
  },
  updateEquipment: (id: string, data: Partial<Equipment>) => {
    const state = loadState();
    const idx = state.equipment.findIndex(e => e.id === id);
    if (idx >= 0) { state.equipment[idx] = { ...state.equipment[idx], ...data }; saveState(state); }
  },
  deleteEquipment: (id: string) => {
    const state = loadState();
    state.equipment = state.equipment.filter(e => e.id !== id);
    saveState(state);
  },

  // Problems
  getProblems: () => loadState().problems,
  getProblemById: (id: string) => loadState().problems.find(p => p.id === id),
  createProblem: (problem: Omit<Problem, 'id' | 'createdAt'>): Problem => {
    const state = loadState();
    const newProblem: Problem = { ...problem, id: generateId(), createdAt: new Date().toISOString() };
    state.problems.push(newProblem);
    saveState(state);
    return newProblem;
  },
  updateProblem: (id: string, data: Partial<Problem>) => {
    const state = loadState();
    const idx = state.problems.findIndex(p => p.id === id);
    if (idx >= 0) { state.problems[idx] = { ...state.problems[idx], ...data }; saveState(state); }
  },
  deleteProblem: (id: string) => {
    const state = loadState();
    state.problems = state.problems.filter(p => p.id !== id);
    state.gutAnalyses = state.gutAnalyses.filter(g => g.problemId !== id);
    saveState(state);
  },

  // GUT
  getGutAnalyses: () => loadState().gutAnalyses,
  getGutByProblem: (problemId: string) => loadState().gutAnalyses.find(g => g.problemId === problemId),
  createGutAnalysis: (gut: Omit<GutAnalysis, 'id' | 'createdAt'>): GutAnalysis => {
    const state = loadState();
    const newGut: GutAnalysis = { ...gut, id: generateId(), createdAt: new Date().toISOString() };
    state.gutAnalyses.push(newGut);
    saveState(state);
    return newGut;
  },
  updateGutAnalysis: (id: string, data: Partial<GutAnalysis>) => {
    const state = loadState();
    const idx = state.gutAnalyses.findIndex(g => g.id === id);
    if (idx >= 0) { state.gutAnalyses[idx] = { ...state.gutAnalyses[idx], ...data }; saveState(state); }
  },
  deleteGutAnalysis: (id: string) => {
    const state = loadState();
    state.gutAnalyses = state.gutAnalyses.filter(g => g.id !== id);
    saveState(state);
  },

  // Action Plans
  getActionPlans: () => loadState().actionPlans,
  getActionPlanById: (id: string) => loadState().actionPlans.find(a => a.id === id),
  createActionPlan: (plan: Omit<ActionPlan, 'id' | 'createdAt'>): ActionPlan => {
    const state = loadState();
    const newPlan: ActionPlan = { ...plan, id: generateId(), createdAt: new Date().toISOString() };
    state.actionPlans.push(newPlan);
    saveState(state);
    return newPlan;
  },
  updateActionPlan: (id: string, data: Partial<ActionPlan>) => {
    const state = loadState();
    const idx = state.actionPlans.findIndex(a => a.id === id);
    if (idx >= 0) { state.actionPlans[idx] = { ...state.actionPlans[idx], ...data }; saveState(state); }
  },
  deleteActionPlan: (id: string) => {
    const state = loadState();
    state.actionPlans = state.actionPlans.filter(a => a.id !== id);
    saveState(state);
  },

  // Maintenance
  getMaintenanceRecords: () => loadState().maintenanceRecords,
  getMaintenanceById: (id: string) => loadState().maintenanceRecords.find(m => m.id === id),
  createMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>): MaintenanceRecord => {
    const state = loadState();
    const newRecord: MaintenanceRecord = { ...record, id: generateId(), createdAt: new Date().toISOString() };
    state.maintenanceRecords.push(newRecord);
    saveState(state);
    return newRecord;
  },
  updateMaintenanceRecord: (id: string, data: Partial<MaintenanceRecord>) => {
    const state = loadState();
    const idx = state.maintenanceRecords.findIndex(m => m.id === id);
    if (idx >= 0) { state.maintenanceRecords[idx] = { ...state.maintenanceRecords[idx], ...data }; saveState(state); }
  },
  deleteMaintenanceRecord: (id: string) => {
    const state = loadState();
    state.maintenanceRecords = state.maintenanceRecords.filter(m => m.id !== id);
    saveState(state);
  },

  // Production
  getProductionActivities: () => loadState().productionActivities,
  getProductionById: (id: string) => loadState().productionActivities.find(a => a.id === id),
  createProductionActivity: (activity: Omit<ProductionActivity, 'id' | 'createdAt'>): ProductionActivity => {
    const state = loadState();
    const newActivity: ProductionActivity = { ...activity, id: generateId(), createdAt: new Date().toISOString() };
    state.productionActivities.push(newActivity);
    saveState(state);
    return newActivity;
  },
  updateProductionActivity: (id: string, data: Partial<ProductionActivity>) => {
    const state = loadState();
    const idx = state.productionActivities.findIndex(a => a.id === id);
    if (idx >= 0) { state.productionActivities[idx] = { ...state.productionActivities[idx], ...data }; saveState(state); }
  },
  deleteProductionActivity: (id: string) => {
    const state = loadState();
    state.productionActivities = state.productionActivities.filter(a => a.id !== id);
    saveState(state);
  },

  // Non-Conformities
  getNonConformities: () => loadState().nonConformities,
  getNonConformityById: (id: string) => loadState().nonConformities.find(n => n.id === id),
  createNonConformity: (nc: Omit<NonConformity, 'id' | 'createdAt'>): NonConformity => {
    const state = loadState();
    const newNc: NonConformity = { ...nc, id: generateId(), createdAt: new Date().toISOString() };
    state.nonConformities.push(newNc);
    saveState(state);
    return newNc;
  },
  updateNonConformity: (id: string, data: Partial<NonConformity>) => {
    const state = loadState();
    const idx = state.nonConformities.findIndex(n => n.id === id);
    if (idx >= 0) { state.nonConformities[idx] = { ...state.nonConformities[idx], ...data }; saveState(state); }
  },
  deleteNonConformity: (id: string) => {
    const state = loadState();
    state.nonConformities = state.nonConformities.filter(n => n.id !== id);
    saveState(state);
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
    return newNotif;
  },
  markNotificationRead: (id: string) => {
    const state = loadState();
    const idx = state.notifications.findIndex(n => n.id === id);
    if (idx >= 0) { state.notifications[idx].read = true; saveState(state); }
  },
  markAllNotificationsRead: (userId: string) => {
    const state = loadState();
    state.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
    saveState(state);
  },

  // History
  getHistory: () => loadState().history,
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => {
    const state = loadState();
    state.history.unshift({ ...entry, id: generateId(), createdAt: new Date().toISOString() });
    if (state.history.length > 500) state.history = state.history.slice(0, 500);
    saveState(state);
  },

  // Layouts
  getLayouts: () => loadState().layouts,
  getLayoutById: (id: string) => loadState().layouts.find(l => l.id === id),
  createLayout: (layout: Omit<Layout, 'id' | 'createdAt'>): Layout => {
    const state = loadState();
    const newLayout: Layout = { ...layout, id: generateId(), createdAt: new Date().toISOString() };
    state.layouts.push(newLayout);
    saveState(state);
    return newLayout;
  },
  updateLayout: (id: string, data: Partial<Layout>) => {
    const state = loadState();
    const idx = state.layouts.findIndex(l => l.id === id);
    if (idx >= 0) { state.layouts[idx] = { ...state.layouts[idx], ...data }; saveState(state); }
  },
  deleteLayout: (id: string) => {
    const state = loadState();
    state.layouts = state.layouts.filter(l => l.id !== id);
    saveState(state);
  },

  // Area Maps
  getAreaMaps: () => loadState().areaMaps,
  getAreaMapById: (id: string) => loadState().areaMaps.find(a => a.id === id),
  createAreaMap: (areaMap: Omit<AreaMap, 'id' | 'createdAt' | 'updatedAt'>): AreaMap => {
    const state = loadState();
    const now = new Date().toISOString();
    const newAreaMap: AreaMap = { ...areaMap, id: generateId(), createdAt: now, updatedAt: now };
    state.areaMaps.push(newAreaMap);
    saveState(state);
    return newAreaMap;
  },
  updateAreaMap: (id: string, data: Partial<AreaMap>) => {
    const state = loadState();
    const idx = state.areaMaps.findIndex(a => a.id === id);
    if (idx >= 0) { state.areaMaps[idx] = { ...state.areaMaps[idx], ...data, updatedAt: new Date().toISOString() }; saveState(state); }
  },
  deleteAreaMap: (id: string) => {
    const state = loadState();
    state.areaMaps = state.areaMaps.filter(a => a.id !== id);
    saveState(state);
  },

  // Demo data
  loadDemoData: () => {
    const state = loadState();
    if (state.demoDataLoaded) return;

    // Admin user
    state.users.push({
      id: 'demo-admin',
      name: 'Administrador',
      email: 'admin@demo.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    // Demo people
    const people: Person[] = [
      { id: 'demo-p1', name: 'Carlos Silva', position: 'Eng. Manutenção', email: 'carlos@demo.com', createdAt: new Date().toISOString() },
      { id: 'demo-p2', name: 'Ana Oliveira', position: 'Técnica Qualidade', email: 'ana@demo.com', createdAt: new Date().toISOString() },
      { id: 'demo-p3', name: 'Roberto Santos', position: 'Operador', email: 'roberto@demo.com', createdAt: new Date().toISOString() },
    ];
    state.people = people;

    // Demo project
    const project: Project = {
      id: 'demo-proj1',
      name: 'Modernização Linha de Produção A',
      code: 'PRJ-001',
      description: 'Modernização dos equipamentos da linha de produção principal',
      sector: 'Produção',
      responsibleId: 'demo-p1',
      teamIds: ['demo-p1', 'demo-p2', 'demo-p3'],
      startDate: '2025-01-15',
      deadline: '2025-06-30',
      status: 'in_progress',
      notes: 'Projeto prioritário para Q1 2025',
      createdAt: new Date().toISOString(),
    };
    state.projects = [project];

    // Demo equipment
    state.equipment = [
      { id: 'demo-eq1', name: 'Torno CNC 01', code: 'EQ-001', type: 'Usinagem', manufacturer: 'Rommi', model: 'CNC 400', serialNumber: 'SN-2023-001', sector: 'Usinagem', location: 'Galpão A', responsibleId: 'demo-p1', status: 'operating', acquisitionDate: '2023-03-15', lastMaintenance: '2025-01-10', nextMaintenance: '2025-04-10', notes: '', createdAt: new Date().toISOString() },
      { id: 'demo-eq2', name: 'Prensa Hidráulica 02', code: 'EQ-002', type: 'Conformação', manufacturer: 'Schuler', model: 'PH-200', serialNumber: 'SN-2022-045', sector: 'Estamparia', location: 'Galpão B', responsibleId: 'demo-p3', status: 'maintenance', acquisitionDate: '2022-08-20', lastMaintenance: '2025-02-01', nextMaintenance: '2025-03-01', notes: 'Apresenta vazamento', createdAt: new Date().toISOString() },
    ];

    // Demo problem
    state.problems = [
      { id: 'demo-pr1', title: 'Vazamento de óleo na prensa', description: 'Vazamento identificado na junta hidráulica principal', category: 'maintenance', projectId: 'demo-proj1', equipmentId: 'demo-eq2', sector: 'Estamparia', responsibleId: 'demo-p1', identificationDate: '2025-02-05', status: 'analyzing', notes: '', createdAt: new Date().toISOString() },
    ];

    // Demo GUT
    state.gutAnalyses = [
      { id: 'demo-gut1', problemId: 'demo-pr1', gravity: 4, urgency: 5, tendency: 3, score: 60, classification: 'Crítico', createdAt: new Date().toISOString() },
    ];

    // Demo action plan
    state.actionPlans = [
      { id: 'demo-ap1', what: 'Substituir junta hidráulica', why: 'Eliminar vazamento de óleo', where: 'Prensa Hidráulica 02', when: '2025-02-20', who: ['demo-p1'], how: 'Trocar vedação conforme manual técnico', howMuch: 'R$ 850,00', problemId: 'demo-pr1', equipmentId: 'demo-eq2', projectId: 'demo-proj1', status: 'in_progress', createdAt: new Date().toISOString() },
    ];

    // Demo maintenance
    state.maintenanceRecords = [
      { id: 'demo-mr1', equipmentId: 'demo-eq2', type: 'corrective', description: 'Reparo vazamento óleo', responsibleId: 'demo-p1', date: '2025-02-05', deadline: '2025-02-20', status: 'in_progress', notes: 'Aguardando peça', cost: 850, createdAt: new Date().toISOString() },
      { id: 'demo-mr2', equipmentId: 'demo-eq1', type: 'preventive', description: 'Lubrificação geral', responsibleId: 'demo-p1', date: '2025-01-10', deadline: '2025-01-10', status: 'completed', notes: '', cost: 200, createdAt: new Date().toISOString() },
    ];

    // Demo production
    state.productionActivities = [
      { id: 'demo-pa1', title: 'Calibração de ferramentas', description: 'Calibrar ferramentas do torno CNC', projectId: 'demo-proj1', sector: 'Usinagem', responsibleId: 'demo-p1', deadline: '2025-02-28', status: 'in_progress', notes: '', createdAt: new Date().toISOString() },
    ];

    // Demo notifications
    state.notifications = [
      { id: 'demo-n1', userId: 'demo-admin', title: 'Manutenção próxima', message: 'Torno CNC 01 - manutenção preventiva em 30 dias', type: 'warning', read: false, relatedEntity: 'equipment', relatedId: 'demo-eq1', createdAt: new Date().toISOString() },
      { id: 'demo-n2', userId: 'demo-admin', title: 'Plano de ação em andamento', message: 'Substituição de junta hidráulica - Prensa 02', type: 'info', read: false, relatedEntity: 'actionPlan', relatedId: 'demo-ap1', createdAt: new Date().toISOString() },
    ];

    // Demo history
    state.history = [
      { id: 'demo-h1', userId: 'demo-admin', action: 'Sistema inicializado com dados de demonstração', entity: 'system', entityId: 'system', details: 'Dados de demonstração carregados', createdAt: new Date().toISOString() },
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
    state.areaMaps = state.areaMaps.filter(a => !a.id.startsWith('demo-'));
    state.demoDataLoaded = false;
    saveState(state);
  },
};
