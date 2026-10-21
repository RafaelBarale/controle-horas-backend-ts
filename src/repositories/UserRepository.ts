import { prisma } from '@database/prisma';
import type { Prisma, User } from '@prisma/client';

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

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findAll(): Promise<UserSummary[]> {
    return prisma.user.findMany(userSummaryArgs);
  }
}
