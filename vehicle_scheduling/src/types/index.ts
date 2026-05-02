// External API types
export interface Depot {
  ID: number;
  MechanicHours: number;
}

export interface VehicleTask {
  TaskID: string;
  Duration: number;
  Impact: number;
}

export interface DepotsApiResponse {
  depots: Depot[];
}

export interface VehiclesApiResponse {
  vehicles: VehicleTask[];
}

// Domain types
export interface ScheduleResult {
  depotId: number;
  mechanicHours: number;
  selectedTasks: VehicleTask[];
  totalImpact: number;
  totalDuration: number;
  remainingHours: number;
}

export interface KnapsackInput {
  capacity: number;
  items: VehicleTask[];
}

export interface KnapsackOutput {
  selectedItems: VehicleTask[];
  totalImpact: number;
  totalDuration: number;
}

// Cache entry
export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// API response wrapper
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Config
export interface AppConfig {
  port: number;
  nodeEnv: string;
  evaluationApiBaseUrl: string;
  evaluationBearerToken: string;
  cacheTtlSeconds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}
