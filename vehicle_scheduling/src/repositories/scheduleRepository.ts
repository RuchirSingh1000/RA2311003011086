import { evaluationApiClient } from '../clients/evaluationApiClient';
import { Depot, VehicleTask } from '../types';
import { cache } from '../utils/cache';
import { config } from '../config';
import { Log } from '../../logging_middleware/src';

const DEPOTS_CACHE_KEY = 'depots:all';
const VEHICLES_CACHE_KEY = 'vehicles:all';

export class ScheduleRepository {
  async findAllDepots(): Promise<Depot[]> {
    const cached = cache.get<Depot[]>(DEPOTS_CACHE_KEY);
    if (cached) {
      await Log('backend', 'debug', 'repository', 'Depots served from cache');
      return cached;
    }

    const { depots } = await evaluationApiClient.fetchDepots();
    cache.set(DEPOTS_CACHE_KEY, depots, config.cacheTtlSeconds);
    await Log('backend', 'info', 'repository', `Cached ${depots.length} depots for ${config.cacheTtlSeconds}s`);

    return depots;
  }

  async findDepotById(id: number): Promise<Depot | undefined> {
    const depots = await this.findAllDepots();
    return depots.find((d) => d.ID === id);
  }

  async findAllVehicleTasks(): Promise<VehicleTask[]> {
    const cached = cache.get<VehicleTask[]>(VEHICLES_CACHE_KEY);
    if (cached) {
      await Log('backend', 'debug', 'repository', 'Vehicle tasks served from cache');
      return cached;
    }

    const { vehicles } = await evaluationApiClient.fetchVehicles();
    cache.set(VEHICLES_CACHE_KEY, vehicles, config.cacheTtlSeconds);
    await Log('backend', 'info', 'repository', `Cached ${vehicles.length} vehicle tasks for ${config.cacheTtlSeconds}s`);

    return vehicles;
  }
}

export const scheduleRepository = new ScheduleRepository();
