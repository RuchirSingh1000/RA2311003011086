import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types';

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): void => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, message: string, statusCode = 500): void => {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};
