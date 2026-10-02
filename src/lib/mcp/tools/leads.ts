import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, supabaseForUser } from "../supabase";

const STAGES = ["new", "contacted", "replied", "meeting", "won", "lost"] as const;
const COLS = "id, company, contact_name, contact_email, phone, website, location, industry, stage, score, next_follow_up_at, notes, created_at";

type Row = {
  id: string; company: string; contact_name: string | null; contact_email: string | null;
  phone: string | null; website: string | null; location: string | null; industry: string | null;
  stage: string; score: number | null; next_follow_up_at: string | null; notes: string | null; created_at: string;
};
const toJson = (r: Row) => ({
  id: r.id, company: r.company, contact_name: r.contact_name, contact_email: r.contact_email,
  phone: r.phone, website: r.website, location: r.location, industry: r.industry,
  stage: r.stage, score: r.score, next_follow_up_at: r.next_follow_up_at, notes: r.notes, created_at: r.created_at,
});

async function workspaceId(sb: ReturnType<typeof supabaseForUser>) {
  const { data, error } = await sb.rpc("current_workspace_id");
  if (error || !data) throw new ToolError("No LeadPilot workspace found for this account.");
  return data as string;
}

export const listLeads = defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List leads in your active LeadPilot workspace, optionally filtered by stage or search text.",
  inputSchema: {
    stage: z.enum(STAGES).optional().describe("Only leads in this pipeline stage."),
    search: z.string().trim().max(100).optional().describe("Match company or contact name."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ stage, search, limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    const ws = await workspaceId(sb);
    let q = sb.from("leads").select(COLS).eq("workspace_id", ws).order("created_at", { ascending: false }).limit(limit);
    if (stage) q = q.eq("stage", stage);
    if (search) {
      const s = search.replace(/[%,()]/g, " ");
      q = q.or(`company.ilike.%${s}%,contact_name.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return fail(error.message);
    const leads = (data as Row[]).map(toJson);
    return { content: [{ type: "text", text: JSON.stringify(leads) }], structuredContent: { leads } };
  },
});

export const getLead = defineTool({
  name: "get_lead",
  title: "Get lead",
  description: "Get one lead's full details, including research and qualification.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("leads").select(`${COLS}, research, qualification, interactions`).eq("id", id).maybeSingle();
    if (error) return fail(error.message);
    if (!data) throw new ToolError("Lead not found.");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});

export const addLead = defineTool({
  name: "add_lead",
  title: "Add lead",
  description: "Add a new lead to your active LeadPilot workspace.",
  inputSchema: {
    company: z.string().trim().min(1).max(200),
    contact_name: z.string().trim().max(200).optional(),
    contact_email: z.string().email().optional(),
    phone: z.string().trim().max(50).optional(),
    website: z.string().trim().max(300).optional(),
    location: z.string().trim().max(200).optional(),
    industry: z.string().trim().max(200).optional(),
    notes: z.string().max(4000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const sb = supabaseForUser(ctx);
    const ws = await workspaceId(sb);
    const { data, error } = await sb
      .from("leads")
      .insert({ ...input, workspace_id: ws, user_id: ctx.getUserId()!, source: "mcp" })
      .select(COLS)
      .single();
    if (error) return fail(error.message);
    const lead = toJson(data as Row);
    return { content: [{ type: "text", text: `Added ${lead.company}.` }], structuredContent: { lead } };
  },
});

export const updateLeadStage = defineTool({
  name: "update_lead_stage",
  title: "Update lead stage",
  description: "Move a lead to a different pipeline stage.",
  inputSchema: { id: z.string().uuid(), stage: z.enum(STAGES) },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, stage }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("leads").update({ stage }).eq("id", id).select("company").maybeSingle();
    if (error) return fail(error.message);
    if (!data) throw new ToolError("Lead not found.");
    return { content: [{ type: "text", text: `${data.company} moved to ${stage}.` }] };
  },
});

export const listFollowUps = defineTool({
  name: "list_follow_ups",
  title: "List follow-ups",
  description: "List scheduled follow-ups in your workspace that are due within the given number of days.",
  inputSchema: { days: z.number().int().min(0).max(60).default(7) },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const sb = supabaseForUser(ctx);
    const ws = await workspaceId(sb);
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const { data, error } = await sb
      .from("follow_ups")
      .select("id, lead_id, step, channel, subject, body, due_at, leads(company)")
      .eq("workspace_id", ws).eq("status", "scheduled").lte("due_at", until)
      .order("due_at").limit(100);
    if (error) return fail(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});
