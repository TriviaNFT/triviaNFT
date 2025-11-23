/**
 * Structured logging utility for Lambda functions
 * Implements JSON logging format with correlation IDs and sensitive data sanitization
 * Requirement 46: Observability - Logging
 */

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
 * Generate a correlation ID using lazy-loaded uuid
 */
async function generateCorrelationId(): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
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
      correlationId: context.correlationId || crypto.randomUUID(),
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

  /**
   * Log asset name generation
   */
  logAssetNameGeneration(
    tier: string,
    assetName: string,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success 
      ? `Asset name generated: ${assetName}` 
      : `Asset name generation failed for tier: ${tier}`;
    
    this.log(level, message, {
      operation: 'asset_name_generation',
      tier,
      assetName: success ? assetName : undefined,
      success,
      ...metadata,
    });
  }

  /**
   * Log asset name parsing
   */
  logAssetNameParsing(
    assetName: string,
    success: boolean,
    isLegacyFormat?: boolean,
    metadata?: Record<string, any>
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = success 
      ? `Asset name parsed: ${assetName}${isLegacyFormat ? ' (legacy format)' : ''}` 
      : `Asset name parsing failed: ${assetName}`;
    
    this.log(level, message, {
      operation: 'asset_name_parsing',
      assetName,
      success,
      isLegacyFormat,
      ...metadata,
    });
  }

  /**
   * Log asset name validation
   */
  logAssetNameValidation(
    assetName: string,
    valid: boolean,
    errorCode?: string,
    errorDetails?: any
  ): void {
    const level = valid ? LogLevel.DEBUG : LogLevel.WARN;
    const message = valid 
      ? `Asset name validated: ${assetName}` 
      : `Asset name validation failed: ${assetName} - ${errorCode}`;
    
    this.log(level, message, {
      operation: 'asset_name_validation',
      assetName,
      valid,
      errorCode,
      errorDetails: errorCode ? sanitizeObject(errorDetails) : undefined,
    });
  }

  /**
   * Log hex ID generation
   */
  logHexIdGeneration(hexId: string, metadata?: Record<string, any>): void {
    this.debug(`Hex ID generated: ${hexId}`, {
      operation: 'hex_id_generation',
      hexId,
      ...metadata,
    });
  }

  /**
   * Log category code mapping
   */
  logCategoryCodeMapping(
    operation: 'slug_to_code' | 'code_to_slug',
    input: string,
    output: string | null,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = success 
      ? `Category code mapping: ${input} -> ${output}` 
      : `Category code mapping failed: ${input}`;
    
    this.log(level, message, {
      operation: 'category_code_mapping',
      mappingType: operation,
      input,
      output,
      success,
      ...metadata,
    });
  }

  /**
   * Log season code operation
   */
  logSeasonCodeOperation(
    operation: 'generate' | 'parse',
    input: string,
    output: string | null,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = success 
      ? `Season code ${operation}: ${input} -> ${output}` 
      : `Season code ${operation} failed: ${input}`;
    
    this.log(level, message, {
      operation: 'season_code_operation',
      operationType: operation,
      input,
      output,
      success,
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
export async function extractCorrelationId(event: any): Promise<string> {
  // Try to get from headers
  const headers = event.headers || {};
  const correlationId =
    headers['x-correlation-id'] ||
    headers['X-Correlation-Id'] ||
    headers['x-request-id'] ||
    headers['X-Request-Id'] ||
    event.requestContext?.requestId ||
    (await generateCorrelationId());

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
