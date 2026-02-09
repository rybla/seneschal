import env from "@/env";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
});
export default ai;

/**
 * Extracts entities and relations from a user query using Gemini.
 * @param query The user's natural language query.
 * @returns A list of potential entity names found in the query.
 */
export async function extractQueryEntities(query: string): Promise<string[]> {
    const prompt = `
    Extract the key entities (people, companies, contracts, clauses, etc.) from the following query. 
    Return ONLY a JSON array of strings, where each string is an extracted entity name. 
    Do not include any markdown formatting or explanation.
    
    Query: "${query}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        });

        const text = response.text;

        if (!text) return [];

        // Clean up potential markdown code blocks
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr) as string[];
    } catch (e) {
        console.error("Failed to parse Gemini response for entity extraction", e);
        return [];
    }
}
