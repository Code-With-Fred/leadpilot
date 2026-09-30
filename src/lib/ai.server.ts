export type AiText = { ok: true; text: string } | { ok: false; error: string };

/** Streams a Responses call through the Lovable AI Gateway and returns the full text. */
export async function runModel(prompt: string, apiKey: string, opts: { json?: boolean; effort?: "low" | "medium" } = {}): Promise<AiText> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions:
        "You are a precise B2B sales assistant. Base every statement strictly on the data provided. Never invent facts, numbers, names or events. If information is missing, say it is unknown.",
      input: prompt,
      stream: true,
      store: false,
      reasoning: { effort: opts.effort ?? "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      ...(opts.json ? { text: { format: { type: "json_object" } } } : {}),
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
  let failed = false;
  const handle = (frame: string) => {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { type?: string; delta?: string };
        if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
        else if (evt.type === "response.refusal.delta") refused = true;
        else if (evt.type === "response.failed" || evt.type === "error") failed = true;
      } catch {
        /* ignore partial */
      }
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      handle(buf.slice(0, idx));
      buf = buf.slice(idx + 2);
    }
  }
  if (buf.trim()) handle(buf);

  if (refused) return { ok: false, error: "The AI declined this request. Try adjusting the details." };
  if (failed || !text.trim()) return { ok: false, error: "The AI couldn't finish this. Please try again." };
  return { ok: true, text };
}

export function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    /* fall back to slicing */
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

type Sb = { rpc: (fn: "consume_ai_credit", args: { _kind: string }) => PromiseLike<{ data: unknown; error: unknown }>; from: (t: "workspaces") => any };

/** Checks + records one AI use against the workspace's monthly plan limit, and returns the business profile for prompts. */
export async function consumeCredit(supabase: Sb, kind: string): Promise<{ ok: true; business: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("consume_ai_credit", { _kind: kind });
  if (error) {
    console.error("consume_ai_credit", error);
    return { ok: false, error: "Couldn't check your AI usage. Please try again." };
  }
  const r = data as { ok: boolean; reason?: string; limit?: number };
  if (!r.ok) {
    return {
      ok: false,
      error: r.reason === "limit"
        ? `You've used all ${r.limit} AI actions included in your plan this month. Upgrade your plan or wait until next month.`
        : "Your account isn't linked to a workspace yet. Please refresh and try again.",
    };
  }
  const { data: ws } = await supabase.from("workspaces").select("name, industry, website, offer, target_customer, value_proposition, tone").limit(1).maybeSingle();
  const w = ws as Record<string, string | null> | null;
  const lines = w
    ? [
        ["Our company", w.name], ["Our industry", w.industry], ["Our website", w.website], ["What we sell", w.offer],
        ["Our ideal customer", w.target_customer], ["Why customers pick us", w.value_proposition], ["Preferred tone", w.tone],
      ].filter(([, v]) => v)
    : [];
  const business = lines.length ? `About the seller (use when relevant):\n${lines.map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\n` : "";
  return { ok: true, business };
}
