import { Prisma, type TimeEntries } from "@database/prisma";
import { AppError } from "@utils/AppError";
import { TimeEntryRepository } from "@repositories/TimeEntryRepository";
import { UserRepository } from "@repositories/UserRepository";
import { ProjectRepository } from "@repositories/ProjectRepository";
import type { CreateTimeEntryBody, UpdateTimeEntryBody } from "@schemas/timeEntry.schema";

export class TimeEntryService {
  private TimeEntryRepository = new TimeEntryRepository();
  private UserRepository = new UserRepository();
  private ProjectRepository = new ProjectRepository();

  // Helper privado para eliminar repeticao de codigo (DRY)
  private async getTimeOrThrow(timeEntrieId: number): Promise<TimeEntries> {
    const timeEntrie = await this.TimeEntryRepository.findById(timeEntrieId);
    if (!timeEntrie) throw new AppError('Id de tempo nao encontrado.', 404);
    return timeEntrie;
  }

  async getAllTime(): Promise<TimeEntries[]> {
    return this.TimeEntryRepository.findAll();
  }

  async getByID(timeEntrieId: number): Promise<TimeEntries> {
    return this.getTimeOrThrow(timeEntrieId);
  }

  async delete(timeEntrieId: number): Promise<TimeEntries> {
    await this.getTimeOrThrow(timeEntrieId);
    return this.TimeEntryRepository.delete(timeEntrieId);
  }

  async create(data: CreateTimeEntryBody): Promise<TimeEntries> {
    const { project, user, date, ...resdata } = data;
    const targetDate = new Date(date.toISOString().split('T')[0]);

    const targetProjectId = project?.projectId;
    const targetUserId = user?.userId;

    if (!targetProjectId || !targetUserId) {
      throw new AppError('O ID do projeto e do usuario sao obrigatorios.', 400);
    }

    if (!await this.ProjectRepository.findById(targetProjectId)) {
      throw new AppError('Id de projeto nao encontrado.', 404);
    }

    if (!await this.UserRepository.findById(targetUserId)) {
      throw new AppError('Id de usuario nao encontrado.', 404);
    }

    // Validamos usando o operador ?. e adicionando a checagem se ele existe
    if (await this.TimeEntryRepository.findByDate(targetDate, targetProjectId, targetUserId)) {
      throw new AppError('Ja existe lancamento de tempo nesta data para este projeto/usuario', 400);
    }

    const dataCreate: Prisma.TimeEntriesCreateInput = {
      ...resdata,
      date: targetDate,
      description: resdata.description ?? null,
      project: { connect: { projectId: targetProjectId } },
      user: { connect: { userId: targetUserId } }
    };
    return this.TimeEntryRepository.create(dataCreate);
  }

  async updateTimeEntrie(timeEntrieId: number, data: UpdateTimeEntryBody): Promise<TimeEntries> {
    await this.getTimeOrThrow(timeEntrieId);
    const { project, user, date, ...resdata } = data;
    const targetDate = new Date(date.toISOString().split('T')[0]);
    const projectId = project?.projectId ?? null;
    const userId = user?.userId ?? null;

    if (userId) {
      if (!await this.UserRepository.findById(userId)) {
        throw new AppError('Id de usuario nao encontrado.', 404);
      }
    }

    if (projectId) {
      if (!await this.ProjectRepository.findById(projectId)) {
        throw new AppError('Id de projeto nao encontrado.', 404);
      }
    }

    // 1. Buscamos o lancamento (que pode retornar o objeto ou null)
    const timeEntrie = await this.TimeEntryRepository.findByDate(targetDate, projectId, userId);

    // 2. Validamos usando o operador ?. e adicionando a checagem se ele existe
    if (timeEntrie && timeEntrie.timeEntrieId !== timeEntrieId) {
      throw new AppError('Ja existe lancamento de tempo nesta data para este projeto/usuario', 400);
    }

    const dataUpdate: Prisma.TimeEntriesUpdateInput = {
      ...resdata,
      date: targetDate,
      description: resdata.description ?? null,
      // project: { connect: { projectId: projectId ?? undefined } },
      // user: { connect: { userId: userId ?? undefined } }
    };

    if (projectId) {
      Object.assign(dataUpdate, { project: { connect: { projectId } } });
    }

    if (userId) {
      Object.assign(dataUpdate, { user: { connect: { userId } } });
    }
    return this.TimeEntryRepository.update(timeEntrieId, dataUpdate);
  }
}
