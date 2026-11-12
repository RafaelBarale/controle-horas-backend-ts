import { Prisma, type TimeEntries } from "@database/prisma";
import { AppError } from "@utils/AppError";
import { TimeEntryRepository } from "@repositories/TimeEntryRepository";
import { UserRepository } from "@repositories/UserRepository";
import { ProjectRepository } from "@repositories/ProjectRepository";
import type { CreateTimeEntryBody, UpdateTimeEntryBody } from "@schemas/timeEntry.schema";
import { type TimeEntryWithSubEntries } from "@repositories/TimeEntryRepository";

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

  async getAll(): Promise<TimeEntryWithSubEntries[]> {
    return this.TimeEntryRepository.findAll();
  }

  async getByID(timeEntrieId: number): Promise<TimeEntries> {
    return this.getTimeOrThrow(timeEntrieId);
  }

  async delete(timeEntrieId: number): Promise<TimeEntries> {
    await this.getTimeOrThrow(timeEntrieId);
    return this.TimeEntryRepository.delete(timeEntrieId);
  }

  async create(data: CreateTimeEntryBody, userId: number): Promise<TimeEntries> {
    const { project, subTimeEntries, date, ...resdata } = data;

    const targetProjectId = project?.projectId;
    const targetUserId = userId;

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
    if (await this.TimeEntryRepository.findByDate(date, targetProjectId, targetUserId)) {
      throw new AppError('Ja existe lancamento de tempo nesta data para este projeto/usuario', 400);
    }

    const intervals = this.buildIntervals(subTimeEntries);
    const totalMinutes = intervals.reduce((sum, i) => sum + (i.fin - i.ini), 0);

    const dataCreate: Prisma.TimeEntriesCreateInput = {
      ...resdata,
      date: date,
      description: resdata.description ?? null,
      totalTime: totalMinutes / 60,
      project: { connect: { projectId: targetProjectId } },
      user: { connect: { userId: targetUserId } },
      timeSubEntries: {
        create: intervals.map(i => ({
          hourIni: this.minutesToTimeDate(i.ini, date),
          hourFin: this.minutesToTimeDate(i.fin, date),
          totalHour: this.minutesToHhmmss(i.fin - i.ini),
        })),
      },
    };
    return this.TimeEntryRepository.create(dataCreate);
  }

  async update(timeEntrieId: number, data: UpdateTimeEntryBody): Promise<TimeEntries> {
    const existingTime = await this.getTimeOrThrow(timeEntrieId);
    const { project, date, subTimeEntries, ...resdata } = data;
    const targetProjectId = project?.projectId ?? existingTime.projectId;
    const targetUserId = existingTime.userId;

    // Valida os intervalos antes de qualquer consulta ao banco
    const intervals = subTimeEntries ? this.buildIntervals(subTimeEntries) : null;

    if (targetUserId) {
      if (!await this.UserRepository.findById(targetUserId)) {
        throw new AppError('Id de usuario nao encontrado.', 404);
      }
    }

    if (project?.projectId && !await this.ProjectRepository.findById(project.projectId)) {
      throw new AppError('Id de projeto nao encontrado.', 404);
    }

    // 1. Buscamos o lancamento (que pode retornar o objeto ou null)
    const timeEntrie = await this.TimeEntryRepository.findByDate(date, targetProjectId, targetUserId);

    // 2. Validamos usando o operador ?. e adicionando a checagem se ele existe
    if (timeEntrie && timeEntrie.timeEntrieId !== timeEntrieId) {
      throw new AppError('Ja existe lancamento de tempo nesta data para este projeto/usuario', 400);
    }

    const dataUpdate: Prisma.TimeEntriesUpdateInput = {
      ...resdata,
      date: date,
      description: resdata.description ?? null,
    };

    if (project?.projectId) {
      Object.assign(dataUpdate, { project: { connect: { projectId: targetProjectId } } });
    }

    if (intervals) {
      const totalMinutes = intervals.reduce((sum, i) => sum + (i.fin - i.ini), 0);

      dataUpdate.totalTime = totalMinutes / 60;
      dataUpdate.timeSubEntries = {
        deleteMany: { timeEntrieId: timeEntrieId },
        create: intervals.map(i => ({
          hourIni: this.minutesToTimeDate(i.ini, date),
          hourFin: this.minutesToTimeDate(i.fin, date),
          totalHour: this.minutesToHhmmss(i.fin - i.ini),
        })),
      };
      return this.TimeEntryRepository.update(timeEntrieId, dataUpdate);
    }

    return this.TimeEntryRepository.update(timeEntrieId, dataUpdate);
  }

  // estruturando a logica para validar se as horas sao validas, nao se sobrepoem e se o horario de fim é maior que o de inicio
  private buildIntervals(subs: { hourIni: string; hourFin: string }[]) {
    if (subs.length === 0) {
      throw new AppError('É necessário informar pelo menos um intervalo.', 400);
    }

    const parsed = subs
      .map(s => {
        const ini = this.hhmmToMinutes(s.hourIni);
        const fin = this.hhmmToMinutes(s.hourFin);
        if (fin <= ini) {
          throw new AppError('hourFin deve ser maior que hourIni.', 400);
        }
        return { ini, fin };
      })
      .sort((a, b) => a.ini - b.ini);

    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].ini < parsed[i - 1].fin) {
        throw new AppError('Os intervalos do mesmo lançamento não podem se sobrepor.', 400);
      }
    }

    return parsed;
  }

  // funcao para transformar horas em minutos (aceita ate 24:00 no fim)
  private hhmmToMinutes(hhmm: string): number {
    if (hhmm === "24:00") {
      return 24 * 60; // 1440 minutos
    }
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
    if (!match) {
      throw new AppError(`Horario invalido: ${hhmm}`, 400);
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  // formata duracao de minutos para HH:MM:00.000Z
  private minutesToHhmmss(minutes: number): string {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}:00.000Z`;
  }

  // converte minutos a partir da meia-noite da data informada em objeto Date seguro
  private minutesToTimeDate(minutes: number, date: Date): Date {
    const dateFormt = this.formatarDataComOffset(date);
    const baseDate = new Date(`${dateFormt}T00:00:00.000Z`);
    return new Date(baseDate.getTime() + minutes * 60 * 1000);
  }

  // formata a data para o formato brasileiro sem offset
  private formatarDataComOffset(data: Date): string {
    const offsetEmMinutos: number = data.getTimezoneOffset();
    const dataAjustada: Date = new Date(data.getTime() - (offsetEmMinutos * 60000));
    return dataAjustada.toISOString().split('T')[0];
  }
}
