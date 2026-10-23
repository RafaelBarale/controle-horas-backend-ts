import type { Request, Response, NextFunction } from 'express';
import { UserService } from '@services/UserService';
import { getByIdParamsSchema } from '@schemas/id.schema';

export class UserController {
  private userService = new UserService();

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const user = await this.userService.registerUser({ name, email, password });
      
      res.status(201).json(user);
    } catch (error: any) {
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

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(req.params);
      const { name, email, password } = req.body;
      const user = await this.userService.updateUser(parsedParams.userId, { name, email, password });
      res.status(200).json(user);
    } catch (error: any) {
      next(error);
    }
  }

  async getByID(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(req.params);
      const user = await this.userService.getByID(parsedParams.userId);
      res.status(200).json(user);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(req.params);
      const user = await this.userService.delete(parsedParams.userId);
      res.status(200).json(user);
    } catch (error: any) {
      next(error);
    }
  }

}
