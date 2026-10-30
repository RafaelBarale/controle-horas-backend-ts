import { getByIdParamsSchema } from "@schemas/id.schema";
import type { NextFunction, Request, Response } from "express";
import { ProjectService } from "@services/ProjectService";

export class ProjectController {
  private projectService = new ProjectService();
  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const dataBody = request.body;
      const project = await this.projectService.createProject(dataBody);
      response.status(201).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async getAll(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await this.projectService.getAllProjects();
      response.status(200).json(projects);
    } catch (error: any) {
      next(error);
    }
  }

  async update(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const dataBody = request.body;
      const project = await this.projectService.updateProject(parsedParams.id, dataBody);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async getByID(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const project = await this.projectService.getByID(parsedParams.id);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const project = await this.projectService.delete(parsedParams.id);
      response.status(200).json(project);
    } catch (error: any) {
      next(error);
    }
  }
}