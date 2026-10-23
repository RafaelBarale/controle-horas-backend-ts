import { prisma, type Client, type Prisma } from '@database/prisma';

const clientSummaryArgs = {
  select: {
    clientId: true,
    name: true,
    email: true,
    status: true,
  },
} satisfies Prisma.ClientFindManyArgs;

export type ClientSummary = Prisma.ClientGetPayload<typeof clientSummaryArgs>;

export class ClientRepository {
  async create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data });
  }

  async findAll(): Promise<ClientSummary[]> {
    return prisma.client.findMany(clientSummaryArgs);
  }
}
