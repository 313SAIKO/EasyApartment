import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const errors: Record<string, [number, string]> = {
      P2002: [409, 'A record with these values already exists'],
      P2003: [409, 'Referenced data is missing or still in use'],
      P2004: [400, 'Data violates a database constraint'],
      P2025: [404, 'Record not found'],
      P2034: [409, 'Data changed concurrently; reload and retry'],
      P2023: [400, 'Invalid identifier or data format'],
    };
    const [statusCode, message] = errors[error.code] ?? [
      500,
      'Database operation failed',
    ];
    response.status(statusCode).json({ statusCode, message });
  }
}
