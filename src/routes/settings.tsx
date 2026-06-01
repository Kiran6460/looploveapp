import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  Shield,
  Trash2,
  User as UserIcon,
  X,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { deleteMyAccount } from "@/lib/account.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Loop Love" },
      { name: "description", content: "Manage your Loop Love account and privacy." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const deleteAccount = useServerFn(deleteMyAccount);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type "DELETE" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount({ data: { reason: reason.trim() || undefined } });
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      void navigate({ to: "/login" });
    } catch (e) {
      setDeleting(false);
      toast.error(e instanceof Error ? e.message : "Couldn't delete your account");
    }
  }

  if (authLoading || !user) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const email = user.email && !user.email.endsWith("@phone.looplove.app") ? user.email : null;

  return (
    <div className="min-h-[100dvh] pb-16" style={{ paddingBottom: "max(4rem, env(safe-area-inset-bottom))" }}>
      <AppHeader />
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto flex items-center gap-3">
        <button
          onClick={() => void navigate({ to: "/" })}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-3xl">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto px-5 space-y-4">
        <section className="rounded-3xl border border-border/60 bg-card/60 shadow-card overflow-hidden">
          <Row
            icon={<UserIcon className="w-5 h-5" />}
            label="Edit profile"
            sub={email ?? "Mobile account"}
            onClick={() => void navigate({ to: "/profile" })}
          />
          {email && (
            <Row
              icon={<KeyRound className="w-5 h-5" />}
              label="Reset password"
              sub="Get a reset link by email"
              onClick={() => void navigate({ to: "/forgot-password" })}
            />
          )}
          <Row
            icon={<BadgeCheck className="w-5 h-5 text-sky-400" />}
            label="Profile verification"
            sub="Verify with a live selfie to unlock matches"
            onClick={() => void navigate({ to: "/verify" })}
          />
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/60 shadow-card overflow-hidden">
          <Row icon={<Shield className="w-5 h-5" />} label="Community guidelines" to="/legal/guidelines" />
          <Row icon={<FileText className="w-5 h-5" />} label="Terms of service" to="/legal/terms" />
          <Row icon={<FileText className="w-5 h-5" />} label="Privacy policy" to="/legal/privacy" />
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/60 shadow-card overflow-hidden">
          <button
            onClick={async () => { await signOut(); void navigate({ to: "/login" }); }}
            className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-muted/50 transition"
          >
            <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><LogOut className="w-5 h-5" /></span>
            <span className="flex-1 font-medium">Sign out</span>
          </button>
        </section>

        <section className="rounded-3xl border border-destructive/40 bg-destructive/5 shadow-card overflow-hidden">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-destructive/10 transition"
          >
            <span className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive"><Trash2 className="w-5 h-5" /></span>
            <span className="flex-1">
              <span className="block font-medium text-destructive">Delete account</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Permanently remove your profile, photos, matches and chats.</span>
            </span>
          </button>
        </section>
      </main>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-display text-2xl">Delete account?</h2>
              <button
                onClick={() => !deleting && setConfirmOpen(false)}
                className="p-1 rounded-lg hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This permanently deletes your profile, photos, swipes, matches and messages. <strong className="text-foreground">This cannot be undone.</strong>
            </p>

            <label className="block mb-3">
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Reason (optional)</span>
              <textarea
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us improve — what didn't work for you?"
                className="mt-1.5 w-full min-h-[80px] p-3 rounded-xl bg-muted/40 border border-border text-sm resize-none"
              />
            </label>

            <label className="block mb-5">
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Type <span className="text-destructive font-bold">DELETE</span> to confirm</span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoCapitalize="characters"
                placeholder="DELETE"
                className="mt-1.5 w-full h-12 px-4 rounded-xl bg-muted/40 border border-border text-sm uppercase tracking-widest"
              />
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 h-12 rounded-2xl bg-muted font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground font-medium disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, sub, onClick, to }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void; to?: string }) {
  const inner = (
    <>
      <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-xs text-muted-foreground mt-0.5">{sub}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </>
  );
  const cls = "w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-muted/50 transition border-b border-border/40 last:border-b-0";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}
