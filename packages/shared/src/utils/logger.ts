/**
 * Structured logging utility for Lambda functions
 * Implements JSON logging format with correlation IDs and sensitive data sanitization
 * Requirement 46: Observability - Logging
 */

import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  stakeKey?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Patterns for sensitive data that should be sanitized
 */
const SENSITIVE_PATTERNS = {
  // Cardano stake keys (stake1...)
  stakeKey: /stake1[a-z0-9]{53}/gi,
  // Cardano addresses (addr1...)
  address: /addr1[a-z0-9]{98}/gi,
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // JWT tokens
  jwt: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi,
  // API keys (common patterns)
  apiKey: /[a-zA-Z0-9]{32,}/gi,
};

/**
 * Sanitize sensitive data from strings
 */
function sanitizeString(value: string): string {
  let sanitized = value;

  // Mask stake keys (show first 6 and last 4 characters)
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.stakeKey, (match) => {
    return `${match.substring(0, 6)}...${match.substring(match.length - 4)}`;
  });

  // Mask addresses (show first 6 and last 4 characters)
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.address, (match) => {
    return `${match.substring(0, 6)}...${match.substring(match.length - 4)}`;
  });

  // Mask email addresses (show first 2 characters and domain)
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [local, domain] = match.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  });

  // Mask JWT tokens
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.jwt, '[JWT_TOKEN]');

  return sanitized;
}

/**
 * Recursively sanitize sensitive data from objects
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys entirely
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = {
      ...context,
      correlationId: context.correlationId || uuidv4(),
    };
    this.minLevel = minLevel;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      {
        ...this.context,
        ...additionalContext,
      },
      this.minLevel
    );
  }

  /**
   * Update the correlation ID for request tracing
   */
  setCorrelationId(correlationId: string): void {
    this.context.correlationId = correlationId;
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    // Check if we should log at this level
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    if (levels.indexOf(level) < levels.indexOf(this.minLevel)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeString(message),
      context: sanitizeObject(this.context),
    };

    if (metadata) {
      entry.metadata = sanitizeObject(metadata);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: sanitizeString(error.message),
        stack: error.stack ? sanitizeString(error.stack) : undefined,
      };
    }

    // Output as JSON for CloudWatch Logs
    console.log(JSON.stringify(entry));
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, metadata?: Record<string, any>): void {
    this.info(`API Request: ${method} ${path}`, {
      httpMethod: method,
      path,
      ...metadata,
    });
  }

  /**
   * Log API response
   */
  logResponse(method: string, path: string, statusCode: number, durationMs: number, metadata?: Record<string, any>): void {
    this.info(`API Response: ${method} ${path} - ${statusCode}`, {
      httpMethod: method,
      path,
      statusCode,
      durationMs,
      ...metadata,
    });
  }

  /**
   * Log session event
   */
  logSessionEvent(event: 'start' | 'complete' | 'forfeit', sessionId: string, metadata?: Record<string, any>): void {
    this.info(`Session ${event}: ${sessionId}`, {
      sessionEvent: event,
      sessionId,
      ...metadata,
    });
  }

  /**
   * Log mint operation
   */
  logMintOperation(
    operation: 'initiated' | 'validated' | 'uploaded' | 'submitted' | 'confirmed' | 'failed',
    mintId: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Mint ${operation}: ${mintId}`, {
      mintOperation: operation,
      mintId,
      ...metadata,
    });
  }

  /**
   * Log forge operation
   */
  logForgeOperation(
    operation: 'initiated' | 'validated' | 'burned' | 'minted' | 'confirmed' | 'failed',
    forgeId: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Forge ${operation}: ${forgeId}`, {
      forgeOperation: operation,
      forgeId,
      ...metadata,
    });
  }

  /**
   * Log blockchain transaction
   */
  logTransaction(
    type: 'mint' | 'burn' | 'transfer',
    txHash: string,
    status: 'submitted' | 'confirmed' | 'failed',
    metadata?: Record<string, any>
  ): void {
    this.info(`Transaction ${status}: ${type} - ${txHash}`, {
      transactionType: type,
      txHash: sanitizeString(txHash),
      status,
      ...metadata,
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, durationMs: number, metadata?: Record<string, any>): void {
    this.debug(`Database query executed in ${durationMs}ms`, {
      query: sanitizeString(query),
      durationMs,
      ...metadata,
    });
  }

  /**
   * Log Redis operation
   */
  logRedisOperation(operation: string, key: string, durationMs: number, metadata?: Record<string, any>): void {
    this.debug(`Redis ${operation} on ${key} in ${durationMs}ms`, {
      redisOperation: operation,
      key: sanitizeString(key),
      durationMs,
      ...metadata,
    });
  }
}

/**
 * Create a logger instance from Lambda context
 */
export function createLogger(lambdaContext?: any, additionalContext?: LogContext): Logger {
  const context: LogContext = {
    ...additionalContext,
    requestId: lambdaContext?.requestId,
    functionName: lambdaContext?.functionName,
    functionVersion: lambdaContext?.functionVersion,
  };

  // Set log level from environment variable
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

  return new Logger(context, logLevel);
}

/**
 * Extract correlation ID from API Gateway event
 */
export function extractCorrelationId(event: any): string {
  // Try to get from headers
  const headers = event.headers || {};
  const correlationId =
    headers['x-correlation-id'] ||
    headers['X-Correlation-Id'] ||
    headers['x-request-id'] ||
    headers['X-Request-Id'] ||
    event.requestContext?.requestId ||
    uuidv4();

  return correlationId;
}

/**
 * Middleware to add correlation ID to response headers
 */
export function addCorrelationIdToResponse(correlationId: string, response: any): any {
  return {
    ...response,
    headers: {
      ...(response.headers || {}),
      'X-Correlation-Id': correlationId,
    },
  };
}
