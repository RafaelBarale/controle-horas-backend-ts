import { Router } from 'express';
import { ProjectController } from '@controllers/ProjectController';
import { validateRequest } from '@middlewares/validateRequest';
import { createProjectSchema, updateProjectSchema, getProjectSchema } from '@schemas/project.schema';

const projectRoutes = Router();
const projectController = new ProjectController();

projectRoutes.post('/', validateRequest(createProjectSchema), projectController.create.bind(projectController));
projectRoutes.get('/', projectController.getAll.bind(projectController));
projectRoutes.put('/:id', validateRequest(updateProjectSchema), projectController.update.bind(projectController));
projectRoutes.get('/:id', validateRequest(getProjectSchema), projectController.getByID.bind(projectController));
projectRoutes.delete('/:id', validateRequest(getProjectSchema), projectController.delete.bind(projectController));


export default projectRoutes;
