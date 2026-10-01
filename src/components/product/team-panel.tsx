import { Copy, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Workspace } from "@/lib/workspace";

type Member = { user_id: string; email: string; full_name: string | null; role: string };
type Invite = { id: string; email: string; role: string; token: string; expires_at: string; accepted_at: string | null };

export function TeamPanel({ workspace }: { workspace: Workspace }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const [{ data: u }, m] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("workspace_member_list", { _ws: workspace.id }),
    ]);
    if (m.error) { setError("Couldn't load your team."); setLoading(false); return; }
    const list = (m.data ?? []) as Member[];
    setMembers(list);
    const uid = u.user?.id ?? "";
    setMe(uid);
    const admin = ["owner", "admin"].includes(list.find((x) => x.user_id === uid)?.role ?? "");
    setIsAdmin(admin);
    if (admin) {
      const { data } = await supabase.from("workspace_invites").select("id, email, role, token, expires_at, accepted_at")
        .eq("workspace_id", workspace.id).is("accepted_at", null).order("created_at", { ascending: false });
      setInvites((data ?? []) as Invite[]);
    }
    setLoading(false);
  }, [workspace.id]);
  useEffect(() => void load(), [load]);

  const link = (t: string) => `${window.location.origin}/invite/${t}`;

  async function invite(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) { toast.error("Enter a valid email."); return; }
    if (members.some((m) => m.email.toLowerCase() === em)) { toast.error("That person is already on the team."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("workspace_invites").insert({ workspace_id: workspace.id, email: em, role }).select("token").single();
    setBusy(false);
    if (error) { toast.error("Couldn't create the invite."); return; }
    await navigator.clipboard.writeText(link(data.token)).catch(() => {});
    toast.success("Invite link copied. Send it to them — it works for 7 days.");
    setEmail("");
    void load();
  }

  async function removeMember(m: Member) {
    if (!confirm(`Remove ${m.email} from ${workspace.name}?`)) return;
    const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", m.user_id);
    if (error) { toast.error("Only the owner can remove people."); return; }
    void load();
  }

  async function cancelInvite(i: Invite) {
    await supabase.from("workspace_invites").delete().eq("id", i.id);
    void load();
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Team</h2>
      <p className="mb-4 text-sm text-muted-foreground">Everyone here shares the same leads, campaigns and follow-ups.</p>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : error ? <div className="flex items-center gap-3 text-sm text-destructive">{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></div>
        : (
          <div className="space-y-5">
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0"><p className="truncate font-medium">{m.full_name || m.email}{m.user_id === me ? " (you)" : ""}</p><p className="truncate text-xs text-muted-foreground">{m.email}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                    {isAdmin && m.role !== "owner" && m.user_id !== me && <Button size="icon" variant="ghost" aria-label={`Remove ${m.email}`} onClick={() => removeMember(m)}><Trash2 className="size-4" /></Button>}
                  </div>
                </li>
              ))}
            </ul>
            {isAdmin ? (
              <>
                <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="inv-email">Invite by email</Label><Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" /></div>
                  <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="member">Member</option><option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Create invite link</Button>
                </form>
                <p className="text-xs text-muted-foreground">Invite emails aren't sent automatically yet — copy the link and send it yourself. They must sign in with the same email.</p>
                {invites.length > 0 && (
                  <ul className="space-y-2">
                    {invites.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <span className="truncate">{i.email} · <span className="capitalize">{i.role}</span> · {new Date(i.expires_at) < new Date() ? "expired" : `expires ${new Date(i.expires_at).toLocaleDateString()}`}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(link(i.token)).then(() => toast.success("Link copied"))}><Copy className="size-4" /> Copy link</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelInvite(i)}>Cancel</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : <p className="text-xs text-muted-foreground">Ask an owner or admin to invite people.</p>}
          </div>
        )}
    </section>
  );
}
