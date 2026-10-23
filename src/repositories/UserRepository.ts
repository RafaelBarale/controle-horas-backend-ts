import { prisma, type User, type Prisma } from '@database/prisma';

// 1. Defina os argumentos da consulta (o seu select)
const userSummaryArgs = {
  // select: {
  //   userId: true,
  //   name: true,
  //   email: true,
  // },
  omit: { password: true }
} satisfies Prisma.UserFindManyArgs; // Garante que a estrutura está correta

// 2. Crie o tipo baseado nos argumentos acima
export type UserSummary = Prisma.UserGetPayload<typeof userSummaryArgs>;

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email }});
  }

  async create(data: Prisma.UserCreateInput): Promise<UserSummary> {
    return prisma.user.create({ data, ...userSummaryArgs });
  }

  async findAll(): Promise<UserSummary[]> {
    return prisma.user.findMany(userSummaryArgs);
  }

  async update(userId: number, data: Prisma.UserUpdateInput): Promise<UserSummary> {
    return prisma.user.update({ where: { userId }, data, ...userSummaryArgs });
  }

  async findById(userId: number): Promise<UserSummary | null> {
    return prisma.user.findUnique({
      where: { userId },
      ...userSummaryArgs 
    });
  }

  async delete(userId: number): Promise<UserSummary> {
    return prisma.user.delete({ where: { userId }, ...userSummaryArgs });
  }
}
