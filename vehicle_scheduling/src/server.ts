import app from './app';
import { config } from './config';
import { startScheduler } from './utils/scheduler';
import { Log } from '../logging_middleware/src';

const bootstrap = async (): Promise<void> => {
  try {
    startScheduler();

    app.listen(config.port, () => {
      void Log('backend', 'info', 'config', `Vehicle Maintenance Scheduler running on port ${config.port} [${config.nodeEnv}]`);
      void Log('backend', 'info', 'config', `Swagger docs available at http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    await Log('backend', 'fatal', 'config', `Server bootstrap failed: ${(error as Error).message}`);
    process.exit(1);
  }
};

void bootstrap();
