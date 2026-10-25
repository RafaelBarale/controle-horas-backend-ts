import { ClientService } from "@services/ClientService";
import { getByIdParamsSchema } from "@schemas/id.schema";
import type { NextFunction, Request, Response } from "express";

export class ClientController {

  private clientService = new ClientService();

  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, ein, status } = request.body;

      const client = await this.clientService.registerClient({ name, email, ein, status });

      response.status(201).json(client);
    } catch (error: any) {
      next(error);
    }
  }

  async getAll(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await this.clientService.getAllClients();
      response.status(200).json(clients);
    } catch (error: any) {
      next(error);
    }
  }

  async update(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const { name, email, ein, status } = request.body;
      const client = await this.clientService.updateClient(parsedParams.id, { name, email, ein, status });
      response.status(200).json(client);
    } catch (error: any) {
      next(error);
    }
  }

  async getByID(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const client = await this.clientService.getByID(parsedParams.id);
      response.status(200).json(client);
    } catch (error: any) {
      next(error);
    }
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const client = await this.clientService.delete(parsedParams.id);
      response.status(200).json(client);
    } catch (error: any) {
      next(error);
    }
  }
}