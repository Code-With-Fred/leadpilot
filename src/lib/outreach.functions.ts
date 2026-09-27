import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LeadInput = z.object({
  contactName: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).default(""),
  company: z.string().trim().min(1).max(160),
  industry: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(2000).default(""),
  offer: z.string().trim().min(1).max(600),
  tone: z.enum(["friendly", "professional", "direct"]).default("professional"),
});


type AiText = { ok: true; text: string } | { ok: false; error: string };

async function runModel(prompt: string, apiKey: string): Promise<AiText> {
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
    if (res.status === 402) return { ok: false, error: "AI credits have run out. Add credits to keep drafting." };
    if (res.status === 403) return { ok: false, error: "AI drafting isn't available for this workspace right now." };
    console.error("AI gateway error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "The AI couldn't write this. Please try again." };
  }

  // Consume SSE stream server-side and accumulate text deltas.
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

  if (refused || !text.trim()) return { ok: false, error: "The AI declined to write this. Try adjusting the details." };
  return { ok: true, text };
}

export type DraftResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

export const draftOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LeadInput.parse(d))
  .handler(async ({ data }): Promise<DraftResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI drafting isn't configured yet." };

    const prompt = `Write a short, personalized cold outreach email (under 140 words) from a sales rep.
Tone: ${data.tone}. No placeholders like [Name]. No hype or emojis. End with a low-friction question.
Return exactly this format:
SUBJECT: <subject line>
BODY:
<email body>

Prospect:
- Name: ${data.contactName}
- Role: ${data.role || "unknown"}
- Company: ${data.company}
- Industry: ${data.industry || "unknown"}
- Location: ${data.location || "unknown"}
- Notes / signals: ${data.notes || "none"}

What we offer: ${data.offer}`;

    const out = await runModel(prompt, apiKey);
    if (!out.ok) return out;
    const text = out.text;
    const m = text.match(/SUBJECT:\s*(.+)\n+BODY:\s*\n?([\s\S]*)/i);
    return m
      ? { ok: true, subject: (m[1] ?? "").trim(), body: (m[2] ?? "").trim() }
      : { ok: true, subject: `Quick idea for ${data.company}`, body: text.trim() };
  });

const SequenceInput = LeadInput.extend({
  goal: z.string().trim().min(1).max(400),
  steps: z.number().int().min(2).max(6).default(4),
  days: z.number().int().min(3).max(60).default(14),
});

export type SequenceStep = { day: number; channel: string; subject: string; body: string };
export type SequenceResult = { ok: true; steps: SequenceStep[] } | { ok: false; error: string };

export const draftSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SequenceInput.parse(d))
  .handler(async ({ data }): Promise<SequenceResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI drafting isn't configured yet." };
    const prompt = `Plan a personalized outreach sequence of exactly ${data.steps} touches spread over ${data.days} days for a sales rep.
Goal of the sequence: ${data.goal}
Tone: ${data.tone}. No placeholders like [Name]. No hype or emojis. Each message under 110 words, each one adds a new angle rather than "just checking in". Day 1 is the first touch; the last touch is a polite close-the-loop message.
Channels may be "email", "linkedin" or "call" (for call, the body is a short talk track). Use an empty subject for non-email.
Return ONLY a JSON array, no prose, no code fences: [{"day":1,"channel":"email","subject":"...","body":"..."}]

Prospect:
- Name: ${data.contactName}
- Role: ${data.role || "unknown"}
- Company: ${data.company}
- Industry: ${data.industry || "unknown"}
- Location: ${data.location || "unknown"}
- Notes / signals: ${data.notes || "none"}

What we offer: ${data.offer}`;
    const out = await runModel(prompt, apiKey);
    if (!out.ok) return out;
    const raw = out.text.slice(out.text.indexOf("["), out.text.lastIndexOf("]") + 1);
    try {
      const arr = JSON.parse(raw) as Partial<SequenceStep>[];
      const steps = arr
        .filter((s) => s && typeof s.body === "string" && s.body.trim())
        .map((s) => ({
          day: Math.max(1, Math.min(data.days, Number(s.day) || 1)),
          channel: ["email", "linkedin", "call"].includes(String(s.channel)) ? String(s.channel) : "email",
          subject: String(s.subject ?? "").trim(),
          body: String(s.body).trim(),
        }))
        .sort((a, b) => a.day - b.day);
      if (!steps.length) throw new Error("empty");
      return { ok: true, steps };
    } catch {
      return { ok: false, error: "The AI returned an unreadable sequence. Please try again." };
    }
  });
