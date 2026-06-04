import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  Loader2,
  RotateCcw,
  Shield,
  Smile,
  Eye,
  ArrowLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  AlertTriangle,
  Sun,
  Users,
  UserX,
  ScanFace,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyVerification,
  resetVerification,
  submitVerification,
} from "@/lib/verification.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify your profile — Loop Love" },
      {
        name: "description",
        content: "Verify your identity with a quick live selfie to unlock matches.",
      },
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
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const refresh = useCallback(async () => {
    try {
      const d = await getFn();
      setStatus((d?.verification_status as Status) ?? "unverified");
      setRejection(d?.verification_rejection_reason ?? null);
      setSelfieUrl(d?.signedUrl ?? null);
    } catch {
      setStatus("unverified");
    }
  }, [getFn]);

  async function handleTryAgain() {
    await resetFn();
    setRejection(null);
    setStep("intro");
    setStatus("unverified");
  }

  if (status === "loading" || authLoading) return <CenterMessage>Loading…</CenterMessage>;

  if (status === "verified") {
    return (
      <Shell>
        <div className="text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-sky-500/15 mx-auto flex items-center justify-center mb-5">
            <VerifiedBadge size={48} />
          </div>
          <h1 className="font-display text-3xl mb-2">You're verified</h1>
          <p className="text-muted-foreground mb-6">
            Your profile shows a blue badge so others know it's really you.
          </p>
          <button
            onClick={() => void navigate({ to: "/" })}
            className="h-12 px-8 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love"
          >
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
            <img
              src={selfieUrl}
              alt="Your selfie"
              className="w-32 h-32 rounded-full object-cover mx-auto mb-5 border-4 border-amber-400/50"
            />
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 text-amber-500 text-xs font-medium mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pending review
          </div>
          <h1 className="font-display text-3xl mb-2">Under review</h1>
          <p className="text-muted-foreground mb-6">
            Our team usually reviews selfies within 24 hours. We'll notify you when you're
            verified.
          </p>
          <button
            onClick={() => void navigate({ to: "/settings" })}
            className="h-12 px-8 rounded-2xl bg-muted font-medium"
          >
            Back to settings
          </button>
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
          <p className="text-muted-foreground mb-1">
            {rejection ?? "Your selfie didn't pass our checks."}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Make sure your face is clearly visible, well lit, and not obscured.
          </p>
          <button
            onClick={() => void handleTryAgain()}
            className="h-12 px-8 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
        </div>
      </Shell>
    );
  }

  if (step === "intro") {
    return (
      <Shell>
        <div className="max-w-sm mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/15 mx-auto flex items-center justify-center mb-5">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl mb-2">Verify it's you</h1>
          <p className="text-muted-foreground mb-6">
            A 30-second live selfie keeps Loop Love safe and unlocks all features.
          </p>
          <ul className="text-left space-y-3 mb-8">
            <Step icon={<ScanFace className="w-5 h-5" />} title="Center your face" />
            <Step icon={<Eye className="w-5 h-5" />} title="Blink once" />
            <Step icon={<ArrowLeftCircle className="w-5 h-5" />} title="Turn head left" />
            <Step icon={<ArrowRightCircle className="w-5 h-5" />} title="Turn head right" />
            <Step icon={<Smile className="w-5 h-5" />} title="Look straight" />
          </ul>
          <button
            onClick={() => setStep("camera")}
            className="w-full h-14 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love inline-flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> Start verification
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Your selfie is private — only our review team can see it.
          </p>
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
          const { error: upErr } = await supabase.storage
            .from("verification")
            .upload(path, blob, { contentType: "image/jpeg", upsert: true });
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
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </span>
      <span className="font-medium">{title}</span>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="px-5 pt-6 flex items-center gap-3">
        <button
          onClick={() => void navigate({ to: "/settings" })}
          className="p-2 rounded-xl hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">{children}</main>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center text-muted-foreground">
      {children}
    </div>
  );
}

// ---------- Liveness capture ----------

type Challenge = "center" | "blink" | "left" | "right" | "straight";

const CHALLENGE_ORDER: Challenge[] = ["center", "blink", "left", "right", "straight"];
const TOTAL_TIMEOUT_MS = 60_000;
const PER_STEP_TIMEOUT_MS = 20_000;

type CaptureFrame = { ts: number; box: { x: number; y: number; w: number; h: number } };

