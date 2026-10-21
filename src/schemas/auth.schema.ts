import { z } from 'zod';
import type { SignOptions } from 'jsonwebtoken';

type Expires = NonNullable<SignOptions['expiresIn']>;

const duration = (fallback: string) =>
  z
    .string()
    .regex(/^\d+(s|m|h|d)$/, 'Use formato como 30m, 1800s, 7d')
    .default(fallback)
    .transform((v) => v as Expires);

export const authSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: duration('30m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: duration('7d'),
});

export const authEnv = authSchema.parse(process.env);

export const refreshTokenSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do usuário inválido!'),
  }),
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token inválido!'),
  })
});