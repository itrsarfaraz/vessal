import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  QueryFailedError,
} from 'typeorm';

@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    var { message } = exception;
  

    if (message == 'ER_DUP_ENTRY') {
      message = 'Duplicate entry exists.';
    }
    if (message == 'ER_PARSE_ERROR') {
      message = 'something went wrong.';
    }
    

    response
      .status(200)
      .json(GlobalResponseError(HttpStatus.BAD_REQUEST, message, request));
  }
}

const GlobalResponseError: (
  statusCode: number,
  message: string,
  request: Request,
) => IResponseError = (
  statusCode: number,
  message: string,
  request: Request,
): IResponseError => {
  return {
    statusCode: statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
  };
};

interface IResponseError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
}
