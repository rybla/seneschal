import { Ollama } from "ollama";
import env from "@/env";

const ollama = new Ollama({
  headers: { Authorization: "Bearer " + env.OLLAMA_API_KEY },
});

export async function chat(args: { prompt: string }) {
  const response = await ollama.chat({
    model: "gpt-oss:20b-cloud",
    messages: [
      {
        role: "user",
        content: args.prompt,
      },
    ],
  });
  return response.message.content;
}
