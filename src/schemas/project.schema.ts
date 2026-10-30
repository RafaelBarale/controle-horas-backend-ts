import { z } from 'zod';
import { $Enums } from '@database/prisma';
import { getByIdParamsSchema } from '@schemas/id.schema';

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    description: z.string().nullable().optional(),
    price: z.number().positive().nullable().optional(),
    type: z.enum($Enums.TypeProject).optional(),
    status: z.enum($Enums.StatusProject).optional(),
    client: z.object({
      clientId: z.coerce.number({ message: 'O ID deve ser um número' }).
      int({ message: 'O ID deve ser um número inteiro' }).
      positive({ message: 'O ID deve ser maior que 0' })
    }).optional(),
  })
});

export const updateProjectSchema = z.object({
  params: getByIdParamsSchema,
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().nullable().optional(),
    price: z.number().positive().nullable().optional(),
    type: z.enum($Enums.TypeProject).optional(),
    status: z.enum($Enums.StatusProject).optional(),
    client: z.object({
      clientId: z.coerce.number({ message: 'O ID deve ser um número' }).
      int({ message: 'O ID deve ser um número inteiro' }).
      positive({ message: 'O ID deve ser maior que 0' })
    }).optional(),
  }),
});

export const getProjectSchema = z.object({
  params: getByIdParamsSchema,
  query: z.object({
    page: z.string().optional().transform(Number),
  }),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectParams = z.infer<typeof updateProjectSchema>['params'];
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>['body'];
