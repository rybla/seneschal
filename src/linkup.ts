import { toJsonSchema } from "@/utility";
import { LinkupClient } from "linkup-sdk";
import z from "zod";
import env from "./env";

const client = new LinkupClient({
  apiKey: env.LINKUP_API_KEY,
});

export async function searchLinkup<A>(
  query: string,
  schema: z.ZodType<A>,
): Promise<A> {
  const response = await client.search({
    query,
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: toJsonSchema(schema),
  });
  return schema.parse(response);
}
