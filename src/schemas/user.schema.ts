import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';
import { $Enums } from '@database/prisma';

// Exemplo: Criação de um novo usuário
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 dígitos'),
    role: z.enum($Enums.Role),
    status: z.enum($Enums.Status),
  }),
});

export const getUserSchema = z.object({
  params: getByIdParamsSchema,
  query: z.object({
    page: z.string().optional().transform(Number),
  }),
});

export const updateUserSchema = z.object({
  params: getByIdParamsSchema,
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').optional(),
    email: z.email('E-mail inválido').optional(),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 dígitos').optional(),
    role: z.enum($Enums.Role).optional(),
    status: z.enum($Enums.Status).optional(),
  })
});
// Extrai especificamente a tipagem do objeto body
export type UpdateUserBody = z.infer<typeof updateUserSchema>['body'];
