import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseFormatter';
import { Log } from '../../logging_middleware/src';

export const validateDepotId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const raw = req.params['depotId'];
  const depotId = parseInt(raw, 10);

  if (isNaN(depotId) || depotId <= 0) {
    await Log('backend', 'warn', 'middleware', `Validation failed — invalid depotId: "${raw}"`);
    sendError(res, `Invalid depotId: "${raw}". Must be a positive integer.`, 400);
    return;
  }

  next();
};
