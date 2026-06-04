import { useState } from "react";
import { MoreVertical, Flag, Ban, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function ReportBlockMenu({
  targetId,
  targetName,
  onBlocked,
}: {
  targetId: string;
  targetName: string;
  onBlocked?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function block() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
    setBusy(false);
    setOpen(false);
    if (error) return toast.error("Couldn't block");
    toast.success(`Blocked ${targetName}`);
    onBlocked?.();
  }

  async function report() {
    if (!user || busy) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: targetId,
      reason: "inappropriate",
    });
    setBusy(false);
    setOpen(false);
    if (error) return toast.error("Couldn't report");
    toast.success("Report submitted");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl bg-card border border-border shadow-card z-50 overflow-hidden">
            <button onClick={report} disabled={busy} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted text-left">
              <Flag className="w-4 h-4" /> Report
            </button>
            <button onClick={block} disabled={busy} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted text-left text-destructive">
              <Ban className="w-4 h-4" /> Block
            </button>
            <button onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted text-left text-muted-foreground">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
