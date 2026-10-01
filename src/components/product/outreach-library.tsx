import { currentWorkspaceId } from "@/lib/workspace";
import { Check, ChevronDown, Copy, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SequenceSteps } from "@/components/product/sequence-builder";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { contentToText, SAVED_EVENT, type SavedContent, type SavedItem } from "@/lib/saved-outreach";

export function OutreachLibrary() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ws = (await currentWorkspaceId()) ?? "";
    const { data, error } = await supabase
      .from("saved_outreach")
      .select("id, kind, title, content, created_at")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false });
    if (error) return setError("Couldn't load your library. Please refresh.");
    setError("");
    setItems((data ?? []) as unknown as SavedItem[]);
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(SAVED_EVENT, load);
    return () => window.removeEventListener(SAVED_EVENT, load);
  }, [load]);

  async function copy(item: SavedItem) {
    await navigator.clipboard.writeText(contentToText(item.content));
    setCopied(item.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function remove(item: SavedItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setDeleting(item.id);
    const { error } = await supabase.from("saved_outreach").delete().eq("id", item.id);
    setDeleting(null);
    if (error) {
      toast.error("Couldn't delete. Please try again.");
      return;
    }
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
    toast.success("Deleted");
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold">Saved outreach</h2>
      <p className="text-sm text-muted-foreground">Messages and sequences you've saved. Only you can see them.</p>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      {items === null && !error ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
      ) : items && items.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nothing saved yet. Draft a message or sequence above and press Save.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-md border border-border">
          {items?.map((item) => (
            <li key={item.id} className="px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setOpen(open === item.id ? null : item.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open === item.id ? "rotate-180" : ""}`} />
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] capitalize text-muted-foreground">{item.kind}</span>
                </button>
                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                <Button variant="ghost" size="sm" onClick={() => copy(item)} aria-label={`Copy ${item.title}`}>
                  {copied === item.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(item)} disabled={deleting === item.id} aria-label={`Delete ${item.title}`}>
                  {deleting === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
                </Button>
              </div>
              {open === item.id ? <Preview content={item.content} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Preview({ content }: { content: SavedContent }) {
  if (content.type === "sequence")
    return (
      <div className="mt-2">
        <p className="text-xs text-muted-foreground">Goal: {content.goal}</p>
        <SequenceSteps steps={content.steps} />
      </div>
    );
  return (
    <div className="mt-3 space-y-2 rounded-md bg-surface-muted p-3">
      <p className="text-sm font-medium">Subject: {content.subject}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{content.body}</p>
    </div>
  );
}
