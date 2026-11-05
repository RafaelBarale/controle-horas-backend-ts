import { Router } from 'express';
import { TimeEntryController } from '@controllers/TimeEntryController';
import { validateRequest } from '@middlewares/validateRequest';
import { createTimeEntrySchema, updateTimeEntrySchema, getTimeEntrySchema } from '@schemas/timeEntry.schema';

const timeEntryRoutes = Router();
const timeController = new TimeEntryController();

timeEntryRoutes.post('/', validateRequest(createTimeEntrySchema), timeController.create.bind(timeController));
timeEntryRoutes.get('/', timeController.getAll.bind(timeController));
timeEntryRoutes.put('/:id', validateRequest(updateTimeEntrySchema), timeController.update.bind(timeController));
timeEntryRoutes.get('/:id', validateRequest(getTimeEntrySchema), timeController.getByID.bind(timeController));
timeEntryRoutes.delete('/:id', validateRequest(getTimeEntrySchema), timeController.delete.bind(timeController));


export default timeEntryRoutes;
