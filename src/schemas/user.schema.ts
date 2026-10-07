import { z } from 'zod';

// Exemplo: Criação de um novo usuário
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 dígitos'),
  }),
  // Se não houver params ou query, você não precisa declará-los aqui,
  // pois o ZodTypeAny aceita objetos parcialmente definidos.
});

// Exemplo: Buscar usuário por ID com filtros de paginação
export const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido (deve ser UUID)'),
  }),
  query: z.object({
    page: z.string().optional().transform(Number), // Transforma string da URL em número
  }),
});
