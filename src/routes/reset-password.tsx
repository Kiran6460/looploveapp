import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Loop Love" },
      { name: "description", content: "Choose a new password for your Loop Love account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authedFromLink, setAuthedFromLink] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY after the user opens the email link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setAuthedFromLink(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthedFromLink(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Use at least 8 characters"); return; }
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated — sign back in.");
    await supabase.auth.signOut();
    void navigate({ to: "/login" });
  }

  if (!ready) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center px-5 pt-10 pb-12"
      style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 shadow-card p-7">
        <div className="w-12 h-12 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love mb-4">
          <Heart className="w-6 h-6 text-love-foreground" fill="currentColor" />
        </div>
        <h1 className="font-display text-3xl mb-1">Choose a new password</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Use at least 8 characters. Mix letters, numbers and symbols for a stronger password.
        </p>

        {!authedFromLink ? (
          <p className="text-sm text-destructive">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <PwInput label="New password" value={pw} onChange={setPw} show={show} onToggle={() => setShow((s) => !s)} />
            <PwInput label="Confirm new password" value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow((s) => !s)} />
            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love active:scale-[0.99] transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PwInput({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
      <div className="relative mt-1.5">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 px-4 pr-12 rounded-2xl bg-[oklch(0.13_0.02_320/0.6)] border border-border text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-[oklch(0.7_0.22_12/0.15)] transition"
        />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide" : "Show"}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}
