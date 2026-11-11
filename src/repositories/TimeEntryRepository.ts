import { prisma, type TimeEntries, type Prisma } from "@database/prisma";

// 1. Define os argumentos da consulta incluindo a relação 'timeSubEntries'
export const timeEntryWithSubEntriesArgs = {
  include: {
    timeSubEntries: true,
  },
} satisfies Prisma.TimeEntriesFindManyArgs;

// 2. Extrai o tipo gerado pelo Prisma contendo TimeEntries + array de timeSubEntries
export type TimeEntryWithSubEntries = Prisma.TimeEntriesGetPayload<typeof timeEntryWithSubEntriesArgs>;

export class TimeEntryRepository {
  async create(data: Prisma.TimeEntriesCreateInput): Promise<TimeEntries> {
    return prisma.timeEntries.create({
      data,
    })
  }

  async findAll(): Promise<TimeEntryWithSubEntries[]> {
    return prisma.timeEntries.findMany(timeEntryWithSubEntriesArgs);
  }

  async update(timeEntryId: number, data: Prisma.TimeEntriesUpdateInput): Promise<TimeEntries> {
    return prisma.timeEntries.update({
      where: { timeEntrieId: timeEntryId },
      data
    })
  }

  async delete(timeEntryId: number): Promise<TimeEntries> {
    return prisma.timeEntries.delete({
      where: { timeEntrieId: timeEntryId }
    })
  }

  async findById(timeEntryId: number): Promise<TimeEntryWithSubEntries | null> {
    return prisma.timeEntries.findUnique({
      where: { timeEntrieId: timeEntryId }, ...timeEntryWithSubEntriesArgs
    });
  }

  async findByDate(date: Date, projectId: number | null, userId: number | null): Promise<TimeEntries | null> {
    return prisma.timeEntries.findFirst({
      where: {
        date: date,
        projectId: projectId ?? undefined,
        userId: userId ?? undefined
      }
    });
  }
}