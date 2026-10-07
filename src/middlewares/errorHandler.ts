// src/middlewares/errorHandler.ts
import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// Forçamos o tipo como ErrorRequestHandler para o Express reconhecer os 4 parâmetros corretamente
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): any => {

  // 1. Tratamento de Erros Operacionais (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // 2. Log do erro para monitoramento (Console, Datadog, Sentry, Winston, etc.)
  console.error('? Erro não esperado:', err);

  // 3. Tratamento para Erros Internos / Desconhecidos (ex: queda de banco de dados)
  return res.status(500).json({
    status: 'error',
    message: 'Algo deu errado no servidor interno. Tente novamente mais tarde.',
  });
};
