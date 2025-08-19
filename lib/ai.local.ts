// lib/ai.local.ts
import { initLlama, type LlamaContext } from "llama.rn";
import { ensureModel, type ModelChoice } from "./LocalModel";

export type Message = { id: string; role: "user" | "assistant" | "system"; content: string };

let ctx: LlamaContext | null = null;
let loadedModel: ModelChoice | null = null;

// load once per app session
async function getContext(choice: ModelChoice = "1b"): Promise<LlamaContext> {
  if (ctx && loadedModel === choice) return ctx;

  const modelPath = await ensureModel(choice); // file://… path
  // Settings: increase n_ctx if you need longer context; n_gpu_layers helps iOS Metal offload
  ctx = await initLlama({
    model: modelPath,
    n_ctx: 3072,
    n_gpu_layers: 99, // iOS only; safe to keep
    use_mlock: true,
  });
  loadedModel = choice;
  return ctx!;
}

// Drop-in replacement for your previous callAI(history)
export async function callAI(history: Message[], opts?: { model?: ModelChoice; temperature?: number }) {
  const engine = await getContext(opts?.model ?? "1b");

  // Map messages to llama.rn chat format
  const messages = history.map(m => ({ role: m.role, content: m.content }));

  const stop = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>']; // typical stop tokens
  const { text } = await engine.completion(
    {
      messages: [
        { role: "system", content: "You are Offklass AI, a kind K-12 tutor. Be concise and encouraging." },
        ...messages,
      ],
      n_predict: 200,
      temperature: opts?.temperature ?? 0.5,
      stop,
    },
    // (chunk) => { /* you can stream tokens into your UI: chunk.token */ }
  );

  return { id: Date.now() + "-local", role: "assistant", content: text } as Message;
}