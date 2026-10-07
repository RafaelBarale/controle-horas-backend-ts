import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';

// 1. Criamos um tipo base que representa o que o middleware espera receber/validar
type RequestValidationSchema = z.ZodType<{
  body?: any;
  query?: any;
  params?: any;
}>;

// 2. Restringimos o genérico <T> para herdar dessa nossa estrutura base
export const validateRequest = <T extends RequestValidationSchema>(schema: T): RequestHandler => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Agora o TS sabe que 'validated' obrigatoriamente contém body, query e/params se fornecidos
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // O erro 'Property body does not exist' desaparece completamente!
      if ('body' in validated) req.body = validated.body;
      if ('query' in validated) req.query = validated.query;
      if ('params' in validated) req.params = validated.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.log(error);
        res.status(400).json({
          status: 'error',
          message: 'Dados inválidos',
          errors: error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
