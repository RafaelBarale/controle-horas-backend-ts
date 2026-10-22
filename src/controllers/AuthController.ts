import { AuthService } from '@services/AuthService';
import type { Request, Response, NextFunction } from 'express';

const authService = new AuthService();

//login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const tokens = await authService.login(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
};

//logout token
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization as string;
    const tokens = await authService.logout(authorization);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
};

//refresh token
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;
    const tokens = await authService.refreshToken(refresh_token);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
};
