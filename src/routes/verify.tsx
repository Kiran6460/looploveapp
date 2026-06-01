import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, Loader2, RotateCcw, Shield, Smile, Eye, Move3d, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getMyVerification, resetVerification, submitVerification } from "@/lib/verification.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify your profile — Loop Love" },
      { name: "description", content: "Verify your identity with a quick selfie to unlock matches." },
    ],
  }),
  component: VerifyPage,
});

type Status = "unverified" | "pending" | "verified" | "rejected" | "loading";

function VerifyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const submitFn = useServerFn(submitVerification);
  const getFn = useServerFn(getMyVerification);
  const resetFn = useServerFn(resetVerification);

  const [status, setStatus] = useState<Status>("loading");
  const [rejection, setRejection] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"intro" | "camera" | "submitting">("intro");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { void navigate({ to: "/login" }); return; }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function refresh() {
    try {
      const d = await getFn();
      setStatus((d?.verification_status as Status) ?? "unverified");
      setRejection(d?.verification_rejection_reason ?? null);
      setSelfieUrl(d?.signedUrl ?? null);
    } catch {
      setStatus("unverified");
    }
  }

  async function handleTryAgain() {
    await resetFn();
    setRejection(null);
    setStep("intro");
    setStatus("unverified");
  }

  if (status === "loading" || authLoading) {
    return <CenterMessage>Loading…</CenterMessage>;
  }

  if (status === "verified") {
    return (
      <Shell>
        <div className="text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-sky-500/15 mx-auto flex items-center justify-center mb-5">
            <VerifiedBadge size={48} />
          </div>
          <h1 className="font-display text-3xl mb-2">You're verified</h1>
          <p className="text-muted-foreground mb-6">Your profile shows a blue badge so others know it's really you.</p>
          <button onClick={() => void navigate({ to: "/" })} className="h-12 px-8 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love">
            Start swiping
          </button>
        </div>
      </Shell>
    );
  }

  if (status === "pending") {
    return (
      <Shell>
        <div className="text-center max-w-sm mx-auto">
          {selfieUrl && (
            <img src={selfieUrl} alt="Your selfie" className="w-32 h-32 rounded-full object-cover mx-auto mb-5 border-4 border-amber-400/50" />
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 text-amber-500 text-xs font-medium mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pending review
          </div>
          <h1 className="font-display text-3xl mb-2">Under review</h1>
          <p className="text-muted-foreground mb-6">Our team usually reviews selfies within 24 hours. We'll notify you when you're verified.</p>
          <button onClick={() => void navigate({ to: "/settings" })} className="h-12 px-8 rounded-2xl bg-muted font-medium">Back to settings</button>
        </div>
      </Shell>
    );
  }

  if (status === "rejected") {
    return (
      <Shell>
        <div className="text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-destructive/15 mx-auto flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-3xl mb-2">Verification failed</h1>
          <p className="text-muted-foreground mb-1">{rejection ?? "Your selfie didn't pass our checks."}</p>
          <p className="text-xs text-muted-foreground mb-6">Make sure your face is clearly visible, well lit, and not obscured.</p>
          <button onClick={() => void handleTryAgain()} className="h-12 px-8 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love inline-flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      </Shell>
    );
  }

  // unverified
  if (step === "intro") {
    return (
      <Shell>
        <div className="max-w-sm mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/15 mx-auto flex items-center justify-center mb-5">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl mb-2">Verify it's you</h1>
          <p className="text-muted-foreground mb-6">A 20-second live selfie keeps Loop Love safe and unlocks all features.</p>
          <ul className="text-left space-y-3 mb-8">
            <Step icon={<Eye className="w-5 h-5" />} title="Blink your eyes" />
            <Step icon={<Move3d className="w-5 h-5" />} title="Turn your head slightly" />
            <Step icon={<Smile className="w-5 h-5" />} title="Smile" />
          </ul>
          <button onClick={() => setStep("camera")} className="w-full h-14 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love inline-flex items-center justify-center gap-2">
            <Camera className="w-5 h-5" /> Start verification
          </button>
          <p className="text-xs text-muted-foreground mt-4">Your selfie is private — only our review team can see it.</p>
        </div>
      </Shell>
    );
  }

  return (
    <LivenessCapture
      onCancel={() => setStep("intro")}
      onComplete={async (blob, score) => {
        if (!user) return;
        setStep("submitting");
        try {
          const path = `${user.id}/${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("verification").upload(path, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
          if (upErr) throw upErr;
          await submitFn({ data: { photoPath: path, livenessScore: score } });
          toast.success("Selfie submitted! We'll review it shortly.");
          await refresh();
          setStep("intro");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Couldn't submit selfie");
          setStep("intro");
        }
      }}
    />
  );
}

function Step({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
      <span className="font-medium">{title}</span>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="px-5 pt-6 flex items-center gap-3">
        <button onClick={() => void navigate({ to: "/settings" })} className="p-2 rounded-xl hover:bg-muted" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">{children}</main>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">{children}</div>;
}

// ---------- Liveness capture ----------

type Challenge = "blink" | "turn" | "smile";

function LivenessCapture({ onComplete, onCancel }: { onComplete: (blob: Blob, score: number) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const challengesRef = useRef<Challenge[]>(shuffle(["blink", "turn", "smile"]));
  const stateRef = useRef({
    blinkLow: false,
    yawBaseline: null as number | null,
    motionFrames: 0,
    completedScore: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0..3
  const [current, setCurrent] = useState<Challenge>(challengesRef.current[0]);
  const [doneFlash, setDoneFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        loop(faceapi);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't access camera");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loop(faceapi: any) {
    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detection) {
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const ear = (eyeAspect(leftEye) + eyeAspect(rightEye)) / 2;

        // yaw approx: compare horizontal offset of nose vs face center
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();
        const faceCenterX = (jaw[0].x + jaw[jaw.length - 1].x) / 2;
        const faceWidth = Math.max(1, jaw[jaw.length - 1].x - jaw[0].x);
        const yaw = (nose[3].x - faceCenterX) / faceWidth; // -0.3..0.3

        const expressions = detection.expressions;
        const happy = expressions?.happy ?? 0;

        // micro-motion baseline
        if (stateRef.current.yawBaseline === null) stateRef.current.yawBaseline = yaw;
        if (Math.abs(yaw - stateRef.current.yawBaseline) > 0.01) stateRef.current.motionFrames++;

        const ch = challengesRef.current[progress];
        if (ch === "blink") {
          if (ear < 0.2) stateRef.current.blinkLow = true;
          else if (stateRef.current.blinkLow && ear > 0.28) {
            stateRef.current.blinkLow = false;
            advance(0.34);
          }
        } else if (ch === "turn") {
          const baseline = stateRef.current.yawBaseline ?? 0;
          if (Math.abs(yaw - baseline) > 0.12) advance(0.33);
        } else if (ch === "smile") {
          if (happy > 0.7) advance(0.33);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function advance(scoreAdd: number) {
    stateRef.current.completedScore += scoreAdd;
    setProgress((p) => {
      const next = p + 1;
      setDoneFlash(true);
      setTimeout(() => setDoneFlash(false), 600);
      if (next >= 3) {
        finalize();
        return 3;
      }
      setCurrent(challengesRef.current[next]);
      // reset per-challenge state
      stateRef.current.blinkLow = false;
      stateRef.current.yawBaseline = null;
      return next;
    });
  }

  function finalize() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = 480;
    const aspect = (video.videoHeight || 1) / (video.videoWidth || 1);
    canvas.width = w;
    canvas.height = Math.round(w * aspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Couldn't capture selfie");
          return;
        }
        // Anti-static heuristic: require detected motion across frames.
        const motionOk = stateRef.current.motionFrames >= 5;
        const finalScore = Math.min(1, stateRef.current.completedScore * (motionOk ? 1 : 0.6));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onComplete(blob, Number(finalScore.toFixed(2)));
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="px-5 pt-5 flex items-center justify-between text-white">
        <button onClick={onCancel} className="p-2 rounded-xl bg-white/10" aria-label="Cancel">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-8 h-1.5 rounded-full ${i < progress ? "bg-sky-400" : "bg-white/30"}`}
            />
          ))}
        </div>
        <div className="w-9" />
      </header>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
        {/* Oval mask overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[78vw] h-[78vw] max-w-[420px] max-h-[420px] rounded-full ring-4 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>

        <AnimatePresence>
          {doneFlash && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="absolute z-10 w-24 h-24 rounded-full bg-sky-500 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-4 text-white text-center">
        {error ? (
          <p className="text-destructive font-medium">{error}</p>
        ) : !ready ? (
          <p className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparing camera…</p>
        ) : (
          <motion.div key={current} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Step {progress + 1} of 3</p>
            <p className="font-display text-2xl">
              {current === "blink" && "Blink your eyes"}
              {current === "turn" && "Turn your head slowly"}
              {current === "smile" && "Now smile!"}
            </p>
          </motion.div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function eyeAspect(pts: { x: number; y: number }[]) {
  // EAR formula on 6 landmark points
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const v = d(pts[1], pts[5]) + d(pts[2], pts[4]);
  const h = 2 * d(pts[0], pts[3]);
  return h === 0 ? 0 : v / h;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
