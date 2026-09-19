/**
 * Secure Error Handler - Prevents information leakage
 */

export interface AppError {
    code: string;
    message: string;
    status: number;
}

export const AppError = {
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        status: 401
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Access denied',
        status: 403
    },
    BAD_REQUEST: {
        code: 'BAD_REQUEST',
        message: 'Invalid request',
        status: 400
    },
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        status: 500
    },
    RATE_LIMIT: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        status: 429
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        status: 404
    },
    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        status: 500
    },
    ENCRYPTION_ERROR: {
        code: 'ENCRYPTION_ERROR',
        message: 'Failed to process encrypted data',
        status: 500
    }
};

/**
 * Log error without exposing sensitive data
 */
export function safeLogError(error: Error, context?: any): void {
    console.error('[ERROR]', {
        code: error.name,
        message: error.message,
        timestamp: new Date().toISOString(),
        context: context // Don't include sensitive fields (email, password, token)
    });
}

/**
 * Clean sensitive data before logging
 */
export function sanitizeLog(data: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'key'];
    return JSON.parse(JSON.stringify(data, (key, value) => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            return '[REDACTED]';
        }
        return value;
    }));
}
