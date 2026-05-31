import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Heart, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Loop Love" },
      { name: "description", content: "Reset your Loop Love account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center px-5 pt-10 pb-12"
      style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-md">
        <button
          onClick={() => void navigate({ to: "/login" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>

        <div className="rounded-3xl border border-border/60 bg-card/70 shadow-card p-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love mb-4">
            <Heart className="w-6 h-6 text-love-foreground" fill="currentColor" />
          </div>

          {sent ? (
            <>
              <h1 className="font-display text-3xl mb-2">Check your inbox</h1>
              <p className="text-muted-foreground text-sm mb-6">
                If an account exists for <span className="text-foreground">{email}</span>, we sent a secure password-reset link. It expires in 1 hour.
              </p>
              <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 flex items-start gap-3 mb-6">
                <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Didn't get it? Check spam, or wait a minute and{" "}
                  <button onClick={() => setSent(false)} className="text-primary underline">try again</button>.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full h-12 leading-[3rem] text-center rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl mb-1">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Enter the email tied to your account and we'll send a secure link to reset your password.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Email</span>
                  <input
                    autoFocus
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@love.com"
                    className="mt-1.5 w-full h-12 px-4 rounded-2xl bg-[oklch(0.13_0.02_320/0.6)] border border-border text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-[oklch(0.7_0.22_12/0.15)] transition"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love active:scale-[0.99] transition disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-5">
                Mobile-only accounts don't use email — sign in with your number and update your password from Settings.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
