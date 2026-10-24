// ==================== TYPES ====================

export type UserRole = 'admin' | 'manager' | 'technician' | 'employee' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  position: string;
  email: string;
  createdAt: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  sector: string;
  responsibleId: string;
  teamIds: string[];
  startDate: string;
  deadline: string;
  status: ProjectStatus;
  notes: string;
  createdAt: string;
}

export type EquipmentStatus = 'operating' | 'maintenance' | 'stopped' | 'out_of_service';

export type CriticalityLevel = 'baixa' | 'media' | 'alta' | 'critica';

export interface Equipment {
  id: string;
  name: string;
  code: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  sector: string;
  location: string;
  responsibleId: string;
  status: EquipmentStatus;
  criticality?: CriticalityLevel;
  acquisitionDate: string;
  lastMaintenance: string;
  nextMaintenance: string;
  notes: string;
  createdAt: string;
}

export type ProblemCategory = 'maintenance' | 'production' | 'quality' | 'safety' | 'other';
export type ProblemStatus = 'identified' | 'analyzing' | 'treating' | 'resolved' | 'cancelled';

export interface Problem {
  id: string;
  title: string;
  description: string;
  category: ProblemCategory;
  projectId: string;
  equipmentId: string;
  sector: string;
  responsibleId: string;
  identificationDate: string;
  status: ProblemStatus;
  notes: string;
  createdAt: string;
}

export interface GutAnalysis {
  id: string;
  problemId: string;
  gravity: number;
  urgency: number;
  tendency: number;
  score: number;
  classification: string;
  createdAt: string;
}

export type ActionPlanStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface ActionPlan {
  id: string;
  what: string;
  why: string;
  where: string;
  when: string;
  who: string[];
  how: string;
  howMuch: string;
  problemId: string;
  equipmentId: string;
  projectId: string;
  status: ActionPlanStatus;
  createdAt: string;
}

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'other';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  problemId?: string;
  actionPlanId?: string;
  type: MaintenanceType;
  description: string;
  responsibleId: string;
  date: string;
  deadline: string;
  status: MaintenanceStatus;
  notes: string;
  cost: number;
  createdAt: string;
}

export interface ProductionActivity {
  id: string;
  title: string;
  description: string;
  projectId: string;
  equipmentId?: string;
  sector: string;
  responsibleId: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  notes: string;
  createdAt: string;
}

export interface NonConformity {
  id: string;
  title: string;
  description: string;
  cause: string;
  responsibleId: string;
  projectId: string;
  equipmentId?: string;
  sector?: string;
  severity?: CriticalityLevel;
  problemId: string;
  actionPlanId: string;
  status: 'identified' | 'analyzing' | 'treating' | 'resolved' | 'cancelled';
  evidence: string;
  identificationDate: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'error' | 'success';
  read: boolean;
  relatedEntity?: string;
  relatedId?: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface PhotoPoint {
  id: string;
  url: string;
  title?: string;
  description?: string;
  date?: string;
  notes?: string;
}

export interface AreaPhoto {
  id: string;
  url: string;
  title: string;
  description?: string;
  createdAt: string;
}

export type MapElementType = 'equipment' | 'organization' | 'structure' | 'other' | 'sector' | 'text' | 'photo' | 'marker' | 'area';

export interface LayoutElement {
  id: string;
  layoutId: string;
  type: MapElementType;
  category?: string;
  subType?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label: string;
  equipmentId?: string;
  color?: string;
  notes?: string;
  photos?: PhotoPoint[];
  icon?: string;
}

export interface Layout {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  widthMeters?: number;
  lengthMeters?: number;
  backgroundImage?: string;
  generalPhotos?: AreaPhoto[];
  elements: LayoutElement[];
  createdAt: string;
}

// ==================== AREA MAP ====================

export type MapObjectType = 
  | 'machine' | 'lathe' | 'drill' | 'press' | 'compressor' | 'welder' | 'motor' | 'custom_equipment'
  | 'workbench' | 'cabinet' | 'shelf' | 'stock' | 'pallet' | 'table'
  | 'wall' | 'door' | 'window' | 'column' | 'circulation'
  | 'extinguisher' | 'computer' | 'text' | 'marker' | 'inspection_point'
  | 'zone' | 'photo_point';

export interface MapObjectPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
}

export interface MapObject {
  id: string;
  type: MapObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  equipmentId?: string;
  zoneId?: string;
  description?: string;
  photos: MapObjectPhoto[];
  notes?: string;
}

export interface AreaMap {
  id: string;
  name: string;
  description: string;
  width: number; // meters
  length: number; // meters
  objects: MapObject[];
  generalPhotos: MapObjectPhoto[];
  backgroundImage?: string; // base64 image data URL
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 'pending' | 'analyzing' | 'approved' | 'rejected' | 'completed';
export type RequestPriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  sector: string;
  location: string;
  equipmentId: string;
  requesterId: string;  // user id (profiles.id)
  priority: RequestPriority;
  status: RequestStatus;
  notes: string;         // observações do responsável
  rejectionReason: string; // motivo de rejeição
  linkedProblemId: string; // problema gerado ao aprovar
  photoUrl: string;       // URL de foto (opcional, extensível)
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  users: User[];
  people: Person[];
  projects: Project[];
  equipment: Equipment[];
  problems: Problem[];
  gutAnalyses: GutAnalysis[];
  actionPlans: ActionPlan[];
  maintenanceRecords: MaintenanceRecord[];
  productionActivities: ProductionActivity[];
  nonConformities: NonConformity[];
  notifications: Notification[];
  history: HistoryEntry[];
  layouts: Layout[];
  areaMaps: AreaMap[];
  maintenanceRequests: MaintenanceRequest[];
  demoDataLoaded: boolean;
}
