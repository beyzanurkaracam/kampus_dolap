import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  
  @Catch()
  export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);
  
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
  
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Sunucu hatası oluştu';
      let error = 'Internal Server Error';
  
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
  
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else if (typeof exceptionResponse === 'object') {
          const resp = exceptionResponse as Record<string, any>;
          message = resp.message || exception.message;
          error = resp.error || error;
        }
      } else if (exception instanceof Error) {
        message = exception.message;
      }
  
      // Sadece 5xx hataları logla (4xx kullanıcı hatası, loglamaya gerek yok)
      if (status >= 500) {
        this.logger.error(
          {
            statusCode: status,
            path: request.url,
            method: request.method,
            stack: exception instanceof Error ? exception.stack : undefined,
          },
          `Unhandled exception: ${message}`,
        );
      }
  
      response.status(status).json({
        statusCode: status,
        error,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }