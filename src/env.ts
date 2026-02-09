import z from "zod";

export const EnvSchema = z.object({
    DATABASE_URL: z.string(),
    PORT: z.number(),
})

const env = EnvSchema.parse(process.env);
export default env;

