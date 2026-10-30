import { Prisma, type Projects } from "@database/prisma";
import { AppError } from "@utils/AppError";
import type{ UpdateProjectBody, CreateProjectBody } from "@schemas/project.schema";
import { ProjectRepository } from "@repositories/ProjectRepository";
import { ClientRepository } from "@repositories/ClientRepository";

export class ProjectService {
  private projectRepository = new ProjectRepository();
  private clientRepository = new ClientRepository();

  // Helper privado para eliminar repetição de código (DRY)
  private async getProjectOrThrow(projectId: number): Promise<Projects> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new AppError('Projeto não encontrado.', 404);
    return project;
  }

  async createProject(data: CreateProjectBody): Promise<Projects> {

    const { client, ...resdata } = data;
    const targetClientId = client?.clientId;

    // Se o cliente é obrigatório no banco, precisamos validar se ele foi enviado no DTO
    if (!targetClientId) {
      throw new AppError('O ID do cliente é obrigatório para criar um projeto.', 400);
    }

    if (!await this.clientRepository.findById(targetClientId)) {
      throw new AppError('Cliente não encontrado.', 404);
    }

    // Valida o título considerando o cliente
    if (await this.projectRepository.findByTitle(resdata.title, targetClientId)) {
      throw new AppError('Projeto já existe para este cliente.', 400);
    }
    
    const dataCreate: Prisma.ProjectsCreateInput = {
    ...resdata,
    client: {
        connect: { clientId: targetClientId } 
      }
    };
    
    return this.projectRepository.create(dataCreate);
  }

  async getAllProjects(): Promise<Projects[]> {
    return this.projectRepository.findAll();
  }

  async getByID(projectId: number): Promise<Projects> {
    return this.getProjectOrThrow(projectId);
  }

  async delete(projectId: number): Promise<Projects> {
    await this.getProjectOrThrow(projectId);
    return this.projectRepository.delete(projectId);
  }

  async updateProject(projectId: number, data: UpdateProjectBody): Promise<Projects> {
    const project = await this.getProjectOrThrow(projectId);
    const { client, ...resdata } = data;

    if (client && !await this.clientRepository.findById(client.clientId)) {
      throw new AppError('Cliente não encontrado.', 404);
    }

    // Valida o título considerando o cliente atual OU o novo cliente que está sendo atribuído
    const targetClientId = client?.clientId ?? project.clientId;
    if (resdata?.title && project.title !== resdata.title) {
      if (await this.projectRepository.findByTitle(resdata.title, targetClientId)) {
        throw new AppError('Projeto já existe para este cliente.', 400);
      }
    }

    const dataUpdate: Prisma.ProjectsUpdateInput = {
      ...resdata,
      ...(client?.clientId ? { client: { connect: { clientId: targetClientId } } } : {})
    };

    return this.projectRepository.update(projectId, dataUpdate);
  }
}
