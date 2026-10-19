import { AuthService } from '@services/AuthService';
import { AppError } from '@utils/AppError';
import type { Request, Response, NextFunction } from 'express';

const authService = new AuthService();

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
};

//refresh token
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken){
      throw new AppError('Refresh token is required', 400);
    }
    const newAccessToken = await authService.refreshToken(refreshToken);
    res.status(200).json(newAccessToken);
  } catch (err) {
    next(err);
  }
};
