import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consumeCredit, extractJson, runModel } from "./ai.server";
import type { LeadQualification, LeadResearch, ReplyAnalysis } from "./leads";

type Fail = { ok: false; error: string };

function leadBlock(l: Record<string, unknown>) {
  return [
    `Company: ${l["company"]}`,
    `Contact: ${l["contact_name"] || "unknown"} (${l["role"] || "role unknown"})`,
    `Industry: ${l["industry"] || "unknown"}`,
    `Location: ${l["location"] || "unknown"}`,
    `Website: ${l["website"] || "none"}`,
    `Stage: ${l["stage"]}`,
    `Rep notes: ${l["notes"] || "none"}`,
    `Logged interactions: ${l["interactions"] || "none"}`,
  ].join("\n");
}

const clampList = (v: unknown, n = 5) =>
  (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean).slice(0, n);

export const researchLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; research: LeadResearch } | Fail> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI isn't configured yet." };
    const { data: lead, error } = await context.supabase.from("leads").select("*").eq("id", data.leadId).maybeSingle();
    if (error || !lead) return { ok: false, error: "Lead not found." };

    const prompt = `You are a B2B sales researcher. Using ONLY the information below plus general industry knowledge (you cannot browse the web — say so where relevant, never invent specific facts like revenue or employee names), write a concise research brief for a sales rep.
Return ONLY JSON, no prose, with these keys:
{"overview":"2-3 sentences","products":"1-2 sentences","targetCustomers":"1-2 sentences","websiteNotes":"1-2 sentences","buyingSignals":["up to 4 short items"],"painPoints":["up to 4 short items"],"salesAngle":"2 sentences","score":0-100 integer likelihood this is a good-fit prospect worth contacting now,"scoreReasons":["up to 4 short reasons"],"recommendation":"one clear next action"}

Lead:
${leadBlock(lead)}`;
    const gate = await consumeCredit(context.supabase as never, "research");
    if (!gate.ok) return gate;
    const out = await runModel(gate.business + prompt, apiKey, { json: true });
    if (!out.ok) return out;
    const j = extractJson<Record<string, unknown>>(out.text);
    if (!j) return { ok: false, error: "The AI returned an unreadable brief. Please try again." };
    const research: LeadResearch = {
      overview: String(j["overview"] ?? ""),
      products: String(j["products"] ?? ""),
      targetCustomers: String(j["targetCustomers"] ?? ""),
      websiteNotes: String(j["websiteNotes"] ?? ""),
      buyingSignals: clampList(j["buyingSignals"], 4),
      painPoints: clampList(j["painPoints"], 4),
      salesAngle: String(j["salesAngle"] ?? ""),
      scoreReasons: clampList(j["scoreReasons"], 4),
      recommendation: String(j["recommendation"] ?? ""),
      generatedAt: new Date().toISOString(),
    };
    const score = Math.max(0, Math.min(100, Math.round(Number(j["score"]) || 0)));
    const { error: upErr } = await context.supabase
      .from("leads")
      .update({ research: research as never, score, updated_at: new Date().toISOString() })
      .eq("id", data.leadId);
    if (upErr) return { ok: false, error: "Couldn't save the research. Please try again." };
    return { ok: true, research };
  });

const INTENTS = ["interested", "question", "objection", "not_now", "not_interested", "referral", "out_of_office"] as const;

