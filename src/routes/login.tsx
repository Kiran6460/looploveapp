import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Loop Love" },
      { name: "description", content: "Sign in to Loop Love and find your loop." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [is18, setIs18] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) void navigate({ to: "/" }); }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      if (!is18) { toast.error("You must confirm you're 18 or older to use Loop Love."); return; }
      if (!acceptedTerms) { toast.error("Please accept the Terms and Privacy Policy."); return; }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        // Record consent on the profile (created by handle_new_user trigger)
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ terms_accepted_at: new Date().toISOString() })
            .eq("id", data.user.id);
        }
        toast.success("Welcome to Loop Love");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/login" className="flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love">
              <Heart className="w-6 h-6 text-love-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-3xl font-semibold">Loop<span className="text-gradient-love"> Love</span></span>
          </Link>

          <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 shadow-card">
            <h1 className="font-display text-3xl mb-1">{mode === "signin" ? "Welcome back" : "Create your loop"}</h1>
            <p className="text-muted-foreground text-sm mb-7">
              {mode === "signin" ? "Sign in to keep swiping." : "It only takes a moment. 18+ only."}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <Field label="Your name">
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Alex" />
                </Field>
              )}
              <Field label="Email">
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@love.com" />
              </Field>
              <Field label="Password">
                <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
              </Field>

              {mode === "signup" && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={is18}
                      onChange={(e) => setIs18(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[color:var(--color-primary)]"
                    />
                    <span className="text-muted-foreground">I confirm I am <strong className="text-foreground">18 years of age or older</strong>.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[color:var(--color-primary)]"
                    />
                    <span className="text-muted-foreground">
                      I agree to the{" "}
                      <Link to="/legal/terms" className="text-primary underline">Terms & Conditions</Link>,{" "}
                      <Link to="/legal/privacy" className="text-primary underline">Privacy Policy</Link>, and{" "}
                      <Link to="/legal/guidelines" className="text-primary underline">Community Guidelines</Link>.
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
              >
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground transition"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        <style>{`
          .input { width: 100%; height: 48px; padding: 0 16px; border-radius: 14px; background: oklch(0.13 0.02 320 / 0.6); border: 1px solid var(--color-border); color: var(--color-foreground); font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s; }
          .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px oklch(0.7 0.22 12 / 0.15); }
        `}</style>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
