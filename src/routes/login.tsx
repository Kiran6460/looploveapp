import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Heart, ArrowLeft, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/Footer";
import { loginWithPhone } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Loop Love" },
      { name: "description", content: "Sign in to Loop Love." },
    ],
  }),
  component: LoginPage,
});

type Method = "chooser" | "phone" | "email";

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phoneLogin = useServerFn(loginWithPhone);

  const [method, setMethod] = useState<Method>("chooser");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) void navigate({ to: "/" }); }, [user, navigate]);

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Couldn't sign in with Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome back");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in with Google");
      setLoading(false);
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !password) { toast.error("Enter mobile and password"); return; }
    setLoading(true);
    try {
      const { access_token, refresh_token } = await phoneLogin({ data: { phone, password } });
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      toast.success("Welcome back");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Enter email and password"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Welcome back");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/login" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love">
              <Heart className="w-6 h-6 text-love-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-3xl font-semibold">Loop<span className="text-gradient-love"> Love</span></span>
          </Link>

          <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-7 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-500">
            {method === "chooser" && (
              <>
                <h1 className="font-display text-3xl mb-1 text-center">Welcome back</h1>
                <p className="text-muted-foreground text-sm mb-7 text-center">Sign in to keep the loop going.</p>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full h-13 py-3.5 rounded-2xl bg-white text-gray-800 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-50 shadow-sm"
                >
                  <GoogleIcon /> Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className="mt-3 w-full h-13 py-3.5 rounded-2xl bg-gradient-love text-love-foreground font-medium flex items-center justify-center gap-2 shadow-love hover:opacity-95 active:scale-[0.99] transition"
                >
                  <Phone className="w-4 h-4" /> Login with Mobile Number
                </button>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Login with Email & Password
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs">
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    Forgot password?
                  </Link>
                  <Link to="/signup" className="text-primary hover:underline">
                    Create account
                  </Link>
                </div>
              </>
            )}

            {method === "phone" && (
              <>
                <BackBtn onClick={() => setMethod("chooser")} />
                <h1 className="font-display text-3xl mb-1">Mobile login</h1>
                <p className="text-muted-foreground text-sm mb-6">Use your registered number.</p>
                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  <Field label="Mobile number">
                    <input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+1 555 123 4567" />
                  </Field>
                  <PasswordField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="current-password" />
                  <button type="submit" disabled={loading} className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50">
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              </>
            )}

            {method === "email" && (
              <>
                <BackBtn onClick={() => setMethod("chooser")} />
                <h1 className="font-display text-3xl mb-1">Email login</h1>
                <p className="text-muted-foreground text-sm mb-6">Sign in with your email and password.</p>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <Field label="Email">
                    <input required type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@love.com" />
                  </Field>
                  <PasswordField value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="current-password" />
                  <div className="text-right -mt-1">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <button type="submit" disabled={loading} className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50">
                    {loading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        <style>{`
          .input { width: 100%; height: 48px; padding: 0 16px; border-radius: 14px; background: oklch(0.13 0.02 320 / 0.6); border: 1px solid var(--color-border); color: var(--color-foreground); font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s; }
          .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px oklch(0.7 0.22 12 / 0.15); }
          .h-13 { height: 52px; }
        `}</style>
      </div>
      <Footer />
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
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

function PasswordField({
  value, onChange, show, onToggle, autoComplete, placeholder, label = "Password",
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
      <div className="mt-1.5 relative">
        <input
          required
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-12"
          placeholder={placeholder ?? "••••••••"}
          minLength={8}
          maxLength={200}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41.1 35.8 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
