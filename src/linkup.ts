import { LinkupClient, type LinkupSearchResponse, type SearchParams, type Structured } from "linkup-sdk";
import env from './env';
import z from "zod";
import { toJsonSchema } from "@/utility";

const client = new LinkupClient({
    apiKey: env.LINKUP_API_KEY,
});

// const CompanyRevenueSchema = {
//     "type": "object",
//     "properties": {
//         "companyName": {
//             "type": "string",
//             "description": "The name of the company"
//         },
//         "revenueAmount": {
//             "type": "number",
//             "description": "The revenue amount"
//         },
//         "fiscalYear": {
//             "type": "string",
//             "description": "The fiscal year for this revenue"
//         }
//     }
// };

export type CompanyRevenue = z.infer<typeof CompanyRevenueSchema>;
export const CompanyRevenueSchema = z.object({
    companyName: z.string(),
    revenueAmount: z.number(),
    fiscalYear: z.string()
});

export async function searchCompanyRevenue(companyName: string, year: string): Promise<CompanyRevenue> {
    const response = await client.search({
        query: `What is ${companyName}'s ${year} revenue?`,
        depth: 'deep',
        outputType: 'structured',
        structuredOutputSchema: toJsonSchema(CompanyRevenueSchema)
    });
    return CompanyRevenueSchema.parse(response);
};
