// schemas/logout.schema.ts
import { z } from 'zod';

export const logoutSchema = z.object({
    authorization: z
        .string()
        .min(1, "Authorization is required.")
        .regex(/^Bearer\s.+$/, {
            message: "Invalid authorization header format. Expected 'Bearer <token>'."
        })
});
