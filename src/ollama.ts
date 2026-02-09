import { Ollama } from "ollama";

const ollama = new Ollama();

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
