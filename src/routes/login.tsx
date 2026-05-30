import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Heart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Loop Love" },
      { name: "description", content: "Sign in to Loop Love or create a new account." },
    ],
  }),
  component: LoginPage,
});

const OTP_TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN = 45;
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

function rateLimitCheck(email: string): { ok: boolean; retryInSec?: number } {
  try {
    const key = `ll_otp_req_${email.toLowerCase()}`;
    const now = Date.now();
    const raw = localStorage.getItem(key);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const recent = arr.filter((t) => now - t < REQUEST_WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      const retryInSec = Math.ceil((REQUEST_WINDOW_MS - (now - recent[0])) / 1000);
      return { ok: false, retryInSec };
    }
    recent.push(now);
    localStorage.setItem(key, JSON.stringify(recent));
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

type Mode = "login" | "signup";
type Step = "form" | "otp";

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [is18, setIs18] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [resendAt, setResendAt] = useState<number>(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { if (user) void navigate({ to: "/" }); }, [user, navigate]);

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputsRef.current[0]?.focus(), 60);
    }
  }, [step]);

  const expiresInSec = expiresAt ? Math.max(0, Math.ceil((expiresAt - nowTick) / 1000)) : 0;
  const resendInSec = Math.max(0, Math.ceil((resendAt - nowTick) / 1000));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error("Please verify your email first. We'll send a new code.");
          await sendSignupOtp(true);
          return;
        }
        throw error;
      }
      toast.success("Welcome back");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!is18) { toast.error("You must confirm you're 18 or older."); return; }
    if (!acceptedTerms) { toast.error("Please accept the Terms and Privacy Policy."); return; }
    const rl = rateLimitCheck(email);
    if (!rl.ok) {
      toast.error(`Too many requests. Try again in ${Math.ceil((rl.retryInSec ?? 60) / 60)} min.`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: name ? { name } : undefined,
        },
      });
      if (error) throw error;
      // If the project has auto-confirm on, session will be present — skip OTP.
      if (data.session) {
        toast.success("Account created");
        void navigate({ to: "/" });
        return;
      }
      setExpiresAt(Date.now() + OTP_TTL_SECONDS * 1000);
      setResendAt(Date.now() + RESEND_COOLDOWN * 1000);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      toast.success("We sent a 6-digit code to your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create account");
    } finally {
      setLoading(false);
    }
  }

  async function sendSignupOtp(isResend = false) {
    if (!email) { toast.error("Enter your email"); return; }
    const rl = rateLimitCheck(email);
    if (!rl.ok) {
      toast.error(`Too many requests. Try again in ${Math.ceil((rl.retryInSec ?? 60) / 60)} min.`);
      return;
    }
    setLoading(true);
    try {
      // Resend signup confirmation code
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setExpiresAt(Date.now() + OTP_TTL_SECONDS * 1000);
      setResendAt(Date.now() + RESEND_COOLDOWN * 1000);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setMode("signup");
      toast.success(isResend ? "New code sent" : "We sent a 6-digit code to your email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code: string) {
    if (code.length !== 6) return;
    if (expiresInSec <= 0) { toast.error("Code expired. Please resend."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (error) throw error;
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ terms_accepted_at: new Date().toISOString(), ...(name ? { name } : {}) })
          .eq("id", data.user.id);
      }
      toast.success("Email verified — welcome to Loop Love");
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i: number, v: string) {
    const digits = v.replace(/\D/g, "");
    if (!digits) {
      const next = [...otp]; next[i] = ""; setOtp(next); return;
    }
    if (digits.length > 1) {
      const arr = digits.slice(0, 6).split("");
      const next = ["", "", "", "", "", ""];
      arr.forEach((d, idx) => { next[idx] = d; });
      setOtp(next);
      const last = Math.min(arr.length, 6) - 1;
      inputsRef.current[last]?.focus();
      if (arr.length >= 6) void verifyOtp(arr.join(""));
      return;
    }
    const next = [...otp]; next[i] = digits; setOtp(next);
    if (i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) void verifyOtp(next.join(""));
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
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

          <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 shadow-card animate-in fade-in slide-in-from-bottom-2 duration-500">
            {step === "form" ? (
              <>
                {/* Mode tabs */}
                <div className="flex p-1 mb-6 rounded-2xl bg-[oklch(0.13_0.02_320/0.6)] border border-border">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${mode === "login" ? "bg-gradient-love text-love-foreground shadow-love" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${mode === "signup" ? "bg-gradient-love text-love-foreground shadow-love" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Create account
                  </button>
                </div>

                {mode === "login" ? (
                  <>
                    <h1 className="font-display text-3xl mb-1">Welcome back</h1>
                    <p className="text-muted-foreground text-sm mb-7">Sign in with your email and password.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <Field label="Email">
                        <input
                          required
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                          placeholder="you@love.com"
                        />
                      </Field>
                      <Field label="Password">
                        <input
                          required
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input"
                          placeholder="••••••••"
                        />
                      </Field>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
                      >
                        {loading ? "Signing in…" : "Sign in"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-3xl mb-1">Create your account</h1>
                    <p className="text-muted-foreground text-sm mb-7">We'll email you a 6-digit code to verify. 18+ only.</p>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <Field label="Your name">
                        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Alex" />
                      </Field>
                      <Field label="Email">
                        <input
                          required
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                          placeholder="you@love.com"
                        />
                      </Field>
                      <Field label="Password">
                        <input
                          required
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input"
                          placeholder="At least 8 characters"
                        />
                      </Field>

                      <div className="space-y-3 pt-1">
                        <label className="flex items-start gap-3 text-sm cursor-pointer">
                          <input type="checkbox" checked={is18} onChange={(e) => setIs18(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[color:var(--color-primary)]" />
                          <span className="text-muted-foreground">I confirm I am <strong className="text-foreground">18 years of age or older</strong>.</span>
                        </label>
                        <label className="flex items-start gap-3 text-sm cursor-pointer">
                          <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[color:var(--color-primary)]" />
                          <span className="text-muted-foreground">
                            I agree to the{" "}
                            <Link to="/legal/terms" className="text-primary underline">Terms</Link>,{" "}
                            <Link to="/legal/privacy" className="text-primary underline">Privacy</Link>, and{" "}
                            <Link to="/legal/guidelines" className="text-primary underline">Guidelines</Link>.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
                      >
                        {loading ? "Creating account…" : "Create account"}
                      </button>
                    </form>
                  </>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setStep("form")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="font-display text-3xl mb-1">Verify your email</h1>
                <p className="text-muted-foreground text-sm mb-7">
                  Enter the 6-digit code we sent to <span className="text-foreground">{email}</span>
                </p>

                <div className="flex justify-between gap-2 mb-5" onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (/^\d{6}$/.test(text.trim())) {
                    e.preventDefault();
                    handleOtpChange(0, text.trim());
                  }
                }}>
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputsRef.current[i] = el; }}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      className="w-12 h-14 text-center text-2xl font-semibold rounded-2xl border border-border bg-[oklch(0.13_0.02_320/0.6)] text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-[oklch(0.7_0.22_12/0.15)] transition"
                      disabled={loading}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-5">
                  <span>
                    {expiresInSec > 0
                      ? `Expires in ${Math.floor(expiresInSec / 60)}:${String(expiresInSec % 60).padStart(2, "0")}`
                      : "Code expired"}
                  </span>
                  <button
                    type="button"
                    disabled={loading || resendInSec > 0}
                    onClick={() => void sendSignupOtp(true)}
                    className="text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
                  >
                    {resendInSec > 0 ? `Resend in ${resendInSec}s` : "Resend code"}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={loading || otp.some((d) => !d)}
                  onClick={() => void verifyOtp(otp.join(""))}
                  className="w-full h-12 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
              </>
            )}
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
