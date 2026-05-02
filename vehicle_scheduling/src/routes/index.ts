import { Router, Request, Response } from 'express';
import { scheduleController } from '../controllers/scheduleController';
import { validateDepotId } from '../validators/depotValidator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'vehicle-maintenance-scheduler', timestamp: new Date().toISOString() });
});

router.get(
  '/schedule/:depotId',
  asyncHandler(validateDepotId),
  asyncHandler((req, res) => scheduleController.getSchedule(req, res))
);

export default router;
