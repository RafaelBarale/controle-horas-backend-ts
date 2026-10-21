import { Router } from 'express';
import { UserController } from '@controllers/UserController';
import { validateRequest } from '@middlewares/validateRequest';
import { createUserSchema } from '@schemas/user.schema';

const userRoutes = Router();
const userController = new UserController();

// Vincula a rota ao mtodo do controlador
userRoutes.post('/', validateRequest(createUserSchema), userController.create.bind(userController));
userRoutes.get('/', userController.getAll.bind(userController));

export default userRoutes;
