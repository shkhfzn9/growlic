import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export function handleRouteError(error: any) {
  console.error('API Route error caught:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error.name === 'CastError') {
    return NextResponse.json(
      { success: false, error: 'Resource not found: invalid ID format', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }

  if (error.name === 'ValidationError') {
    return NextResponse.json(
      { success: false, error: error.message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { success: false, error: error.message || 'Internal server error' },
    { status: 500 }
  );
}
