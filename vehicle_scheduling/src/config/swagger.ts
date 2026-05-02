import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vehicle Maintenance Scheduler API',
      version: '1.0.0',
      description:
        'Microservice that computes optimal vehicle maintenance task scheduling using 0/1 Knapsack DP. Each depot has limited mechanic hours; the service selects tasks that maximise operational impact.',
    },
    servers: [{ url: '/api/v1', description: 'v1' }],
    components: {
      schemas: {
        VehicleTask: {
          type: 'object',
          properties: {
            TaskID: { type: 'string', example: '264e638f-1c7a-4d67-9f9c-53f3d1766d37' },
            Duration: { type: 'number', example: 3 },
            Impact: { type: 'number', example: 7 },
          },
        },
        ScheduleResult: {
          type: 'object',
          properties: {
            depotId: { type: 'number', example: 1 },
            mechanicHours: { type: 'number', example: 60 },
            selectedTasks: { type: 'array', items: { $ref: '#/components/schemas/VehicleTask' } },
            totalImpact: { type: 'number', example: 120 },
            totalDuration: { type: 'number', example: 58 },
            remainingHours: { type: 'number', example: 2 },
          },
        },
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            statusCode: { type: 'number' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/schedule/{depotId}': {
        get: {
          summary: 'Get optimal maintenance schedule for a depot',
          tags: ['Schedule'],
          parameters: [
            {
              in: 'path',
              name: 'depotId',
              required: true,
              schema: { type: 'integer', minimum: 1 },
              description: 'Numeric ID of the depot',
            },
          ],
          responses: {
            '200': {
              description: 'Optimal schedule computed',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiSuccess' },
                      {
                        properties: {
                          data: { $ref: '#/components/schemas/ScheduleResult' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Invalid depotId' },
            '404': { description: 'Depot not found' },
            '500': { description: 'Internal server error' },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['Health'],
          responses: {
            '200': { description: 'Service healthy' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
