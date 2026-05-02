import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseFormatter';
import { Log } from '../../logging_middleware/src';

export const errorMiddleware = async (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  await Log(
    'backend',
    'fatal',
    'middleware',
    `Unhandled exception on ${req.method} ${req.path}: ${error.message}`
  );

  sendError(res, 'An unexpected error occurred', 500);
};
