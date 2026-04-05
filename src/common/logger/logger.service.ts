import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface LogOptions {
  function?: string;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
];

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: PinoLogger;

  constructor(logger: PinoLogger) {
    this.logger = logger;
  }

  log(message: string, context?: string, options?: LogOptions): void {
    const logObject = this.buildLogObject(context, options);
    this.logger.info(logObject, message);
  }

  error(
    message: string,
    stack?: string,
    context?: string,
    options?: LogOptions,
  ): void {
    const logObject = this.buildLogObject(context, options);
    if (stack) {
      logObject.stack = stack;
    }
    this.logger.error(logObject, message);
  }

  warn(message: string, context?: string, options?: LogOptions): void {
    const logObject = this.buildLogObject(context, options);
    this.logger.warn(logObject, message);
  }

  debug(message: string, context?: string, options?: LogOptions): void {
    const logObject = this.buildLogObject(context, options);
    this.logger.debug(logObject, message);
  }

  verbose(message: string, context?: string, options?: LogOptions): void {
    const logObject = this.buildLogObject(context, options);
    this.logger.debug(logObject, message);
  }

  private buildLogObject(
    context?: string,
    options?: LogOptions,
  ): Record<string, unknown> {
    const logObject: Record<string, unknown> = {};

    if (context) {
      logObject.context = context;
    }

    if (options?.correlationId) {
      logObject.correlationId = options.correlationId;
    }

    if (options?.function) {
      logObject.function = options.function;
    }

    if (options?.userId) {
      logObject.userId = options.userId;
    }

    if (options?.metadata) {
      logObject.metadata = this.filterSensitiveData(options.metadata);
    }

    return logObject;
  }

  private filterSensitiveData(
    data: unknown,
    visited: WeakSet<object> = new WeakSet(),
  ): unknown {
    // Handle null and undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Handle primitives
    if (typeof data !== 'object') {
      return data;
    }

    // Handle circular references
    if (visited.has(data)) {
      return '[CircularReference]';
    }
    visited.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.filterSensitiveData(item, visited));
    }

    // Handle objects
    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      // Case-insensitive check for sensitive keys
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        filtered[key] = '[REDACTED]';
      } else {
        filtered[key] = this.filterSensitiveData(value, visited);
      }
    }

    return filtered;
  }
}
