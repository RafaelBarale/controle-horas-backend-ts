import { prisma, type Client, type Prisma } from '@database/prisma';

const clientSummaryArgs = {
  select: {
    clientId: true,
    name: true,
    email: true,
    status: true,
    ein: true
  },
} satisfies Prisma.ClientFindManyArgs;

export type ClientSummary = Prisma.ClientGetPayload<typeof clientSummaryArgs>;

export class ClientRepository {
  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data });
  }

  async findByEin(ein: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { ein } });
  }

  async findAll(): Promise<ClientSummary[]> {
    return prisma.client.findMany(clientSummaryArgs);
  }

  async findById(clientId: number): Promise<ClientSummary | null> {
    return prisma.client.findUnique({
      where: { clientId },
      ...clientSummaryArgs
    });
  }

  async update(clientId: number, data: Prisma.ClientUpdateInput): Promise<ClientSummary> {
    return prisma.client.update({ where: { clientId }, data, ...clientSummaryArgs });
  }

  async delete(clientId: number): Promise<ClientSummary> {
    return prisma.client.delete({ where: { clientId }, ...clientSummaryArgs });
  }
}
