import { z } from 'zod';

export const getByIdParamsSchema = z.object({
  userId: z.coerce.number({ message: 'O ID deve ser um número' }).
    int({ message: 'O ID deve ser um número inteiro' }).
    positive({ message: 'O ID deve ser maior que 0' })
});

// 2. Extrai o tipo inferido pelo Zod (aqui userId já será do tipo 'number')
export type GetByIdParams = z.infer<typeof getByIdParamsSchema>;