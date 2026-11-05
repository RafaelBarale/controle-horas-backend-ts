import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';

export const createTimeEntrySchema = z.object({
  body: z.object({
    // .datetime() exige estritamente o formato ISO 8601 Timestamp
    date: z.iso.date({ message: "A data deve estar no formato (AAAA-MM-DD)" })
      // Converte a string validada em objeto Date para o Prisma
      .transform((val) => new Date(val)),
    description: z.string()
      .trim()
      .nullish() // Aceita undefined ou null
      .transform((val) => (val === "" ? null : val)), // Transforma string vazia em null
    project: z.object({
      projectId: z.coerce.number({ message: 'O ID deve ser um número' }).
        int({ message: 'O ID deve ser um número inteiro' }).
        positive({ message: 'O ID deve ser maior que 0' })
    }),
    user: z.object({
      userId: z.coerce.number({ message: 'O ID deve ser um número' }).
        int({ message: 'O ID deve ser um número inteiro' }).
        positive({ message: 'O ID deve ser maior que 0' })
    }),
  })
});

export const updateTimeEntrySchema = z.object({
  params: getByIdParamsSchema,
    body: z.object({
    // .datetime() exige estritamente o formato ISO 8601 Timestamp
    date: z.iso.date({ message: "A data deve estar no formato (AAAA-MM-DD)" })
      // Converte a string validada em objeto Date para o Prisma
      .transform((val) => new Date(val)),
    description: z.string()
      .trim()
      .nullish() // Aceita undefined ou null
      .transform((val) => (val === "" ? null : val)), // Transforma string vazia em null
    project: z.object({
      projectId: z.coerce.number({ message: 'O ID deve ser um número' }).
        int({ message: 'O ID deve ser um número inteiro' }).
        positive({ message: 'O ID deve ser maior que 0' })
    }).optional(),
    user: z.object({
      userId: z.coerce.number({ message: 'O ID deve ser um número' }).
        int({ message: 'O ID deve ser um número inteiro' }).
        positive({ message: 'O ID deve ser maior que 0' })
    }).optional(),
  }),
});

export const getTimeEntrySchema = z.object({
  params: getByIdParamsSchema,
  query: z.object({
    page: z.string().optional().transform(Number),
  }),
});

export type CreateTimeEntryBody = z.infer<typeof createTimeEntrySchema>['body'];
export type UpdateTimeEntryParams = z.infer<typeof updateTimeEntrySchema>['params'];
export type UpdateTimeEntryBody = z.infer<typeof updateTimeEntrySchema>['body'];