function LivenessCapture({
  onComplete,
  onCancel,
}: {
  onComplete: (blob: Blob, score: number) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(Date.now());
  const stepStartTsRef = useRef<number>(Date.now());
  const stateRef = useRef({
    blinkLow: false,
    blinkSeen: false,
    framesSeen: 0,
    motionFrames: 0,
    lastBoxes: [] as CaptureFrame[],
    completedScore: 0,
    finalized: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [permState, setPermState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0..5
  const [current, setCurrent] = useState<Challenge>(CHALLENGE_ORDER[0]);
  const [doneFlash, setDoneFlash] = useState(false);
  const [hint, setHint] = useState<string>("Position your face in the circle");

  const advance = useCallback((scoreAdd: number) => {
    stateRef.current.completedScore += scoreAdd;
    setProgress((p) => {
      const next = p + 1;
      setDoneFlash(true);
      setTimeout(() => setDoneFlash(false), 500);
      if (next >= CHALLENGE_ORDER.length) {
        finalizeRef.current?.();
        return CHALLENGE_ORDER.length;
      }
      setCurrent(CHALLENGE_ORDER[next]);
      stateRef.current.blinkLow = false;
      stateRef.current.blinkSeen = false;
      stepStartTsRef.current = Date.now();
      return next;
    });
  }, []);

  const finalizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // 1) Capability check
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser doesn't support camera access. Try a modern browser.");
        return;
      }

      // 2) Lazy-load face-api ONLY when capture opens
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let faceapi: any;
      try {
        faceapi = await import("@vladmandic/face-api");
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
      } catch {
        setError("Couldn't load verification engine. Check your connection and try again.");
        return;
      }
      if (cancelled) return;

      // 3) Camera permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 640 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: false,
        });
        setPermState("granted");
      } catch (e) {
        const err = e as DOMException;
        if (
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError" ||
          err?.name === "SecurityError"
        ) {
          setPermState("denied");
          setError(
            "Camera access was blocked. Tap the lock icon in your browser's address bar and allow camera, then try again.",
          );
        } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
          setError("No front camera was found on this device.");
        } else if (err?.name === "NotReadableError") {
          setError("Your camera is already in use by another app. Close it and try again.");
        } else {
          setError(err?.message || "Couldn't access camera. Try restarting your browser.");
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      // Bind to video element
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // some browsers need user gesture; we already have one (button)
      }
      setReady(true);
      startTsRef.current = Date.now();
      stepStartTsRef.current = Date.now();
      loop(faceapi);
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
      if (!video || video.readyState < 2 || stateRef.current.finalized) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Total timeout
      if (Date.now() - startTsRef.current > TOTAL_TIMEOUT_MS) {
        setError("Verification timed out. Please try again with better lighting.");
        cleanup();
        return;
      }
      // Per-step timeout
      if (Date.now() - stepStartTsRef.current > PER_STEP_TIMEOUT_MS) {
        setHint("Taking too long — adjust lighting and position, then keep going.");
      }

      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }),
        )
        .withFaceLandmarks();

      // Multiple-faces check
      if (detections.length > 1) {
        setHint("Multiple faces detected — only you should be in frame");
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const detection = detections[0];
      if (!detection) {
        setHint("No face detected — center your face in the circle");
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;
      const box = detection.detection.box;
      const faceCx = box.x + box.width / 2;
      const faceCy = box.y + box.height / 2;
      const offX = Math.abs(faceCx - vw / 2) / vw;
      const offY = Math.abs(faceCy - vh / 2) / vh;
      const faceFrac = box.width / vw; // size relative to width

      // Lighting check via brightness sample (uses canvas snapshot, cheap throttle)
      stateRef.current.framesSeen++;
      let brightnessOk = true;
      if (stateRef.current.framesSeen % 15 === 0) {
        brightnessOk = sampleBrightness(video) > 40;
        if (!brightnessOk) {
          setHint("Too dark — find a brighter spot");
        }
      }

      // Anti-static motion tracking: collect last face boxes
      stateRef.current.lastBoxes.push({
        ts: Date.now(),
        box: { x: box.x, y: box.y, w: box.width, h: box.height },
      });
      if (stateRef.current.lastBoxes.length > 30) stateRef.current.lastBoxes.shift();
      if (stateRef.current.lastBoxes.length >= 2) {
        const a = stateRef.current.lastBoxes[stateRef.current.lastBoxes.length - 2];
        const b = stateRef.current.lastBoxes[stateRef.current.lastBoxes.length - 1];
        const dx = Math.abs(a.box.x - b.box.x) + Math.abs(a.box.y - b.box.y);
        if (dx > 0.5) stateRef.current.motionFrames++;
      }

      // Position/size guidance
      const landmarks = detection.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const ear = (eyeAspect(leftEye) + eyeAspect(rightEye)) / 2;

      const nose = landmarks.getNose();
      const jaw = landmarks.getJawOutline();
      const faceCenterX = (jaw[0].x + jaw[jaw.length - 1].x) / 2;
      const faceWidth = Math.max(1, jaw[jaw.length - 1].x - jaw[0].x);
      const yaw = (nose[3].x - faceCenterX) / faceWidth; // -0.3..0.3

      const ch = CHALLENGE_ORDER[progress];

      // Always require face well-positioned before crediting any challenge
      const centered = offX < 0.12 && offY < 0.18;
      const correctSize = faceFrac > 0.28 && faceFrac < 0.7;
      if (!centered) {
        setHint("Center your face in the circle");
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (!correctSize) {
        setHint(faceFrac <= 0.28 ? "Move a bit closer" : "Move a bit farther away");
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (!brightnessOk) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (ch === "center") {
        setHint("Hold still…");
        // require a few stable frames
        if (stateRef.current.framesSeen > 12) advance(0.2);
      } else if (ch === "blink") {
        setHint("Blink your eyes");
        if (ear < 0.2) stateRef.current.blinkLow = true;
        else if (stateRef.current.blinkLow && ear > 0.28) {
          stateRef.current.blinkLow = false;
          advance(0.2);
        }
      } else if (ch === "left") {
        setHint("Turn your head to the LEFT");
        // mirrored video: user's left = positive yaw on mirrored display, but raw yaw negative when face turns to their left.
        if (yaw < -0.12) advance(0.2);
      } else if (ch === "right") {
        setHint("Turn your head to the RIGHT");
        if (yaw > 0.12) advance(0.2);
      } else if (ch === "straight") {
        setHint("Look straight at the camera");
        if (Math.abs(yaw) < 0.06) advance(0.2);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  const finalize = useCallback(() => {
    if (stateRef.current.finalized) return;
    stateRef.current.finalized = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      cleanup();
      return;
    }
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
        const motionOk = stateRef.current.motionFrames >= 8;
        const finalScore = Math.min(
          1,
          stateRef.current.completedScore * (motionOk ? 1 : 0.55),
        );
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onComplete(blob, Number(finalScore.toFixed(2)));
      },
      "image/jpeg",
      0.88,
    );
  }, [onComplete]);

  finalizeRef.current = finalize;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="px-5 pt-5 flex items-center justify-between text-white">
        <button
          onClick={() => {
            cleanup();
            onCancel();
          }}
          className="p-2 rounded-xl bg-white/10"
          aria-label="Cancel"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-1.5">
          {CHALLENGE_ORDER.map((_, i) => (
            <span
              key={i}
              className={`w-6 h-1.5 rounded-full transition-colors ${
                i < progress ? "bg-sky-400" : "bg-white/30"
              }`}
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
          autoPlay
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[78vw] h-[78vw] max-w-[420px] max-h-[420px] rounded-full ring-4 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
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

      <div className="px-6 pb-8 pt-4 text-white text-center min-h-[140px]">
        {error ? (
          <div className="space-y-3">
            <p className="inline-flex items-center justify-center gap-2 text-destructive font-medium">
              {permState === "denied" ? (
                <UserX className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {error}
            </p>
            <button
              onClick={() => {
                cleanup();
                onCancel();
              }}
              className="h-11 px-5 rounded-xl bg-white text-black font-medium"
            >
              Go back
            </button>
          </div>
        ) : !ready ? (
          <p className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing camera…
          </p>
        ) : (
          <motion.div key={current} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">
              Step {Math.min(progress + 1, CHALLENGE_ORDER.length)} of {CHALLENGE_ORDER.length}
            </p>
            <p className="font-display text-2xl mb-1">
              {current === "center" && "Position your face"}
              {current === "blink" && "Blink your eyes"}
              {current === "left" && "Turn head LEFT"}
              {current === "right" && "Turn head RIGHT"}
              {current === "straight" && "Look straight"}
            </p>
            <p className="text-sm text-white/70 inline-flex items-center gap-1.5 justify-center">
              {hint.includes("dark") && <Sun className="w-3.5 h-3.5" />}
              {hint.includes("Multiple") && <Users className="w-3.5 h-3.5" />}
              {hint}
            </p>
          </motion.div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function eyeAspect(pts: { x: number; y: number }[]) {
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const v = d(pts[1], pts[5]) + d(pts[2], pts[4]);
  const h = 2 * d(pts[0], pts[3]);
  return h === 0 ? 0 : v / h;
}

// Throttled brightness sampler — downsamples video to 32x32 and averages luma.
let brightCanvas: HTMLCanvasElement | null = null;
function sampleBrightness(video: HTMLVideoElement): number {
  try {
    if (!brightCanvas) brightCanvas = document.createElement("canvas");
    brightCanvas.width = 32;
    brightCanvas.height = 32;
    const ctx = brightCanvas.getContext("2d");
    if (!ctx) return 255;
    ctx.drawImage(video, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sum / (data.length / 4);
  } catch {
    return 255;
  }
}
