import env from "@/env";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
});
export default ai;
