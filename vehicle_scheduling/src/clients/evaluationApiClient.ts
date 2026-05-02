import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { DepotsApiResponse, VehiclesApiResponse } from '../types';
import { withRetry } from '../utils/retry';
import { Log } from '../../logging_middleware/src';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

class EvaluationApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.evaluationApiBaseUrl,
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.evaluationBearerToken}`,
      },
    });

    this.http.interceptors.response.use(
      (res) => res,
      (error) => Promise.reject(error)
    );
  }

  async fetchDepots(): Promise<DepotsApiResponse> {
    await Log('backend', 'info', 'api', 'Initiating GET /depots external API call');

    return withRetry(
      async () => {
        const res = await this.http.get<DepotsApiResponse>('/depots');
        await Log('backend', 'info', 'api', `Fetched ${res.data.depots.length} depots successfully`);
        return res.data;
      },
      RETRY_ATTEMPTS,
      RETRY_DELAY_MS,
      'GET /depots',
      async (attempt, label) => {
        await Log('backend', 'warn', 'api', `Retry attempt ${attempt} for ${label}`);
      }
    );
  }

  async fetchVehicles(): Promise<VehiclesApiResponse> {
    await Log('backend', 'info', 'api', 'Initiating GET /vehicles external API call');

    return withRetry(
      async () => {
        const res = await this.http.get<VehiclesApiResponse>('/vehicles');
        await Log('backend', 'info', 'api', `Fetched ${res.data.vehicles.length} vehicle tasks successfully`);
        return res.data;
      },
      RETRY_ATTEMPTS,
      RETRY_DELAY_MS,
      'GET /vehicles',
      async (attempt, label) => {
        await Log('backend', 'warn', 'api', `Retry attempt ${attempt} for ${label}`);
      }
    );
  }
}

export const evaluationApiClient = new EvaluationApiClient();
