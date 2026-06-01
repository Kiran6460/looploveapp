import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { adminListPending, adminReviewVerification, checkIsAdmin } from "@/lib/verification.functions";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({ meta: [{ title: "Admin — Verifications" }] }),
  component: AdminVerificationsPage,
});

type Row = {
  id: string;
  name: string;
  age: number;
  city: string;
  photo_url: string;
  verification_status: string;
  verification_submitted_at: string | null;
  liveness_score: number | null;
  signedUrl: string | null;
};

function AdminVerificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(adminListPending);
  const reviewFn = useServerFn(adminReviewVerification);
  const checkFn = useServerFn(checkIsAdmin);

  const [allowed, setAllowed] = useState<null | boolean>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/login" }); return; }
    void (async () => {
      try {
        const { isAdmin } = await checkFn();
        setAllowed(isAdmin);
        if (isAdmin) await reload();
      } catch {
        setAllowed(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function reload() {
    setLoading(true);
    try {
      const { rows } = await listFn();
      setRows(rows as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load queue");
    } finally {
      setLoading(false);
    }
  }

  async function review(profileId: string, action: "approve" | "reject", reasonText?: string) {
    setBusy(profileId);
    try {
      await reviewFn({ data: { profileId, action, reason: reasonText } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      setRejectFor(null);
      setReason("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (authLoading || allowed === null) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6 text-center">
        <div>
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h1 className="font-display text-2xl mb-1">Admins only</h1>
          <p className="text-muted-foreground">You don't have access to this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16" style={{ paddingBottom: "max(4rem, env(safe-area-inset-bottom))" }}>
      <header className="px-5 pt-6 pb-3 max-w-3xl mx-auto flex items-center gap-3">
        <button onClick={() => void navigate({ to: "/" })} className="p-2 rounded-xl hover:bg-muted" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-3xl flex-1">Verifications</h1>
        <button onClick={() => void reload()} className="text-sm px-3 py-1.5 rounded-lg bg-muted">Refresh</button>
      </header>

      <main className="max-w-3xl mx-auto px-5 space-y-3">
        {loading && <p className="text-muted-foreground">Loading queue…</p>}
        {!loading && rows.length === 0 && (
          <div className="rounded-3xl border border-border/60 bg-card/60 p-10 text-center">
            <BadgeCheck className="w-10 h-10 text-sky-400 mx-auto mb-2" />
            <p className="font-display text-xl">Queue is clear</p>
            <p className="text-muted-foreground text-sm">No selfies awaiting review.</p>
          </div>
        )}
        {rows.map((r) => (
          <article key={r.id} className="rounded-3xl border border-border/60 bg-card/60 p-4 flex gap-4 shadow-card">
            <div className="flex flex-col gap-2 shrink-0">
              <img src={r.signedUrl ?? r.photo_url} alt="Selfie" className="w-24 h-24 rounded-2xl object-cover border border-border/60" />
              <img src={r.photo_url} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border border-border/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl truncate">{r.name}, {r.age}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.verification_status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-400/15 text-amber-500"}`}>
                  {r.verification_status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{r.city || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Liveness: <span className="font-medium text-foreground">{r.liveness_score?.toFixed(2) ?? "—"}</span>
                {r.verification_submitted_at && <> · {new Date(r.verification_submitted_at).toLocaleString()}</>}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => void review(r.id, "approve")}
                  disabled={busy === r.id}
                  className="px-4 h-10 rounded-xl bg-sky-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => { setRejectFor(r); setReason(""); }}
                  disabled={busy === r.id}
                  className="px-4 h-10 rounded-xl bg-destructive/15 text-destructive text-sm font-medium disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setRejectFor(null)}>
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-display text-2xl">Reject {rejectFor.name}?</h2>
              <button onClick={() => setRejectFor(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <label className="block mb-5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Reason (shown to user)</span>
              <textarea
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Face not clearly visible, multiple people in frame, etc."
                className="mt-1.5 w-full min-h-[100px] p-3 rounded-xl bg-muted/40 border border-border text-sm resize-none"
              />
            </label>
            <div className="flex gap-3">
              <button onClick={() => setRejectFor(null)} className="flex-1 h-12 rounded-2xl bg-muted font-medium">Cancel</button>
              <button
                onClick={() => void review(rejectFor.id, "reject", reason.trim() || undefined)}
                className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
