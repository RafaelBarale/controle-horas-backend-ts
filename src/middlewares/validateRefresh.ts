// middlewares/validateBodyRefresh.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/AppError';
import { refreshTokenSchema } from '@schemas/refreshToken.schema';

export const validateRefresh = (req: Request, _res: Response, next: NextFunction) => {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    return next(new AppError('Invalid request body', 400));
  }
  req.body = result.data;
  next();
};