import { Router } from 'express';
import { ClientController } from '@controllers/ClientController';
import { validateRequest } from '@middlewares/validateRequest';
import { createClientSchema, updateClientSchema, getClientSchema } from '@schemas/client.schema';

const clientRoutes = Router();
const clientController = new ClientController();

clientRoutes.post('/', validateRequest(createClientSchema), clientController.create.bind(clientController));
clientRoutes.get('/', clientController.getAll.bind(clientController));
clientRoutes.put('/:id', validateRequest(updateClientSchema), clientController.update.bind(clientController));
clientRoutes.get('/:id', validateRequest(getClientSchema), clientController.getByID.bind(clientController));
clientRoutes.delete('/:id', validateRequest(getClientSchema), clientController.delete.bind(clientController));

export default clientRoutes;