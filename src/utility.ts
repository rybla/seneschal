import { z } from "zod";

export type AssertSubtype<T extends U, U> = T;

/**
 * Converts a Zod schema to a JSON schema.
 * @param schema The Zod schema to convert.
 * @returns The JSON schema.
 */
export function toJsonSchema(schema: z.ZodTypeAny) {
    return z.toJSONSchema(schema, { target: "openapi-3.0" });
}