export const analyzeReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reply: z.string().trim().min(3).max(5000), leadId: z.string().uuid().nullable().default(null) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; analysis: ReplyAnalysis } | Fail> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI isn't configured yet." };
    let lead: Record<string, unknown> | null = null;
    if (data.leadId) {
      const r = await context.supabase.from("leads").select("*").eq("id", data.leadId).maybeSingle();
      lead = r.data;
    }
    const prompt = `A prospect replied to a sales rep's outreach. Classify it and advise the rep.
Return ONLY JSON: {"intent":one of ${INTENTS.join("|")},"sentiment":"positive|neutral|negative","urgency":"high|medium|low","summary":"one sentence","nextAction":"one clear action for the rep","suggestedReply":"a short reply the rep can send, under 90 words, no placeholders"}
${lead ? `\nLead context:\n${leadBlock(lead)}\n` : ""}
Reply:
"""${data.reply}"""`;
    const gate = await consumeCredit(context.supabase as never, "reply_analysis");
    if (!gate.ok) return gate;
    const out = await runModel(gate.business + prompt, apiKey, { json: true });
    if (!out.ok) return out;
    const j = extractJson<Record<string, unknown>>(out.text);
    if (!j) return { ok: false, error: "The AI returned an unreadable analysis. Please try again." };
    const pick = <T extends string>(v: unknown, opts: readonly T[], d: T) => (opts.includes(v as T) ? (v as T) : d);
    const analysis: ReplyAnalysis = {
      intent: pick(j["intent"], INTENTS, "question"),
      sentiment: pick(j["sentiment"], ["positive", "neutral", "negative"] as const, "neutral"),
      urgency: pick(j["urgency"], ["high", "medium", "low"] as const, "medium"),
      summary: String(j["summary"] ?? ""),
      nextAction: String(j["nextAction"] ?? ""),
      suggestedReply: String(j["suggestedReply"] ?? ""),
    };
    await context.supabase.from("lead_replies").insert({ reply: data.reply, lead_id: data.leadId, analysis: analysis as never });
    if (data.leadId) {
      const patch: { updated_at: string; stage?: string; next_follow_up_at?: string } = { updated_at: new Date().toISOString() };
      if (analysis.intent === "interested") patch.stage = "interested";
      if (analysis.intent === "not_interested") patch.stage = "lost";
      if (analysis.intent === "not_now") patch.next_follow_up_at = new Date(Date.now() + 30 * 864e5).toISOString();
      await context.supabase.from("leads").update(patch).eq("id", data.leadId);
    }
    return { ok: true, analysis };
  });

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
          .min(1)
          .max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; text: string } | Fail> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI isn't configured yet." };
    const { data: leads } = await context.supabase
      .from("leads")
      .select("company, contact_name, role, industry, stage, score, last_contacted_at, next_follow_up_at, notes")
      .order("updated_at", { ascending: false })
      .limit(60);
    const today = new Date().toISOString().slice(0, 10);
    const pipeline = (leads ?? [])
      .map(
        (l) =>
          `- ${l.company} | ${l.contact_name ?? "?"} (${l.role ?? "?"}) | ${l.industry ?? "?"} | stage ${l.stage} | score ${l.score ?? "unscored"} | last contact ${l.last_contacted_at?.slice(0, 10) ?? "never"} | follow up ${l.next_follow_up_at?.slice(0, 10) ?? "none"}${l.notes ? ` | notes: ${l.notes.slice(0, 120)}` : ""}`,
      )
      .join("\n");
    const convo = data.messages.map((m) => `${m.role === "user" ? "Rep" : "Copilot"}: ${m.content}`).join("\n\n");
    const prompt = `You are LeadPilot Copilot, a sharp, practical sales assistant for a small business sales rep. Today is ${today}.
Answer using the rep's pipeline below. Be specific (name companies), brief (under 180 words unless asked for a draft), and action-oriented. Use markdown lists where helpful. If the pipeline is empty, tell them to add leads first. Never invent leads that aren't listed.

Pipeline (${leads?.length ?? 0} leads):
${pipeline || "(empty)"}

Conversation:
${convo}

Copilot:`;
    const gate = await consumeCredit(context.supabase as never, "copilot");
    if (!gate.ok) return gate;
    const out = await runModel(gate.business + prompt, apiKey);
    if (!out.ok) return out;
    return { ok: true, text: out.text.trim() };
  });

const VERDICTS = ["qualified", "nurture", "disqualified", "needs_info"] as const;

