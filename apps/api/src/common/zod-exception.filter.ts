import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    const messages = exception.issues.map((issue) => {
      const path = issue.path.join('.') || 'input';
      if (path === 'customerQrToken' || path.endsWith('customerQrToken')) {
        return 'Paste or scan a valid customer QR (stampperk:customer:...)';
      }
      return `${path}: ${issue.message}`;
    });

    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: messages.length === 1 ? messages[0] : messages,
      error: 'Bad Request',
    });
  }
}
