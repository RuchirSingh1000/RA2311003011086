import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middleware/requestLogger';
import { errorMiddleware } from './middleware/errorMiddleware';
import routes from './routes';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type', 'Authorization'] }));

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests', statusCode: 429 },
  })
);

// Request logging middleware
app.use(requestLogger);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/v1', routes);

// Centralized error handler (must be last)
app.use(errorMiddleware);

export default app;