export const qualifyLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ leadId: z.string().uuid(), interactions: z.string().trim().max(8000) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; qualification: LeadQualification } | Fail> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI isn't configured yet." };
    const { data: lead, error } = await context.supabase.from("leads").select("*").eq("id", data.leadId).maybeSingle();
    if (error || !lead) return { ok: false, error: "Lead not found." };
    const { data: replies } = await context.supabase
      .from("lead_replies").select("reply, created_at").eq("lead_id", data.leadId)
      .order("created_at", { ascending: false }).limit(5);
    const today = new Date().toISOString().slice(0, 10);
    const history = (replies ?? []).map((r) => `- ${r.created_at.slice(0, 10)}: "${r.reply.slice(0, 400)}"`).join("\n");
    const prompt = `Qualify this B2B sales lead using a BANT-style review (budget, authority, need, timing). Today is ${today}.
Rules: use ONLY the profile and interactions below. If a criterion has no evidence, mark it "unknown" and say what to ask. Do not assume budget or authority from job titles alone unless clearly stated. The score must reflect evidence, not optimism: little evidence = low confidence.
Return ONLY a JSON object:
{"summary":"2-3 sentence qualification summary","verdict":"qualified|nurture|disqualified|needs_info","score":integer 0-100 fit and readiness,"confidence":"high|medium|low","budget":{"status":"yes|no|unknown","note":"short evidence or what to ask"},"authority":{"status":"yes|no|unknown","note":"..."},"need":{"status":"yes|no|unknown","note":"..."},"timing":{"status":"yes|no|unknown","note":"..."},"risks":["up to 3 short items"],"nextAction":"one specific next action","nextActionWhen":"e.g. today, within 2 days, in 2 weeks","suggestedStage":"new|contacted|warm|interested|qualified|won|lost","questionsToAsk":["up to 3 discovery questions"]}

Lead profile:
${leadBlock({ ...lead, interactions: null })}

Recent interactions (rep's log):
${data.interactions || "(none provided)"}
${history ? `\nAnalyzed prospect replies:\n${history}` : ""}`;
    const gate = await consumeCredit(context.supabase as never, "qualification");
    if (!gate.ok) return gate;
    const out = await runModel(gate.business + prompt, apiKey, { json: true });
    if (!out.ok) return out;
    const j = extractJson<Record<string, unknown>>(out.text);
    if (!j) return { ok: false, error: "The AI returned an unreadable summary. Please try again." };
    const pick = <T extends string>(v: unknown, opts: readonly T[], d: T) => (opts.includes(v as T) ? (v as T) : d);
    const crit = (v: unknown) => {
      const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      return { status: pick(o["status"], ["yes", "no", "unknown"] as const, "unknown"), note: String(o["note"] ?? "") };
    };
    const qualification: LeadQualification = {
      summary: String(j["summary"] ?? ""),
      verdict: pick(j["verdict"], VERDICTS, "needs_info"),
      confidence: pick(j["confidence"], ["high", "medium", "low"] as const, "low"),
      budget: crit(j["budget"]), authority: crit(j["authority"]), need: crit(j["need"]), timing: crit(j["timing"]),
      risks: clampList(j["risks"], 3),
      nextAction: String(j["nextAction"] ?? ""),
      nextActionWhen: String(j["nextActionWhen"] ?? ""),
      suggestedStage: pick(j["suggestedStage"], ["new", "contacted", "warm", "interested", "qualified", "won", "lost"] as const, lead.stage as "new"),
      questionsToAsk: clampList(j["questionsToAsk"], 3),
      generatedAt: new Date().toISOString(),
    };
    const score = Math.max(0, Math.min(100, Math.round(Number(j["score"]) || 0)));
    const { error: upErr } = await context.supabase.from("leads")
      .update({ qualification: qualification as never, interactions: data.interactions || null, score, updated_at: new Date().toISOString() })
      .eq("id", data.leadId);
    if (upErr) return { ok: false, error: "Couldn't save the summary. Please try again." };
    return { ok: true, qualification };
  });
