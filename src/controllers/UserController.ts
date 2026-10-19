import type { Request, Response, NextFunction } from 'express';
import { UserService } from '@services/UserService';

export class UserController {
  private userService = new UserService();

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      // Validao bsica (idealmente feita por uma biblioteca como Zod ou Joi)
      // if (!name || !email || !password) {
      //   res.status(400).json({ error: 'Dados incompletos.' });
      //   return;
      // }

      const user = await this.userService.registerUser({ name, email, password });
      
      res.status(201).json(user);
    } catch (error: any) {
      // Repassa o erro para o middleware de tratamento global
      next(error); 
    }
  }

  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json(users);
    } catch (error: any) {
      next(error);
    }
  }
}
