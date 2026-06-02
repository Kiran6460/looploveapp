import { useEffect, useRef, useState } from "react";
import { Heart, X, MapPin, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ReportBlockMenu } from "@/components/ReportBlockMenu";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type Card = {
  id: string;
  name: string;
  age: number;
  bio: string;
  photo_url: string;
  city: string;
  interests: string[];
  verification_status?: string | null;
};

export function SwipeDeck() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    setLoading(true);
    if (!user) return;
    const t0 = performance.now();
    // Fetch swipes + blocks + candidate profiles in parallel. Cap each query.
    const [{ data: swiped }, { data: blocked }, { data: demo }, { data: real }] = await Promise.all([
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id).limit(500),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).limit(500),
      supabase.from("demo_profiles").select("id,name,age,bio,photo_url,city,interests").limit(20),
      supabase
        .from("profiles")
        .select("id,name,age,bio,photo_url,city,interests,verification_status")
        .neq("id", user.id)
        .eq("suspended", false)
        .eq("verification_status", "verified")
        .limit(50),
    ]);
    const swipedIds = new Set((swiped ?? []).map((s) => s.swiped_id));
    const blockedIds = new Set((blocked ?? []).map((b) => b.blocked_id));
    const all: Card[] = [...(real ?? []), ...(demo ?? [])]
      .filter((p) => !swipedIds.has(p.id) && !blockedIds.has(p.id) && p.photo_url)
      .sort(() => Math.random() - 0.5)
      .slice(0, 30);
    setCards(all);
    setLoading(false);
    if (typeof console !== "undefined") console.debug(`[swipe-deck] loaded ${all.length} cards in ${Math.round(performance.now() - t0)}ms`);
  }

  function removeTop() {
    setCards((c) => c.slice(1));
  }

  async function insertSwipeWithRetry(swiperId: string, swipedId: string, liked: boolean) {
    let lastErr: { message?: string; code?: string; details?: string } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase.from("swipes").insert({ swiper_id: swiperId, swiped_id: swipedId, liked });
      if (!error) return { ok: true as const };
      lastErr = error;
      console.error(`[swipe] attempt ${attempt} failed`, { code: error.code, message: error.message, details: error.details, hint: (error as { hint?: string }).hint });
      // Don't retry on permission / policy errors — they will never succeed.
      if (error.code === "42501" || /row-level security|policy|permission/i.test(error.message)) break;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
    return { ok: false as const, error: lastErr };
  }

  async function swipe(liked: boolean) {
    const top = cards[0];
    if (!top || !user) return;
    setCards((c) => c.slice(1));
    const res = await insertSwipeWithRetry(user.id, top.id, liked);
    if (!res.ok) {
      const msg = res.error?.message ?? "Unknown error";
      if (/row-level security|policy|permission/i.test(msg) || res.error?.code === "42501") {
        toast.error("Your profile needs verification before you can swipe.", {
          action: { label: "Verify", onClick: () => { window.location.href = "/verify"; } },
        });
      } else {
        toast.error(`Couldn't save swipe: ${msg}`);
      }
      // Put the card back so the user can retry.
      setCards((c) => [top, ...c]);
      return;
    }
    if (liked) {
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user_a.eq.${user.id},user_b.eq.${top.id}),and(user_a.eq.${top.id},user_b.eq.${user.id})`)
        .maybeSingle();
      if (match) {
        toast.success(`It's a match with ${top.name}! 💕`, { duration: 4000 });
      }
    }
  }

  function flyAndSwipe(liked: boolean) {
    if (!cards[0]) return;
    const dir = liked ? 1 : -1;
    setDrag({ x: 600 * dir, y: -40, active: false });
    setTimeout(() => { void swipe(liked); setDrag({ x: 0, y: 0, active: false }); }, 220);
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.active) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  }
  function onUp() {
    if (!drag.active) return;
    const threshold = 110;
    if (drag.x > threshold) flyAndSwipe(true);
    else if (drag.x < -threshold) flyAndSwipe(false);
    else setDrag({ x: 0, y: 0, active: false });
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 rounded-3xl bg-card/50 animate-pulse" />
        <ActionBar disabled />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 rounded-3xl border border-border/60 bg-card/40 flex flex-col items-center justify-center text-center p-8">
          <Sparkles className="w-12 h-12 text-primary mb-4" />
          <h3 className="font-display text-2xl mb-2">You're all caught up</h3>
          <p className="text-muted-foreground max-w-xs">New people show up here every day. Check back soon — or invite a friend.</p>
        </div>
        <ActionBar disabled />
      </div>
    );
  }

  const rot = drag.x / 18;

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-0">
        {cards.slice(0, 3).reverse().map((card, idxFromBack) => {
          const indexFromFront = Math.min(2, cards.length - 1) - idxFromBack;
          const isTop = indexFromFront === 0;
          const scale = 1 - indexFromFront * 0.04;
          const ty = indexFromFront * 12;
          return (
            <article
              key={card.id}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-card border border-border/40 bg-card touch-none select-none"
              style={{
                transform: isTop
                  ? `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rot}deg)`
                  : `translateY(${ty}px) scale(${scale})`,
                transition: isTop && drag.active ? "none" : "transform 280ms cubic-bezier(.2,.9,.3,1.2)",
                zIndex: 10 - indexFromFront,
                cursor: isTop ? "grab" : "default",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            >
              <img src={card.photo_url} alt={card.name} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              {isTop && (
                <div className="absolute top-3 right-3 z-20" onPointerDown={(e) => e.stopPropagation()}>
                  <ReportBlockMenu targetId={card.id} targetName={card.name} onBlocked={removeTop} />
                </div>
              )}
              {isTop && drag.x > 40 && (
                <div className="absolute top-8 left-6 rotate-[-12deg] border-4 border-love text-love px-4 py-1 rounded-xl text-2xl font-display font-bold tracking-wider pointer-events-none">LIKE</div>
              )}
              {isTop && drag.x < -40 && (
                <div className="absolute top-8 right-6 rotate-[12deg] border-4 border-muted-foreground text-muted-foreground px-4 py-1 rounded-xl text-2xl font-display font-bold tracking-wider pointer-events-none">NOPE</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none">
                <div className="flex items-end gap-2">
                  <h3 className="font-display text-3xl sm:text-4xl font-semibold leading-none">{card.name}</h3>
                  <span className="text-xl sm:text-2xl font-light">{card.age}</span>
                  {card.verification_status === "verified" && <VerifiedBadge size={22} className="mb-0.5" />}
                </div>
                {card.city && (
                  <div className="flex items-center gap-1 text-sm text-white/80 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {card.city}
                  </div>
                )}
                {card.bio && <p className="mt-2 text-sm text-white/90 line-clamp-2">{card.bio}</p>}
                {card.interests?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {card.interests.slice(0, 3).map((i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20">{i}</span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <ActionBar onPass={() => flyAndSwipe(false)} onLike={() => flyAndSwipe(true)} onSuper={() => { toast("Super Like is a Premium feature ✨"); }} />
    </div>
  );
}

function ActionBar({ onPass, onLike, onSuper, disabled }: { onPass?: () => void; onLike?: () => void; onSuper?: () => void; disabled?: boolean }) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-5 pt-5 pb-1">
      <button
        onClick={onPass}
        disabled={disabled}
        className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-card disabled:opacity-40"
        aria-label="Pass"
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </button>
      <button
        onClick={onSuper}
        disabled={disabled}
        className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-card disabled:opacity-40"
        aria-label="Super Like"
      >
        <Star className="w-5 h-5 text-primary" fill="currentColor" />
      </button>
      <button
        onClick={onLike}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-gradient-love flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-love disabled:opacity-40"
        aria-label="Like"
      >
        <Heart className="w-7 h-7 text-love-foreground" fill="currentColor" />
      </button>
    </div>
  );
}
