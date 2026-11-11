import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const timeEntryPeriodSchema = z.object({
  hourIni: z.iso.time({ message: "A hora inicial deve estar no formato (HH:MM)" }),
  hourFin: z.iso.time({ message: "A hora final deve estar no formato (HH:MM)" }),
})
  // Garante que o fim é depois do início em cada período
  .refine((period) => toMinutes(period.hourIni) < toMinutes(period.hourFin), {
    message: "A hora final deve ser maior que a hora inicial",
  });

export const createTimeEntrySchema = z.object({
  body: z.object({
    // .datetime() exige estritamente o formato ISO 8601 Timestamp
    date: z.iso.date({ message: "A data deve estar no formato (AAAA-MM-DD)" })
      // Converte a string validada em objeto Date para o Prisma
      .transform((val) => new Date(`${val}T12:00:00.000Z`)),
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
    subTimeEntries: z.array(timeEntryPeriodSchema)
      .min(1, { message: "Informe ao menos um período de inicio e fim" })
      .superRefine((periods, ctx) => {
        const sorted = [...periods].sort((a, b) => toMinutes(a.hourIni) - toMinutes(b.hourFin));

        for (let i = 1; i < sorted.length; i++) {
          const current = sorted[i];
          const previus = sorted[i - 1];
          
          if (toMinutes(current.hourIni) < toMinutes(previus.hourFin)) {
            ctx.addIssue({
              code: "custom",
              message: "Os períodos não podem se sobrepor",
              path: ["subTimeEntries"],    
            })
          }
        }
      })
  })
});

export const updateTimeEntrySchema = z.object({
  params: getByIdParamsSchema,
  body: z.object({
    // .datetime() exige estritamente o formato ISO 8601 Timestamp
    date: z.iso.date({ message: "A data deve estar no formato (AAAA-MM-DD)" })
      // Converte a string validada em objeto Date para o Prisma
      .transform((val) => new Date(`${val}T12:00:00.000Z`)),
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
    subTimeEntries: z.array(timeEntryPeriodSchema)
      .min(1, { message: "Informe ao menos um período de inicio e fim" })
      .superRefine((periods, ctx) => {
        const sorted = [...periods].sort((a, b) => toMinutes(a.hourIni) - toMinutes(b.hourFin));

        for (let i = 1; i < sorted.length; i++) {
          const current = sorted[i];
          const previus = sorted[i - 1];
          
          if (toMinutes(current.hourIni) < toMinutes(previus.hourFin)) {
            ctx.addIssue({
              code: "custom",
              message: "Os períodos não podem se sobrepor",
              path: ["subTimeEntries"],    
            })
          }
        }
      })
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
