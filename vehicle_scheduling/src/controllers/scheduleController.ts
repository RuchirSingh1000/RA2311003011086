import { Request, Response } from 'express';
import { scheduleService } from '../services/scheduleService';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { Log } from '../../logging_middleware/src';

export class ScheduleController {
  /**
   * GET /api/v1/schedule/:depotId
   * Returns optimized task allocation for a given depot.
   */
  async getSchedule(req: Request, res: Response): Promise<void> {
    const depotId = parseInt(req.params['depotId'], 10);

    await Log('backend', 'info', 'controller', `Request received: GET /api/v1/schedule/${depotId}`);

    try {
      const result = await scheduleService.computeSchedule(depotId);
      await Log('backend', 'info', 'controller', `Schedule response dispatched for depotId=${depotId}`);
      sendSuccess(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';

      await Log('backend', 'error', 'controller', `Schedule computation failed for depotId=${depotId}: ${message}`);

      if (message.includes('not found')) {
        sendError(res, message, 404);
      } else {
        sendError(res, message, 500);
      }
    }
  }
}

export const scheduleController = new ScheduleController();
