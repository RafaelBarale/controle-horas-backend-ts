// middlewares/validateBody.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/AppError';
import { loginSchema } from '@schemas/login.schema';

export const validateBodyLogin = (req: Request, _res: Response, next: NextFunction) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return next(new AppError('Invalid request body', 400));
  }
  req.body = result.data;
  next();
};