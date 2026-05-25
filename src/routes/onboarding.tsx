import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Heart, Loader2, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — Loop Love" },
      { name: "description", content: "Tell us about yourself before you start swiping." },
    ],
  }),
  component: OnboardingPage,
});

const SUGGESTED = ["Coffee","Music","Travel","Hiking","Photography","Art","Books","Films","Cooking","Yoga","Climbing","Dogs","Cats","Wine","Design","Tech","Dance","Beach","Plants","Gaming"];

const schema = z.object({
  name: z.string().trim().min(1, "Add your name").max(40, "Keep it under 40 characters"),
  age: z.number().int().min(18, "Must be 18+").max(100, "Age looks off"),
  city: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280, "280 characters max"),
  interests: z.array(z.string()).max(8, "Pick up to 8"),
  photo_url: z.string().url("Add a profile photo"),
});

const ACCEPTED_IMAGE_EXTS = new Set([
  "jpg","jpeg","png","gif","webp","heic","heif","bmp","tiff","tif","raw","cr2","nef","arw","dng","orf","rw2","pef","sr2","svg","avif","jxl"
]);

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ACCEPTED_IMAGE_EXTS.has(ext)) return true;
  return false;
}

function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(25);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setName(data.name && data.name !== "New User" ? data.name : "");
        setAge(data.age || 25);
        setCity(data.city || "");
        setBio(data.bio || "");
        setInterests(data.interests || []);
        setPhotoUrl(data.photo_url || "");
        if (data.onboarded) void navigate({ to: "/" });
      }
      setLoading(false);
    })();
  }, [user?.id, navigate]);

  async function uploadPhoto(file: File) {
    if (!user) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File must be under 25MB"); return; }
    if (!isImageFile(file)) { toast.error("Please pick a photo file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  function toggleInterest(tag: string) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 8 ? prev : [...prev, tag]
    );
  }

  async function save() {
    if (!user) return;
    const parsed = schema.safeParse({ name, age, city: city || undefined, bio, interests, photo_url: photoUrl });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: parsed.data.name,
        age: parsed.data.age,
        city: parsed.data.city ?? "",
        bio: parsed.data.bio,
        interests: parsed.data.interests,
        photo_url: parsed.data.photo_url,
        onboarded: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile ready ✨");
    void navigate({ to: "/" });
  }

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-love flex items-center justify-center shadow-love">
          <Heart className="w-5 h-5 text-love-foreground" fill="currentColor" />
        </div>
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Step 1 of 1</p>
          <h1 className="font-display text-2xl">Set up your profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 space-y-6">
        {/* Photo */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-card">
          <h2 className="font-display text-lg mb-1">Your photo</h2>
          <p className="text-sm text-muted-foreground mb-4">A clear face photo gets 3× more matches.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-dashed border-border bg-muted/40 flex items-center justify-center group"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="You" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <Camera className="w-7 h-7 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </button>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-secondary text-sm font-medium transition"
                disabled={uploading}
              >
                {photoUrl ? "Change photo" : "Upload photo"}
              </button>
              <p className="text-xs text-muted-foreground mt-2">Any image format · low or high quality · up to 25MB.</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif,.raw,.cr2,.nef,.arw,.dng,.orf,.rw2,.pef,.sr2,.jxl,.avif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }}
          />
        </section>

        {/* Basics */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-card space-y-4">
          <h2 className="font-display text-lg">The basics</h2>
          <Field label="Name">
            <input className="ob-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input
                type="number" min={18} max={100} className="ob-input"
                value={age} onChange={(e) => setAge(parseInt(e.target.value || "0"))}
              />
            </Field>
            <Field label="City">
              <input className="ob-input" value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} placeholder="Lisbon" />
            </Field>
          </div>
          <Field label={`Bio (${bio.length}/280)`}>
            <textarea
              className="ob-input min-h-[110px] py-3 resize-none"
              value={bio} maxLength={280}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you. What's a perfect Sunday?"
            />
          </Field>
        </section>

        {/* Interests */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-card">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-lg">Interests</h2>
            <span className="text-xs text-muted-foreground">{interests.length}/8</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((tag) => {
              const active = interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={`px-3.5 py-2 rounded-full text-sm border transition ${
                    active
                      ? "bg-gradient-love text-love-foreground border-transparent shadow-love"
                      : "bg-muted/40 border-border hover:border-primary/50"
                  }`}
                >
                  {active && <X className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 backdrop-blur-xl bg-background/80 border-t border-border/40">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="w-full h-13 py-3.5 rounded-2xl bg-gradient-love text-love-foreground font-medium shadow-love disabled:opacity-50 active:scale-[0.99] transition"
          >
            {saving ? "Saving…" : "Start swiping"}
          </button>
        </div>
      </div>

      <style>{`
        .ob-input { width: 100%; height: 48px; padding: 0 16px; border-radius: 14px; background: oklch(0.13 0.02 320 / 0.6); border: 1px solid var(--color-border); color: var(--color-foreground); font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .ob-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 4px oklch(0.7 0.22 12 / 0.15); }
      `}</style>
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
