// src/utils/AppError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Identifica que é um erro previsto pela aplicação

    Object.setPrototypeOf(this, new.target.prototype); // Restaura a cadeia de protótipos nativa
    Error.captureStackTrace(this, this.constructor);
  }
}
