import { prisma, type Projects, type Prisma } from "@database/prisma";

export class ProjectRepository {
  async create(data: Prisma.ProjectsCreateInput): Promise<Projects> {
    return prisma.projects.create({
      data,
    });
  }

  async findAll(): Promise<Projects[]> {
    return prisma.projects.findMany();
  }

  async findByTitle(title: string, clientId: number): Promise<Projects | null> {
    return prisma.projects.findFirst({
      where: { title, clientId },
    });
  }

  async update(projectId: number, data: Prisma.ProjectsUpdateInput): Promise<Projects> {
    return prisma.projects.update({
      where: { projectId },
      data,
    });
  }

  async findById(projectId: number): Promise<Projects | null> {
    return prisma.projects.findUnique({
      where: { projectId },
    });
  }

  async delete(projectId: number): Promise<Projects> {
    return prisma.projects.delete({
      where: { projectId },
    });
  }
}