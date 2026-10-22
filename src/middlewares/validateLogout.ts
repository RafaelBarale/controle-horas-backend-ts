// middlewares/validateLogout.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/AppError';
import { logoutSchema } from '@schemas/logout.schema';

export const validateLogout = (req: Request, _res: Response, next: NextFunction) => {
  const result = logoutSchema.safeParse(req.headers);
  if (!result.success) {
    return next(new AppError('Invalid request body', 400));
  }
  req.headers = result.data;
  next();
};