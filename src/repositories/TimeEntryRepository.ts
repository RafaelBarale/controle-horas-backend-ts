import { prisma, type TimeEntries, type Prisma } from "@database/prisma";

export class TimeEntryRepository {
  async create(data: Prisma.TimeEntriesCreateInput): Promise<TimeEntries> {
    return prisma.timeEntries.create({
      data,
    })
  }

  async findAll(): Promise<TimeEntries[]> {
    return prisma.timeEntries.findMany();
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

  async findById(timeEntryId: number): Promise<TimeEntries | null> {
    return prisma.timeEntries.findUnique({
      where: { timeEntrieId: timeEntryId }
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