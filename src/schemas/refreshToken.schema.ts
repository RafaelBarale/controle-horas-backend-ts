// schemas/refreshToken.schema.ts
import { z } from 'zod';

export const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1),
    grant_type: z.enum(['refresh_token']),
    /** quando trabalhar com multi empresa, o client_id e secret deverão ser enviados no body*/
    // clientId: z.string().min(1),
    // clientSecret: z.string().min(1),
});