import { supabase } from "@/integrations/supabase/client";
import type { SequenceStep } from "@/lib/outreach.functions";

export type SavedContent =
  | { type: "message"; subject: string; body: string }
  | { type: "sequence"; goal: string; steps: SequenceStep[] };

export type SavedItem = { id: string; kind: string; title: string; content: SavedContent; created_at: string };

export const SAVED_EVENT = "leadpilot:outreach-saved";

export async function saveOutreach(title: string, content: SavedContent) {
  const { error } = await supabase
    .from("saved_outreach")
    .insert({ title, kind: content.type, content: content as never });
  if (error) throw error;
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function contentToText(c: SavedContent) {
  if (c.type === "message") return `Subject: ${c.subject}\n\n${c.body}`;
  return c.steps
    .map((s) => `Day ${s.day} · ${s.channel}${s.subject ? `\nSubject: ${s.subject}` : ""}\n${s.body}`)
    .join("\n\n---\n\n");
}
