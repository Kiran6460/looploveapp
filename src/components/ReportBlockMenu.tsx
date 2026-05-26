import { useState } from "react";
import { Flag, Shield, MoreVertical, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const REASONS = [
  "Inappropriate photos",
  "Fake profile",
  "Harassment or hate speech",
  "Spam or scam",
  "Underage (under 18)",
  "Other",
];

export function ReportBlockMenu({ targetId, targetName, onBlocked }: { targetId: string; targetName: string; onBlocked?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function block() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
    setBusy(false);
    setOpen(false);
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    toast.success(`${targetName} blocked. They won't see you or message you.`);
    onBlocked?.();
  }

  async function submitReport() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: targetId,
      reason,
      details: details.slice(0, 1000),
    });
    setBusy(false);
    setShowReport(false);
    setOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Our team will review it.");
    // Auto-block on report
    await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
    onBlocked?.();
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition"
          aria-label="More"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-card border border-border shadow-card overflow-hidden z-50">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); setShowReport(true); }}
              className="w-full px-4 py-3 text-sm text-left flex items-center gap-2.5 hover:bg-muted transition"
            >
              <Flag className="w-4 h-4 text-destructive" /> Report user
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); void block(); }}
              disabled={busy}
              className="w-full px-4 py-3 text-sm text-left flex items-center gap-2.5 hover:bg-muted transition border-t border-border/50"
            >
              <Shield className="w-4 h-4" /> Block user
            </button>
          </div>
        )}
      </div>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowReport(false)}>
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-display text-xl">Report {targetName}</h3>
              <button onClick={() => setShowReport(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Reports are confidential. We review every one. You will also block this user.</p>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm mb-4">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Details (optional)</label>
            <textarea
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What happened?"
              className="w-full min-h-[110px] p-3 rounded-xl bg-muted/40 border border-border text-sm resize-none mb-4"
            />
            <button
              onClick={() => void submitReport()}
              disabled={busy}
              className="w-full h-12 rounded-2xl bg-destructive text-destructive-foreground font-medium disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit report & block"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
