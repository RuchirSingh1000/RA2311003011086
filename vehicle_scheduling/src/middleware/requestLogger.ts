import { Request, Response, NextFunction } from 'express';
import { Log } from '../../logging_middleware/src';

export const requestLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const start = Date.now();

  await Log(
    'backend',
    'info',
    'middleware',
    `Inbound ${req.method} ${req.path} — ip=${req.ip}`
  );

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    void Log(
      'backend',
      level,
      'middleware',
      `${req.method} ${req.path} → ${res.statusCode} [${duration}ms]`
    );
  });

  next();
};
