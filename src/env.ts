import z from "zod";

export const EnvSchema = z.object({
    DATABASE_URL: z.string(),
    GEMINI_API_KEY: z.string(),
    LINKUP_API_KEY: z.string(),
    PORT: z.coerce.number(),
})

const env = EnvSchema.parse(process.env);
export default env;

