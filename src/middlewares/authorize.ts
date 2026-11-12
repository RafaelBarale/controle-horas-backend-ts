import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/AppError';

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AppError('Usuário não autorizado.', 403));
    }

    next();
  };
};