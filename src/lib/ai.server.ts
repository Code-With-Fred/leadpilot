export type AiText = { ok: true; text: string } | { ok: false; error: string };

/** Streams a Responses call through the Lovable AI Gateway and returns the full text. */
export async function runModel(prompt: string, apiKey: string): Promise<AiText> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (!res.ok || !res.body) {
    if (res.status === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
    if (res.status === 402) return { ok: false, error: "AI credits have run out. Add credits to keep going." };
    if (res.status === 403) return { ok: false, error: "AI isn't available for this workspace right now." };
    console.error("AI gateway error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "The AI couldn't finish this. Please try again." };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let refused = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
          if (evt.type === "response.refusal.delta") refused = true;
        } catch {
          /* ignore partial */
        }
      }
    }
  }

  if (refused || !text.trim()) return { ok: false, error: "The AI declined this request. Try adjusting the details." };
  return { ok: true, text };
}

export function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
