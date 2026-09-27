import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveOutreach, type SavedContent } from "@/lib/saved-outreach";

export function SaveButton({ title, content }: { title: string; content: SavedContent }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => setState("idle"), [content]);

  async function onSave() {
    setState("saving");
    try {
      await saveOutreach(title, content);
      setState("saved");
      toast.success("Saved to your library");
    } catch {
      setState("idle");
      toast.error("Couldn't save. Please try again.");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onSave} disabled={state !== "idle"}>
      {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {state === "saved" ? "Saved" : "Save"}
    </Button>
  );
}
