import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { authEnv } from '@schemas/auth.schema';
import { AppError } from '@utils/AppError';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token missing', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, authEnv.JWT_SECRET) as JwtPayload;
    // Attach user info to request if needed
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};
