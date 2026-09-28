import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askCopilot } from "@/lib/sales.functions";

type Msg = { role: "user" | "assistant"; content: string };
const starters = ["Who should I contact today?", "Which leads are going cold?", "Write a follow up for my hottest lead"];

export function CopilotChat() {
  const ask = useServerFn(askCopilot);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const r = await ask({ data: { messages: next.slice(-20) } });
      if (r.ok) setMsgs([...next, { role: "assistant", content: r.text }]);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[36rem] flex-col rounded-xl border border-border bg-surface">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {!msgs.length && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ask about your leads and pipeline. Copilot sees your saved leads.</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-muted">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-ink px-3 py-2 text-sm text-ink-foreground">{m.content}</div>
          ) : (
            <div key={i} className="flex gap-3">
              <LogoMark className="size-6 shrink-0" />
              <div className="prose prose-sm max-w-none text-sm leading-relaxed [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ),
        )}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Thinking…</div>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder="Ask Copilot…"
          className="min-h-0 resize-none"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send"><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
