declare global {
  namespace Express {
    interface Request {
      user?: { id: number | string; email: string; role?: string; name: string };
    }
  }
}

export { }; // Garante que o TS interprete como extensão de módulo
