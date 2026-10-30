import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';
import { $Enums } from '@database/prisma';

// Criação de um novo cliente
export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.email('E-mail inválido'),
    ein: z.string().min(2, 'O EIN deve ter pelo menos 2 caracteres').max(14, 'O EIN deve ter no máximo 14 caracteres'),
    status: z.enum($Enums.Status).optional(),
  }),
});

export const getClientSchema = z.object({
  params: getByIdParamsSchema,
  query: z.object({
    page: z.string().optional().transform(Number),
  }),
});

export const updateClientSchema = z.object({
  params: getByIdParamsSchema,
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').optional(),
    email: z.email('E-mail inválido').optional(),
    ein: z.string().min(2, 'O EIN deve ter pelo menos 2 caracteres').max(14, 'O EIN deve ter no máximo 14 caracteres').optional(),
    status: z.enum($Enums.Status).optional(),
  })
});
// Extrai especificamente a tipagem do objeto body
export type UpdateClientBody = z.infer<typeof updateClientSchema>['body'];
