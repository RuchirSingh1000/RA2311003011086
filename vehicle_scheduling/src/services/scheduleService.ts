import { scheduleRepository } from '../repositories/scheduleRepository';
import { knapsackOptimize } from '../utils/knapsack';
import { ScheduleResult } from '../types';
import { Log } from '../../logging_middleware/src';

export class ScheduleService {
  async computeSchedule(depotId: number): Promise<ScheduleResult> {
    await Log('backend', 'info', 'service', `Schedule computation requested for depotId=${depotId}`);

    const depot = await scheduleRepository.findDepotById(depotId);

    if (!depot) {
      await Log('backend', 'error', 'service', `Depot not found: depotId=${depotId}`);
      throw new Error(`Depot with ID ${depotId} not found`);
    }

    await Log('backend', 'info', 'service', `Depot ${depotId} has ${depot.MechanicHours} mechanic hours`);

    const tasks = await scheduleRepository.findAllVehicleTasks();

    await Log('backend', 'info', 'service', `Running knapsack on ${tasks.length} tasks with capacity ${depot.MechanicHours}`);

    const { selectedItems, totalImpact, totalDuration } = await knapsackOptimize({
      capacity: depot.MechanicHours,
      items: tasks,
    });

    const result: ScheduleResult = {
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
      selectedTasks: selectedItems,
      totalImpact,
      totalDuration,
      remainingHours: depot.MechanicHours - totalDuration,
    };

    await Log(
      'backend',
      'info',
      'service',
      `Schedule ready for depotId=${depotId}: ${selectedItems.length} tasks, impact=${totalImpact}, remaining=${result.remainingHours}h`
    );

    return result;
  }
}

export const scheduleService = new ScheduleService();
