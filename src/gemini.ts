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

/**
 * Extracts entities and relations from a document text chunk.
 * @param text The text chunk from the document.
 * @returns An object containing extracted entities and relations.
 */
export async function extractEntitiesAndRelations(text: string): Promise<{
    entities: { name: string; type: string; description: string }[];
    relations: { source: string; target: string; type: string; description: string }[];
}> {
    const prompt = `
    Analyze the following text from a legal document or contract.
    Extract key entities (People, Companies, Dates, Clauses, Locations, etc.) and the relations between them.
    
    Return a JSON object with two arrays: "entities" and "relations".
    
    "entities": [
        { "name": "Exact Name", "type": "TYPE (e.g. PERSON, COMPANY, DATE, CLAUSE, LOCATION)", "description": "Brief description based on context" }
    ]
    
    "relations": [
        { "source": "Exact Name of Source Entity", "target": "Exact Name of Target Entity", "type": "RELATION_TYPE (e.g. SIGNED, LOCATED_AT, EXPIRES_ON, CONTAINS)", "description": "Brief explanation of the relation" }
    ]

    Return ONLY the JSON. No markdown, no explanations.

    Text:
    "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        });

        const resultText = response.text;
        if (!resultText) return { entities: [], relations: [] };

        const jsonStr = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonStr);

        return {
            entities: data.entities || [],
            relations: data.relations || []
        };

    } catch (e) {
        console.error("Failed to extract entities and relations", e);
        return { entities: [], relations: [] };
    }
}
