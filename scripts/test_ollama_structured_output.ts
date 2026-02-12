import env from "@/env";
import { toJsonSchema } from "@/utility";
import { Ollama } from "ollama";
import z from "zod";

const privateClient = new Ollama({
  headers: { Authorization: "Bearer " + env.OLLAMA_API_KEY },
});

const schema = z.object({
  confidence: z.number().describe("Confidence level on a scale from 1 to 100"),
  capital: z.string(),
});

const response = await privateClient.chat({
  // NOTE: only the local version of gpt-oss supports structured output
  model: env.OLLAMA_MODEL,
  format: toJsonSchema(schema),
  messages: [
    {
      role: "user",
      content: "What is the capital of France?",
    },
  ],
});

console.log(response.message.content);
const data = schema.parse(JSON.parse(response.message.content));
console.log(data);

// import env from "@/env";

// fetch("http://localhost:11434/api/chat", {
//   method: "POST",
//   headers: {
//     Authorization: "Bearer " + env.OLLAMA_API_KEY,
//   },
//   body: JSON.stringify({
//     model: "gpt-oss:latest",
//     messages: [{ role: "user", content: "Tell me about Canada." }],
//     stream: false,
//     format: {
//       type: "object",
//       properties: {
//         name: { type: "string" },
//         capital: { type: "string" },
//         languages: {
//           type: "array",
//           items: { type: "string" },
//         },
//       },
//       required: ["name", "capital", "languages"],
//     },
//   }),
// })
//   .then((res) => res.json())
//   .then(console.log);
