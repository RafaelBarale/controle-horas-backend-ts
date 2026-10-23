import { Router } from 'express';
import { UserController } from '@controllers/UserController';
import { validateRequest } from '@middlewares/validateRequest';
import { createUserSchema, updateUserSchema, getUserSchema } from '@schemas/user.schema';

const userRoutes = Router();
const userController = new UserController();

// Vincula a rota ao mtodo do controlador
userRoutes.post('/', validateRequest(createUserSchema), userController.create.bind(userController));
userRoutes.get('/', userController.getAll.bind(userController));
userRoutes.put('/:userId', validateRequest(updateUserSchema), userController.update.bind(userController));
userRoutes.get('/:userId', validateRequest(getUserSchema), userController.getByID.bind(userController));
userRoutes.delete('/:userId', validateRequest(getUserSchema), userController.delete.bind(userController));

export default userRoutes;
