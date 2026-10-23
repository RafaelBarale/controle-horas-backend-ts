import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';

// Exemplo: Criação de um novo usuário
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 dígitos'),
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
    email: z.string().email('E-mail inválido').optional(),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 dígitos').optional(),
  })
});
