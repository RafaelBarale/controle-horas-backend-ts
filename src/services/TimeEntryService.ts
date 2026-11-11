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

  async create(data: CreateTimeEntryBody): Promise<TimeEntries> {
    const { project, user, subTimeEntries, date, ...resdata } = data;
    // const targetDate = new Date(date.toISOString().split('T')[0]);

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
          hourIni: this.minutesToTimeDate(i.ini, date),//.toISOString().split('T')[1],
          hourFin: this.minutesToTimeDate(i.fin, date),//.toISOString().split('T')[1],
          totalHour: this.minutesToTimeDate(i.fin - i.ini, date).toISOString().split('T')[1],
        })),
      },
    };
    return this.TimeEntryRepository.create(dataCreate);
  }

  async update(timeEntrieId: number, data: UpdateTimeEntryBody): Promise<TimeEntries> {
    await this.getTimeOrThrow(timeEntrieId);

    const { project, user, date, subTimeEntries, ...resdata } = data;
    // const targetDate = new Date(date.toISOString().split('T')[0]);
    const projectId = project?.projectId ?? null;
    const userId = user?.userId ?? null;

    // Valida os intervalos antes de qualquer consulta ao banco
    const intervals = subTimeEntries ? this.buildIntervals(subTimeEntries) : null;


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
    const timeEntrie = await this.TimeEntryRepository.findByDate(date, projectId, userId);

    // 2. Validamos usando o operador ?. e adicionando a checagem se ele existe
    if (timeEntrie && timeEntrie.timeEntrieId !== timeEntrieId) {
      throw new AppError('Ja existe lancamento de tempo nesta data para este projeto/usuario', 400);
    }

    const dataUpdate: Prisma.TimeEntriesUpdateInput = {
      ...resdata,
      date: date,
      description: resdata.description ?? null,
    };

    if (projectId) {
      Object.assign(dataUpdate, { project: { connect: { projectId } } });
    }

    if (userId) {
      Object.assign(dataUpdate, { user: { connect: { userId } } });
    }

    if (intervals) {
      const totalMinutes = intervals.reduce((sum, i) => sum + (i.fin - i.ini), 0);

      dataUpdate.totalTime = totalMinutes / 60;
      dataUpdate.timeSubEntries = {
        deleteMany: { timeEntrieId: timeEntrieId },
        create: intervals.map(i => ({
          hourIni: this.minutesToTimeDate(i.ini, date),
          hourFin: this.minutesToTimeDate(i.fin, date),
          totalHour: this.minutesToTimeDate(i.fin - i.ini, date).toISOString().split('T')[1],
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


  //  funcao para transformar horas em minutos
  private hhmmToMinutes(hhmm: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
    if (!match) {
      throw new AppError(`Horario invalido: ${hhmm}`, 400);
    }
    return Number(match[1]) * 60 + Number(match[2]);
  }

  //funcao para transformar minutos em horas e minutos (exemplo: 125 -> 02:05)
  private minutesToTimeDate(minutes: number, date: Date): Date {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    const dateFormt = this.formatarDataComOffset(date)
    // return new Date(`1970-01-01T${h}:${m}:00Z`);
    return new Date(`${dateFormt}T${h}:${m}:00Z`);
  };

  //formata a data para o formato brasileiro sem offset
  private formatarDataComOffset(data: Date): string {
    // Obtém a diferença entre o horário local e o UTC em minutos (ex: 180 para GMT-3)
    const offsetEmMinutos: number = data.getTimezoneOffset();

    // Cria uma nova data ajustada (converte minutos para milissegundos multiplicando por 60.000)
    const dataAjustada: Date = new Date(data.getTime() - (offsetEmMinutos * 60000));

    // Agora o toISOString() vai refletir exatamente o horário local
    return dataAjustada.toISOString().split('T')[0];
  }

}