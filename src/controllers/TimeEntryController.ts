import { getByIdParamsSchema } from "@schemas/id.schema";
import type { NextFunction, Request, Response } from "express";
import { TimeEntryService } from "@services/TimeEntryService";

export class TimeEntryController {
  private timeService = new TimeEntryService();
  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const dataBody = request.body;
      const project = await this.timeService.create(dataBody);
      response.status(201).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async getAll(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await this.timeService.getAllTime();
      response.status(200).json(projects);
    } catch (error: any) {
      next(error);
    }
  }

  async update(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const dataBody = request.body;
      const project = await this.timeService.updateTimeEntrie(parsedParams.id, dataBody);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async getByID(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const project = await this.timeService.getByID(parsedParams.id);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const project = await this.timeService.delete(parsedParams.id);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }
}