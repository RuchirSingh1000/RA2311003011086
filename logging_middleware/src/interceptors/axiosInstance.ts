import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { LogConfig } from '../types';

export const createAxiosInstance = (config: LogConfig): AxiosInstance => {
  const instance = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor — inject auth token dynamically
  instance.interceptors.request.use(
    (req: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      req.headers['Authorization'] = `Bearer ${config.bearerToken}`;
      return req;
    },
    (error: unknown) => Promise.reject(error)
  );

  // Response interceptor — normalize errors
  instance.interceptors.response.use(
    (res: AxiosResponse): AxiosResponse => res,
    (error: unknown) => Promise.reject(error)
  );

  return instance;
};
