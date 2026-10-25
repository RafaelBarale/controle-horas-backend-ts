import { Router } from 'express';
import { UserController } from '@controllers/UserController';
import { validateRequest } from '@middlewares/validateRequest';
import { createUserSchema, updateUserSchema, getUserSchema } from '@schemas/user.schema';

const userRoutes = Router();
const userController = new UserController();

// Vincula a rota ao método do controlador
userRoutes.post('/', validateRequest(createUserSchema), userController.create.bind(userController));
userRoutes.get('/', userController.getAll.bind(userController));
userRoutes.put('/:id', validateRequest(updateUserSchema), userController.update.bind(userController));
userRoutes.get('/:id', validateRequest(getUserSchema), userController.getByID.bind(userController));
userRoutes.delete('/:id', validateRequest(getUserSchema), userController.delete.bind(userController));

export default userRoutes;
