import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      details?: unknown;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'INTERNAL_ERROR';
    this.statusCode = options.statusCode || 500;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Resource Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" was not found.`
      : `${resource} was not found.`;
    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  }
}

/**
 * Unauthorized / Access Denied Error (403)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'You do not have permission to access or modify this resource.') {
    super(message, {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends AppError {
  constructor(message = 'Invalid request parameters.', cause?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      cause,
    });
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'A conflicting record already exists.', cause?: unknown) {
    super(message, {
      code: 'CONFLICT',
      statusCode: 409,
      cause,
    });
  }
}

/**
 * Database / Data Access Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message = 'An unexpected database error occurred.', cause?: unknown) {
    super(message, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      cause,
    });
  }
}

/**
 * Maps PostgREST / Supabase errors into safe domain AppErrors.
 * Sanitizes sensitive database details, credentials, and SQL statements.
 */
export function mapPostgrestError(error: PostgrestError, context?: string): AppError {
  const prefix = context ? `[${context}] ` : '';

  // PostgreSQL permission denied or RLS violation
  if (error.code === '42501') {
    return new UnauthorizedError(
      `${prefix}Access denied: You do not have permission to perform this query.`
    );
  }

  // Row not found when single row requested or P0002
  if (error.code === 'PGRST116' || error.code === 'P0002') {
    return new NotFoundError(`${prefix}Resource`);
  }

  // Unique constraint violation
  if (error.code === '23505') {
    return new AppError(
      `${prefix}${error.message || 'A record with conflicting unique values already exists.'}`,
      {
        code: 'CONFLICT',
        statusCode: 409,
      }
    );
  }

  // Foreign key, check constraint, or invalid parameter validation
  if (error.code === '23503' || error.code === '23514' || error.code === '22023') {
    return new ValidationError(`${prefix}${error.message || 'Database constraint validation failed.'}`);
  }

  // Handle custom RPC raise exceptions (P0001)
  if (error.code === 'P0001' && error.message) {
    if (error.message.startsWith('Unauthorized:')) {
      return new UnauthorizedError(`${prefix}${error.message}`);
    }
    if (error.message.startsWith('NotFound:')) {
      return new NotFoundError(`${prefix}${error.message}`);
    }
    if (error.message.startsWith('InvalidState:')) {
      return new AppError(`${prefix}${error.message}`, { code: 'CONFLICT', statusCode: 409 });
    }
    if (error.message.startsWith('Validation:')) {
      return new ValidationError(`${prefix}${error.message}`);
    }
    return new AppError(`${prefix}${error.message}`, { code: 'BAD_REQUEST', statusCode: 400 });
  }

  // Generic fallback without leaking raw SQL / table details
  return new DatabaseError(`${prefix}${error.message || 'Failed to complete database operation.'}`, error);
}
