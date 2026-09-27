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
      return { ok: false, error: "The AI couldn't draft a message. Please try again." };
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

    if (refused || !text.trim()) return { ok: false, error: "The AI declined to write this message. Try adjusting the details." };

    const m = text.match(/SUBJECT:\s*(.+)\n+BODY:\s*\n?([\s\S]*)/i);
    return m
      ? { ok: true, subject: m[1].trim(), body: m[2].trim() }
      : { ok: true, subject: `Quick idea for ${data.company}`, body: text.trim() };
  });
